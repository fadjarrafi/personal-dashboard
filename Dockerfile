# syntax=docker/dockerfile:1
# Image produksi seringan mungkin: build di stage terpisah, runtime hanya
# node:22-alpine + output adapter-node + node_modules produksi (tanpa devDeps).
# Dependency yang cuma dipakai di client (React, Excalidraw, highlight.js, ...)
# sengaja ada di devDependencies supaya di-bundle Vite dan tidak ikut ke sini.

ARG NODE_VERSION=22
ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION}-alpine AS bun

# Node tetap dibutuhkan saat install: better-sqlite3 meng-compile/unduh binary
# native untuk ABI Node runtime (bukan Bun).
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libstdc++ libgcc python3 make g++
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

FROM base AS build
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile
COPY . .
RUN bun run build \
	&& bun build \
		scripts/send-bill-reminders.ts \
		scripts/backup.ts \
		scripts/vault-tasks-resync.ts \
		src/lib/server/db/migrate.ts \
		--target=node --packages=external --root=. --outdir=dist-scripts \
	&& mv dist-scripts/src/lib/server/db/migrate.js dist-scripts/scripts/migrate.js \
	&& cp -r src/lib/server/db/migrations dist-scripts/scripts/migrations

FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile --production

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=5173 \
	DATABASE_URL=/app/data/app.db \
	RECEIPT_DIR=/app/data/receipts \
	BOARD_DIR=/app/data/boards
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/dist-scripts/scripts ./scripts
COPY --chown=node:node package.json ./
RUN mkdir -p data && chown node:node /app /app/data
USER node
VOLUME /app/data
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -q --spider http://127.0.0.1:${PORT}/login || exit 1
CMD ["sh", "-c", "node scripts/migrate.js && exec node build"]
