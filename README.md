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

Sesuai PRD §5 — scheduler bukan bawaan SvelteKit, jadi jadwalkan lewat cron OS.

### Skrip backup (aman untuk WAL)

```bash
npm run db:backup
```

Skrip ini pakai `sqlite3_backup` (via `better-sqlite3`) sehingga aman meski
proses aplikasi sedang menulis. Hasil di `data/backups/app-YYYY-MM-DDTHH-MM-SS.db`,
dan otomatis merotasi — mempertahankan 14 file terbaru.

Ubah lewat env: `BACKUP_DIR=/mnt/backups BACKUP_KEEP=30 npm run db:backup`.

> ⚠️ **Jangan** pakai `cp app.db*` untuk backup — WAL bisa membuat salinannya
> inkonsisten. Selalu lewat skrip di atas atau `sqlite3 .backup`.

### Cron VPS (Ubuntu)

```cron
0 3 * * * cd /srv/personal-dashboard && /usr/bin/npm run db:backup >> /var/log/dashboard-backup.log 2>&1
```

### Export manual dari UI

Buka `/export` — mengunduh dump JSON semua item + tag milik user yang login.
Berguna untuk migrasi data atau audit, tidak menggantikan backup file `.db`.

## Icon PWA

Sudah ter-include sebagai SVG `sizes: "any"` di `static/icons/` (`icon.svg` +
`maskable.svg`) — Chrome modern & Android mendukung ini tanpa perlu PNG
terpisah. Kalau perlu dukung browser yang menolak SVG, tambahkan raster
`icons/icon-192.png` & `icons/icon-512.png` dan daftarkan di
`static/manifest.webmanifest` + `vite.config.ts`.

## Deploy

Wajib `adapter-node` di VPS (Nginx reverse proxy → `node build`).
**Jangan** pakai adapter serverless — SQLite butuh disk persisten & proses hidup terus (PRD §2.1).

Dua panduan tersedia:

- [docs/DEPLOY.md](./docs/DEPLOY.md) — Ubuntu VPS publik dengan Nginx + certbot.
- [docs/DEPLOY-cloudflare-tunnel.md](./docs/DEPLOY-cloudflare-tunnel.md) —
  VPS lokal (mis. di Proxmox) di belakang Cloudflare Tunnel; tanpa Nginx,
  tanpa certbot, Cloudflare edge yang meng-terminate TLS.

Template systemd + Nginx config siap-copy di [deploy/](./deploy).
