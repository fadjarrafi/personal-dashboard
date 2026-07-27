# Personal Dashboard

Aplikasi personal untuk *capture cepat* bookmark, fleeting note, dan cheat code/snippet.
Lihat [docs/PRD.md](./docs/PRD.md) untuk detail keputusan produk & arsitektur.

## Tech stack

- **SvelteKit** (SSR, `adapter-node`) + **TypeScript**
- **SQLite** via **better-sqlite3** (WAL mode) + **Drizzle ORM**
- **FTS5** untuk pencarian full-text (SQL mentah)
- **Session cookie** auth (argon2 via `@node-rs/argon2`)
- **Tailwind CSS**
- **PWA** via `@vite-pwa/sveltekit`

## Struktur direktori

```
src/
├─ app.html · app.css · app.d.ts
├─ hooks.server.ts              # auth gate global
├─ lib/
│  ├─ components/               # ItemCard, CaptureForm
│  └─ server/
│     ├─ auth.ts                # session cookie + argon2
│     ├─ items.ts               # repository items (list/create/update/…)
│     └─ db/
│        ├─ index.ts            # koneksi better-sqlite3 + drizzle
│        ├─ schema.ts           # drizzle schema
│        ├─ migrate.ts          # runner migrasi SQL
│        └─ migrations/         # *.sql (termasuk FTS5 + triggers)
└─ routes/
   ├─ +layout.{svelte,server.ts}
   ├─ +page.{svelte,server.ts}  # list + capture + search
   ├─ login/                    # form action login
   ├─ logout/                   # POST → hapus sesi
   ├─ items/[id]/               # edit / hapus item
   ├─ export/                   # dump JSON (backup manual)
   └─ api/
      ├─ bookmarks/fetch-title/ # best-effort auto-title
      └─ tags/                  # autocomplete tag
scripts/seed.ts                 # buat user pertama
static/                         # manifest.webmanifest, icons/
```

## Setup lokal

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed -- you@mail.com yourStrongPassword
npm run dev
```

Buka http://localhost:5173 dan login.

## Backup

Sesuai PRD §5 — jangan andalkan scheduler dalam-app. Gunakan cron OS:

```bash
0 3 * * * cp -a /path/data/app.db* /path/backup/$(date +\%F)/
```

Atau unduh dump JSON dari `/export`.

## Icon PWA

Sebelum deploy, taruh di `static/`:

- `favicon.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-512-maskable.png`

## Deploy

Wajib `adapter-node` di VPS (Nginx reverse proxy → `node build`).
**Jangan** pakai adapter serverless — SQLite butuh disk persisten & proses hidup terus (PRD §2.1).
