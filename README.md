# Personal Dashboard

Aplikasi personal untuk *capture cepat* bookmark, fleeting note, dan cheat code/snippet.
Lihat [docs/PRD.md](./docs/PRD.md) untuk detail keputusan produk & arsitektur.

## Tech stack

- **SvelteKit** (SSR, `adapter-node`) + **TypeScript**
- **SQLite** via **better-sqlite3** (WAL mode) + **Drizzle ORM**
- **FTS5** untuk pencarian full-text (SQL mentah)
- **Session cookie** auth (argon2 via `@node-rs/argon2`)
- **Tailwind CSS** + **daisyUI** (tema `dashboard` gelap)
- **PWA** via `@vite-pwa/sveltekit`
- **Mobile-first & aksesibel** — hamburger drawer, view kartu di layar sempit, skip link, fokus-visible, target sentuh ≥44px

## Struktur direktori

```
src/
├─ app.html · app.css · app.d.ts
├─ hooks.server.ts              # auth gate global + CSRF manual per-path
├─ lib/
│  ├─ format.ts                 # helper client-safe (formatRupiah, parseRupiah)
│  ├─ components/               # CaptureForm, ItemTable, ItemCard,
│  │                            #   ItemDetailModal, CodeBlock, Toast, Shortcuts,
│  │                            #   SpendChart
│  └─ server/
│     ├─ auth.ts                # session cookie + argon2
│     ├─ items.ts               # repository items (list/create/update/…)
│     ├─ spends.ts              # repository pengeluaran + summary + daily totals
│     ├─ receipts.ts            # simpan gambar receipt + baca ulang
│     ├─ receiptExtract.ts      # Tesseract.js OCR + parser regex
│     └─ db/
│        ├─ index.ts            # koneksi better-sqlite3 + drizzle
│        ├─ schema.ts           # drizzle schema (items, spends, receipts, …)
│        ├─ migrate.ts          # runner migrasi SQL
│        └─ migrations/         # 0000_init.sql, 0001_spends.sql, …
└─ routes/
   ├─ +layout.{svelte,server.ts}
   ├─ +page.{svelte,server.ts}  # list + capture + search
   ├─ login/                    # form action login
   ├─ logout/                   # POST → hapus sesi
   ├─ items/[id]/               # edit / hapus item
   ├─ archive/                  # daftar arsip + hard delete
   ├─ export/                   # dump JSON (backup manual)
   ├─ spends/                   # list + summary + grafik
   │  ├─ [id]/                  # edit / hapus pengeluaran
   │  └─ share/                 # PWA share_target → OCR → preview form
   │     └─ [id]/               # preview + konfirmasi simpan
   ├─ receipts/[id]/            # serve gambar receipt (auth-gated)
   └─ api/
      ├─ bookmarks/fetch-title/ # best-effort auto-title
      └─ tags/                  # autocomplete tag
scripts/
├─ seed.ts                      # buat user pertama
├─ backup.ts                    # backup DB aman untuk WAL
├─ test-extract-text.ts         # uji regex parser (transkripsi manual)
├─ test-extract-image.ts        # uji end-to-end OCR + parser
└─ fixtures/receipts.ts         # data uji: 4 receipt (gopay/blu/jago/livin)
static/                         # manifest.webmanifest (dengan share_target), icons/
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

## UI: responsif & aksesibel

Semua layar dirancang mobile-first dan sudah dikonfirmasi lewat `svelte-check`:

- **Layout** — di `<lg` navbar berubah jadi tombol hamburger yang membuka **drawer geser dari kiri** (overlay klik-untuk-tutup, `Esc` untuk tutup, auto-close saat pindah route). Berisi bagian Katalog (Semua/Bookmark/Note/Snippet) · Keuangan (Pengeluaran) · Lainnya (Arsip, Export JSON) + Keluar di footer. Di `≥lg` nav inline lengkap dengan separator.
- **Dashboard** — di mobile, daftar item tampil lebih dulu; form *Tambah baru* pindah ke bawah (masih bisa dijangkau via FAB `+`). Search bar tidak lagi memakai `join` yang overflow.
- **ItemTable & Arsip** — tabel disembunyikan di `<md` dan diganti list kartu yang tap-friendly (keyboard: Enter/Space untuk buka detail).
- **ItemDetailModal** — jadi *bottom sheet* di HP (`modal-bottom sm:modal-middle`), `max-h: 92vh`, tombol aksi stacking, padding bawah tetap ada + safe-area untuk device dengan home indicator.
- **Form login & edit** — tombol full-width dan stacking di mobile; margin atas login dikurangi.

**Aksesibilitas** yang dijamin global lewat [`src/app.css`](./src/app.css):

- Input, `<select>`, `<textarea>` dipaksa ≥16px di `<640px` (cegah zoom otomatis iOS Safari).
- `:focus-visible` konsisten (outline primary 2px, offset 2px) untuk semua elemen interaktif.
- Hormati `prefers-reduced-motion` — animasi & transisi dinonaktifkan.
- Utility `.tap-target` = 44×44 (WCAG 2.5.5), `.safe-top`/`.safe-bottom` untuk area aman iOS.
- **Skip link** "Lompat ke konten" di setiap halaman menuju `<main id="main">`.
- Semua tombol ikon punya `aria-label`; nav aktif ditandai `aria-current="page"`; drawer punya `role="dialog"` + `aria-modal`.

## Spend tracker (v0.2)

Rute `/spends` — ringkasan bulan berjalan (total, tren vs bulan lalu, breakdown
per kategori), **grafik batang harian** (SVG inline, tanpa dependency), quick-add,
dan list transaksi. Rute `/spends/[id]` untuk edit/hapus. Amount disimpan
**integer rupiah bulat** (kunci PRD §11.2 — hindari float). Navigasi bulan
lewat tombol ← → memperbarui semua panel sekaligus.

Grafik ([`SpendChart.svelte`](./src/lib/components/SpendChart.svelte)) meng-render
1 bar per hari, tinggi proporsional ke max harian bulan itu; hari ini dihighlight;
hover (desktop) atau tap (mobile) menampilkan tanggal + jumlah. Empty state
otomatis kalau belum ada transaksi.

### Share receipt dari HP (Android)

Setelah PWA di-*install* di Android (Chrome → "Install app"), Dashboard akan
muncul di share sheet Android. Alur:

1. Selesaikan transaksi di GoPay / blu / Jago / Livin' / e-wallet lain.
2. Di halaman receipt, tekan tombol **Bagikan** → pilih **Personal Dashboard**.
3. Kalau belum login, browser akan minta login lebih dulu (file share akan
   hilang saat redirect login — buka app dan login manual satu kali sebelum
   sharing pertama).
4. Setelah upload berhasil, halaman preview `/spends/share/[receiptId]` tampil
   dengan gambar receipt di kiri dan form pengeluaran di kanan. Isi jumlah +
   tanggal + kategori, tekan Simpan.

Konfigurasi share_target ada di `static/manifest.webmanifest` + `vite.config.ts`.
File gambar disimpan di `data/receipts/` (bisa di-override via env `RECEIPT_DIR`),
maksimum 8 MB per file, hanya menerima `image/jpeg|png|webp|heic|heif`.

### OCR otomatis (Fase 3)

Setelah gambar disimpan, endpoint share menjalankan **Tesseract.js** (bahasa
`ind`, WASM — tidak butuh install binary) → parser regex generik di
[`src/lib/server/receiptExtract.ts`](./src/lib/server/receiptExtract.ts)
mengekstrak:

- **Jumlah** — cari `Rp X.XXX(,YY)?`, prioritaskan yang di dekat kata
  "Total"/"Jumlah"/"Nominal"/"Tagihan"; fallback: nilai terbesar.
- **Tanggal** — pola `DD Mmm YYYY` (Jan–Des, singkat/panjang), opsional `HH:MM:SS`.
- **Merchant** — label `Merchant Name`/`Penerima`/`To`/`KE`; fallback: baris
  tepat sebelum marker lokasi (BANTUL/SLEMAN/KOTA…). Untuk receipt transfer
  (mengandung `Account Source` tanpa `Penerima`/`Merchant`) sengaja
  dikembalikan `null` agar tidak salah tebak nama pengirim jadi merchant.
- **Metode** — deteksi keyword logo: gopay, blu, jago, livin, dana, ovo,
  shopeepay, mandiri, bri, bni, qris.
- **Ref ID** — `ID transaksi` / `No. Ref` / `QRIS RRN` / `Nomor Referensi`.

Hasil ekstraksi disimpan sebagai JSON di `receipts.extracted_json` dan otomatis
mengisi form preview `/spends/share/[id]`. User selalu bisa mengoreksi sebelum
Simpan. Kalau salah satu field gagal → dibiarkan kosong, tidak error.

**Cegah dupe:** kalau `refId` cocok dengan spend yang sudah ada, endpoint
langsung mengarahkan ke spend tersebut (index unique `(user_id, ref_id)`).

**Cold start:** panggilan OCR pertama per proses ~5–10 detik (download
`ind.traineddata` ~10 MB, cached di memori). Panggilan berikutnya ~1–3 detik
per gambar screenshot.

### Uji parser receipt

Dua skrip di `scripts/`:

```bash
# 1) Cepat — cek regex terhadap transkripsi manual 4 receipt (tanpa OCR).
npm run test:extract:text

# 2) End-to-end — jalankan OCR + regex pada gambar asli.
#    Simpan gambar di scripts/fixtures/receipts/ dengan nama:
#      gopay.png · blu.png · jago.png · livin.png
#    File yang tidak ada dilewati.
npm run test:extract:image
```

Fixture dan expected values ada di [`scripts/fixtures/receipts.ts`](./scripts/fixtures/receipts.ts).
Kalau `text` semua lulus tapi `image` gagal, artinya OCR-nya yang meleset
(kualitas teks mentah) — bukan regex. Kalau `text` gagal, regex-nya yang perlu
di-tweak di [`src/lib/server/receiptExtract.ts`](./src/lib/server/receiptExtract.ts).

## Keamanan: CSRF

SvelteKit menerapkan cek CSRF bawaan yang menolak semua POST/PUT/PATCH/DELETE
tanpa `Origin` header yang cocok. Ini bertabrakan dengan Android Web Share
Target — POST multipart dari system share sheet sering datang tanpa Origin.

Konfigurasi di repo ini:

- [`svelte.config.js`](./svelte.config.js) — `csrf.checkOrigin: false` matikan
  cek bawaan (SvelteKit hanya bisa on/off global, tidak per-path).
- [`src/hooks.server.ts`](./src/hooks.server.ts) — implementasi cek CSRF manual
  yang berjalan untuk **semua** POST/PUT/PATCH/DELETE **kecuali** path di
  `CSRF_EXEMPT` (saat ini hanya `/spends/share`). Cek ini memverifikasi
  `Origin` header cocok dengan `event.url.origin`; kalau tidak, lempar 403.

Semua rute mutating lain (login, create/update/archive items, create/update/
delete spends, dsb.) tetap terlindungi. Rute `/spends/share` yang di-exempt
tetap butuh sesi login valid + membatasi input ke image whitelist (jpeg/png/
webp/heic/heif, ≤8 MB) sehingga permukaan seranganya sempit.

Menambah endpoint publik-share baru? Tambahkan path-nya ke `CSRF_EXEMPT`
di `hooks.server.ts` — jangan matikan cek manualnya.

## Deploy

Wajib `adapter-node` — SQLite butuh disk persisten & proses hidup terus.
**Jangan** pakai adapter serverless (PRD §2.1).

Panduan lengkap: [docs/DEPLOY-cloudflare-tunnel.md](./docs/DEPLOY-cloudflare-tunnel.md)
— VPS lokal (mis. Ubuntu di Proxmox) di belakang Cloudflare Tunnel + PM2.
Termasuk alur update dari GitHub dan rollback.

Template PM2 ecosystem siap-copy di [deploy/pm2/](./deploy/pm2).

### Catatan build: dependency native/berat

- **`tesseract.js`** — tidak bisa di-bundle Rollup karena membawa worker + WASM.
  Sudah dikonfigurasi sebagai `external` di [`vite.config.ts`](./vite.config.ts)
  (`build.rollupOptions.external` + `ssr.external`). Konsekuensi: `tesseract.js`
  wajib ada di `node_modules` runtime — pastikan `npm ci` di server tidak
  memakai `--omit=optional` yang bisa memangkas sub-dep, dan **bukan** di
  `devDependencies`.
- **`better-sqlite3`** — native module, di-external via `optimizeDeps.exclude`.
  Butuh `build-essential` + `python3` saat `npm ci` di server VPS baru.

Setelah pull update, alur biasa di server:

```bash
cd /var/www/html/personal-dashboard
git pull
npm ci
npm run db:migrate   # kalau ada migrasi baru
npm run build
pm2 restart personal-dashboard
```
