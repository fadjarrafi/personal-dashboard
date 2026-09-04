# PRD — Personal Admin Dashboard

**Versi:** 0.1 (MVP fitur prioritas + roadmap Planned + tech stack: SvelteKit)
**Pemilik/Pengguna:** Fadjar (single user)
**Status:** Draft
**Tanggal:** 27 Juli 2026

---

## 1. Ringkasan & Tujuan

Aplikasi web personal untuk *capture cepat* dan pengelolaan tiga jenis catatan pribadi: **bookmark**, **fleeting note**, dan **cheat code/snippet**. Dapat diakses dari banyak perangkat (desktop & Android) melalui satu URL, dan bisa di-*install* sebagai PWA di HP.

**Tujuan utama MVP:** menambah dan menemukan kembali sebuah item dalam < 5 detik dari layar mana pun.

**Non-tujuan (MVP):** kolaborasi/multi-user, offline capture, sinkronisasi konflik. Job tracker & spend tracker **tidak masuk MVP** tetapi sudah dirancang untuk update berikutnya — lihat §8 (perluasan) & §11 (detail Planned).

---

## 2. Keputusan Arsitektur

| Aspek | Keputusan | Alasan |
|---|---|---|
| Model | **Server-hosted, online-first** | Sync antar device "gratis", tak perlu lapisan sinkronisasi |
| Database | **SQLite (WAL mode)** | Beban 1 user sangat ringan; cukup dan sederhana |
| Client | **PWA** (manifest + service worker + HTTPS) | Installable di Android; SW hanya untuk shell caching, bukan offline data |
| Auth | **Single-user login** (session cookie — lihat §2.1) | URL publik → wajib proteksi meski hanya 1 pengguna |
| Stack | **SvelteKit (full-stack) + better-sqlite3** | Pilihan sadar — lihat §2.1 untuk rincian & trade-off |

**Batasan yang diterima secara sadar:** butuh koneksi internet untuk membaca/menulis. Offline capture *tidak* didukung di MVP. Jika suatu saat ini jadi masalah, opsi mitigasi ada di §9.

### 2.1 Pemilihan Teknologi (Tech Stack)

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | **SvelteKit** (full-stack, mode SSR) | Server routes + form actions menangani seluruh CRUD; tak perlu API terpisah untuk MVP |
| Bahasa | **TypeScript** | Disarankan untuk safety di skema data & API |
| Driver DB | **better-sqlite3** | Sinkron, cepat, ideal untuk 1 user; hindari driver async yang tak perlu di sini |
| Database | **SQLite** dengan `PRAGMA journal_mode=WAL` | Satu file; nyalakan WAL untuk concurrency baca-tulis |
| Query/Migration | **Drizzle ORM** (disarankan) atau SQL mentah | Drizzle punya migration + typing; FTS5 tetap perlu SQL mentah (lihat ⚠️) |
| Auth | Session cookie (mis. **Lucia** / implementasi manual) | ⚠️ Lihat catatan: cookie session lebih cocok untuk full-stack SvelteKit daripada JWT (revisi §2 baris Auth) |
| PWA | **@vite-pwa/sveltekit** | Manifest + service worker; SW hanya cache app shell |
| Styling | Bebas (mis. **Tailwind**) | — |
| Deploy | **`adapter-node`** di VPS (Ubuntu + Nginx reverse proxy) | ⚠️ **Wajib** — lihat gotcha di bawah |

**Alasan pemilihan SvelteKit (jujur):** ini keputusan yang mengutamakan *hasil akhir yang ringan/modern + kesempatan belajar*, **bukan** karena SvelteKit lebih cocok secara objektif dibanding Laravel yang sudah dikuasai. Trade-off yang diterima sadar: ada kurva belajar Svelte (landai, tapi nyata), dan sebagian "baterai" yang di Laravel bawaan (auth, scheduler, queue) harus dirakit sendiri di ekosistem SvelteKit. Untuk proyek 1-user, biaya ini dapat diterima dan sebanding dengan kode frontend yang lebih ringkas.

**Keputusan teknis yang WAJIB dikunci sekarang (agar tak menabrak batasan):**

- ⚠️ **Adapter deploy harus `adapter-node`, bukan adapter serverless** (`adapter-vercel`/`adapter-cloudflare`). SQLite butuh disk persisten & proses yang hidup terus; adapter serverless bersifat ephemeral dan akan merusak asumsi database + backup (§5). Ini kesalahan paling umum pada SvelteKit + SQLite.
- ⚠️ **`better-sqlite3` hanya berjalan di server** (native module). Jangan pernah meng-import-nya di kode yang bisa terbawa ke client. Batasi akses DB pada `+page.server.ts` / `+server.ts` / `hooks.server.ts` saja.
- ⚠️ **FTS5 (§4.5):** Drizzle/ORM tidak punya helper FTS5. Buat `CREATE VIRTUAL TABLE` + trigger sinkronisasi via SQL mentah dalam file migration. Bukan halangan — hanya perlu SQL manual (Anda sudah familiar FTS5 dari proyek crawler).
- ⚠️ **Auth: pertimbangkan session cookie, bukan JWT.** Karena SvelteKit ini full-stack (server & client satu proses), session cookie (HTTP-only) lebih sederhana & aman daripada JWT untuk web-only single-user. JWT baru relevan bila nanti ada client eksternal (mobile native/integrasi) — yang saat ini di luar scope. **Rekomendasi: mulai dengan session cookie; ini merevisi baris Auth di §2.**

**Konsekuensi ke bagian lain PRD:**
- §7 (API): dengan SvelteKit full-stack, sebagian "endpoint" menjadi **form actions** di `+page.server.ts`, bukan REST murni. Endpoint REST eksplisit (`+server.ts`) tetap dibuat hanya untuk yang benar-benar butuh (mis. `/spends/summary`, `/bookmarks/fetch-title`, `/export`). Ini melemahkan premis REST di §8 — dapat diterima untuk web-only personal (lihat trade-off di §8).
- §5 (Backup): scheduler tak lagi bawaan (tak seperti Laravel). Gunakan **cron OS** untuk menyalin file `.db` (+ file `-wal`/`-shm` saat WAL) atau `sqlite3 .backup`. Jangan andalkan scheduler dalam-app.
- §4.2 (fetch-title) & tugas latar lain: tak ada queue bawaan. Untuk 1 user, jalankan sinkron/best-effort di server route sudah cukup; jangan over-engineer dengan job queue.

---

## 3. Persona & Konteks Penggunaan

Satu pengguna, dua konteks dominan:
- **Desktop (kerja):** menyimpan cheat code/snippet, bookmark teknis, mencari kembali cepat.
- **Mobile (di jalan):** menulis fleeting note, menyimpan bookmark dari share sheet.

Implikasi desain: pencarian & input harus setara cepat di mobile dan desktop. Keyboard shortcut di desktop, tombol capture besar di mobile.

---

## 4. Fitur Prioritas (MVP)

### 4.1 Model Data Umum
Ketiga entitas berbagi pola yang sama agar UI & pencarian konsisten:
- `id`, `type` (`bookmark` | `note` | `snippet`), `title`, `body`, `tags[]`, `created_at`, `updated_at`, `archived_at`.

Keputusan: **satu tabel `items` dengan kolom `type`**, bukan tiga tabel terpisah. Alasan: pencarian global lintas-tipe jadi satu query, dan menambah tipe baru tidak butuh tabel baru. Trade-off: beberapa kolom hanya relevan untuk sebagian tipe (mis. `url` untuk bookmark) → dibiarkan `NULL`. Untuk skala 1 user, ini jauh lebih sederhana daripada normalisasi penuh.

### 4.2 Bookmark
- Menyimpan URL + judul + catatan opsional + tags.
- Auto-fetch judul halaman saat URL ditempel (best-effort; boleh gagal diam-diam).
- Buka di tab baru dari daftar.
- **Nice-to-have (bukan MVP):** share target Android (bagikan link dari browser → langsung ke app).

### 4.3 Fleeting Note
- Input teks bebas, secepat mungkin (auto-focus, auto-save draft).
- Tanpa struktur wajib. Judul opsional (auto dari baris pertama).
- **Pin ke atas:** note yang di-pin selalu muncul di urutan teratas daftar, di atas note tak-terpin (yang tetap urut terbaru). Toggle pin/unpin satu klik.
- Bisa di-*promote* jadi snippet atau bookmark nanti (opsional, low priority).

> Catatan implementasi: `pinned` dibuat sebagai kolom di level `items` (generik), bukan khusus note — sehingga snippet/bookmark bisa memakainya kemudian tanpa perubahan skema. UI MVP boleh mengekspos tombol pin hanya di note bila diinginkan.

### 4.4 Cheat Code / Snippet
- Teks dengan **code block** (monospace, preserve whitespace).
- Field `language` opsional (untuk label/warna, syntax highlighting bila mudah).
- **Copy-to-clipboard** satu klik — ini fitur inti, bukan tambahan.
- Tags wajib berguna di sini (mis. `nginx`, `git`, `ffmpeg`).

### 4.5 Fitur Lintas-Tipe
- **Pencarian:** full-text (SQLite FTS5) atas `title` + `body` + `tags`. Instan, satu kotak pencarian global.
- **Filter:** by `type` dan by `tag`.
- **Pin:** item dengan `pinned = 1` selalu diurutkan di atas (`ORDER BY pinned DESC, updated_at DESC`). Berlaku pada listing biasa; saat mode pencarian FTS, relevansi boleh diutamakan (⚠️ keputusan kecil: pin tetap di atas hasil search, atau tidak?).
- **Archive** (soft delete via `archived_at`), bukan hard delete. Hard delete hanya manual dari view arsip.
- **Tag management** ringan: tag adalah teks bebas, di-autocomplete dari yang sudah ada.

---

## 5. Kebutuhan Non-Fungsional

- **Kecepatan:** operasi capture & search terasa instan (< 200ms server-side untuk 1 user).
- **Keamanan:** semua endpoint di belakang auth. HTTPS wajib (juga syarat PWA). Rate limit ringan pada endpoint login.
- **Backup:** karena SQLite adalah satu file, sediakan endpoint/skrip **export** (unduh `.db` atau dump JSON) — ini penyelamat utama data personal. Jadwalkan backup otomatis (cron → salin file DB).
- **PWA:** lulus installability (manifest, ikon, SW, HTTPS). SW meng-cache app shell; data selalu dari network.

---

## 6. Skema Database (MVP)

```sql
-- Pengguna tunggal, tetap disimpan agar auth & (nanti) audit rapi
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,           -- hash
  created_at TEXT NOT NULL
);

CREATE TABLE items (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('bookmark','note','snippet')),
  title       TEXT,
  body        TEXT,
  url         TEXT,                    -- untuk bookmark
  language    TEXT,                    -- untuk snippet
  pinned      INTEGER NOT NULL DEFAULT 0,  -- 0/1; item ter-pin tampil di atas
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE item_tags (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Full-text search
CREATE VIRTUAL TABLE items_fts USING fts5(
  title, body, content='items', content_rowid='id'
);
-- + trigger sinkronisasi INSERT/UPDATE/DELETE items → items_fts
```

Catatan: kolom `user_id` dimasukkan sejak awal meski hanya 1 user. Menambahkannya belakangan jauh lebih menyakitkan daripada membiarkannya `= 1` sekarang.

---

## 7. API (MVP, garis besar)

```
POST   /auth/login            → JWT
GET    /items?type=&tag=&q=   → list + search (q → FTS)
POST   /items                 → create
GET    /items/:id
PATCH  /items/:id             → update / archive
DELETE /items/:id             → hard delete (dari arsip)
GET    /tags                  → autocomplete
GET    /export                → dump JSON / file .db (backup)
POST   /bookmarks/fetch-title → { url } → { title }  (best-effort)
```

---

## 8. Perluasan Terencana (agar tidak refactor nanti)

Ini satu-satunya tempat MVP secara sengaja "melihat ke depan", karena murah sekarang & mahal nanti:

- **Auth & `user_id`** sudah ada → job/spend tracker tinggal menempel.
- **Pola tabel + tag + FTS** bisa dipakai ulang; job & spend jadi tabel sendiri (bukan `items`, karena strukturnya berbeda: status/tanggal untuk job, jumlah/kategori untuk spend).
- **Struktur API** `/{resource}` konsisten → tambah `/jobs`, `/spends` mengikuti pola sama.

Detail job tracker & spend tracker **sengaja dikosongkan** sampai requirement-nya jelas. Menuliskan asumsi sekarang berisiko salah arah.

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Butuh internet (online-first) | Tak bisa capture saat offline | Terima untuk MVP; bila jadi masalah nyata → tambah antrian tulis lokal (IndexedDB) yang di-flush saat online. **Jangan bangun sekarang.** |
| SQLite file corrupt / hilang | Kehilangan semua data | WAL mode + backup otomatis + endpoint export |
| URL publik ditemukan orang lain | Akses tak sah | JWT auth + rate limit login |
| Cache browser dibersihkan | (Tidak berdampak — data di server) | — |

---

## 10. Kriteria Sukses MVP

1. Bisa menambah bookmark/note/snippet dari HP & desktop dalam < 5 detik.
2. Pencarian FTS menemukan item lintas-tipe secara instan.
3. Copy snippet ke clipboard 1 klik.
4. App terpasang sebagai PWA di Android.
5. Backup otomatis berjalan dan export manual berfungsi.

---

## 11. Fitur Terencana — Next Update (belum MVP)

> **Status: Planned (belum final).** Skema & API di bawah adalah rancangan struktural minimum agar konsisten dengan §8, **bukan** requirement final. Setiap item bertanda ⚠️ adalah asumsi yang masih menunggu keputusan Anda. Jangan perlakukan skema ini sebagai kontrak sampai requirement dikonfirmasi.

### 11.1 Simple Job Tracker — `Planned / Next Update`

**Tujuan (asumsi):** melacak pekerjaan/proyek personal beserta statusnya. Tabel terpisah dari `items` karena strukturnya berbeda (punya status & alur, bukan sekadar catatan).

**Cakupan yang diusulkan (MVP fitur ini):**
- CRUD job: `title`, `description`, `status`, `due_date` opsional.
- Status sebagai alur sederhana: `todo → in_progress → done` (⚠️ jumlah & nama status belum dikonfirmasi).
- Filter by status, urut by `due_date`.
- Tags dapat memakai ulang tabel `tags` yang sudah ada.

**Skema usulan:**
```sql
CREATE TABLE jobs (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo','in_progress','done')),  -- ⚠️ asumsi
  due_date    TEXT,                                             -- ⚠️ perlu?
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  archived_at TEXT
);
```

**API usulan:**
```
GET    /jobs?status=      → list + filter
POST   /jobs
GET    /jobs/:id
PATCH  /jobs/:id          → update / ubah status / archive
DELETE /jobs/:id
```

**Keputusan yang masih dibutuhkan (⚠️):**
- Apakah "job" = pekerjaan freelance/klien (butuh field nilai/bayaran, deadline, status pembayaran) atau sekadar to-do proyek pribadi? Ini mengubah skema secara signifikan.
- Perlu sub-task / checklist di dalam job?
- Apakah job perlu terhubung ke spend (mis. biaya per proyek)? Bila ya, relasi `spends.job_id` perlu direncanakan sejak awal.

### 11.2 Spend Tracker — `Planned / Next Update`

**Tujuan (asumsi):** mencatat pengeluaran personal secara cepat, dengan kategori & ringkasan sederhana. Tabel terpisah — punya nilai uang, tanggal, kategori.

**Cakupan yang diusulkan (MVP fitur ini):**
- CRUD pengeluaran: `amount`, `currency`, `category`, `note`, `spent_at`.
- Kategori bebas + autocomplete (pola sama seperti tags).
- Ringkasan sederhana: total per periode (bulan berjalan) & per kategori.
- **Bukan** akuntansi penuh: tanpa double-entry, budget, atau income (⚠️ kecuali diminta).

**Skema usulan:**
```sql
CREATE TABLE spends (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  amount     INTEGER NOT NULL,          -- simpan dalam satuan terkecil (sen/rupiah bulat) untuk hindari float
  currency   TEXT NOT NULL DEFAULT 'IDR',
  category   TEXT,                       -- ⚠️ tabel sendiri atau teks bebas?
  note       TEXT,
  spent_at   TEXT NOT NULL,             -- tanggal transaksi (bukan created_at)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

> **Catatan kritis soal uang:** simpan `amount` sebagai **integer** (satuan terkecil), **jangan** float — floating point menyebabkan galat pembulatan pada penjumlahan. Ini keputusan yang mahal untuk dibalik nanti, jadi saya kunci sekarang meski fitur belum dibangun.

**API usulan:**
```
GET    /spends?from=&to=&category=   → list + filter periode
POST   /spends
GET    /spends/:id
PATCH  /spends/:id
DELETE /spends/:id
GET    /spends/summary?period=       → total per kategori & per periode
```

**Keputusan yang masih dibutuhkan (⚠️):**
- Multi-currency benar-benar dipakai, atau IDR saja? (multi-currency menambah kompleksitas konversi & ringkasan)
- Perlu budget/limit per kategori dengan peringatan?
- Perlu income/pemasukan juga, atau murni pengeluaran?
- Kategori: enum tetap, teks bebas, atau tabel sendiri?

### 11.3 Bill Reminder (Notifikasi PWA) — `Planned / Next Update`

Detail lengkap (skema, keputusan Web Push/VAPID, migrasi service worker) ada di dokumen terpisah: **`docs/PRD-bill-reminder.md`**. Ringkas: tabel `bills` + `push_subscriptions` baru, notifikasi lewat Web Push API (butuh migrasi strategi service worker dari `generateSW` ke `injectManifest`), pengiriman reminder lewat skrip cron harian — pola yang sama seperti `db:backup`, bukan scheduler dalam-app.

### 11.4 Urutan Rilis yang Disarankan
1. **v0.1 (MVP):** bookmark, note, snippet — §4.
2. **v0.2:** Spend tracker (lebih sederhana, requirement lebih jelas).
3. **v0.3:** Job tracker (tunggu kejelasan apakah job ↔ spend perlu terhubung, agar tak refactor relasi).
4. **v0.4:** Bill reminder (§11.3) — bergantung pada `spends` (v0.2) sudah ada; independen dari job tracker.

Alasan spend sebelum job: spend punya bentuk yang lebih stabil & mandiri, sedangkan job berpotensi butuh relasi ke spend — mendahulukan spend menghindari perubahan skema job dua kali.

---

## Pertanyaan Terbuka
- Perlukah **share target Android** di MVP, atau ditunda? (menambah kompleksitas manifest + handler)
- Syntax highlighting snippet: MVP atau nanti? (menambah dependency frontend)
- Backup: cukup file `.db` via cron, atau juga export JSON manual dari UI?