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

### 11.4 Kanban Board — `Planned / Next Update`

**Tujuan (asumsi):** board visual untuk mengelola task personal generik (bukan pekerjaan klien/freelance — itu domain job tracker di §11.1), dengan kolom tetap merepresentasikan status pengerjaan. Fitur ini **sengaja dibuat terpisah dari job tracker**, bukan menggantikannya: job tracker (bila dibangun) punya semantik pekerjaan/klien, sedangkan kanban board di sini murni task list personal (mis. checklist harian, task rumah tangga, todo proyek pribadi non-klien).

**Cakupan yang diusulkan (MVP fitur ini):**
- CRUD task: `title`, `description`, `status`, `priority`, `due_date` opsional.
- **Satu board saja** (tidak ada entitas `boards` terpisah/multi-board) — semua task milik user dalam satu board implisit, sesuai semangat single-user MVP.
- **Kolom tetap** (bukan kustomisasi user): `todo → in_progress → done`, sama pola CHECK constraint seperti diusulkan di §11.1.
- **Drag-and-drop:** pindah task antar kolom (ubah `status`) dan reorder dalam kolom (ubah `position`). ⚠️ Belum ada library drag-and-drop di dependency proyek saat ini — perlu ditambahkan (`svelte-dnd-action` diusulkan sebagai pilihan idiomatic untuk Svelte 5; ini rekomendasi, bukan keputusan final).
- **Checklist/subtask:** setiap task bisa punya beberapa item checklist (dicentang selesai/belum), tabel terpisah agar tak membatasi jumlah.
- **Tags:** reuse tabel `tags` yang sudah ada (pola sama seperti `item_tags`), bukan bikin sistem tag baru.
- **Keterkaitan opsional ke spend:** task boleh menaut ke satu record `spends` (mis. "beli materialnya sudah dicatat di pengeluaran ini") via `spend_id` nullable. Ini **hanya referensi (FK)** — nilai uang tetap tunggal sumber di tabel `spends`, tidak diduplikasi ke `tasks`.

**Skema (sudah dibangun — nama tabel diberi prefix `kanban_` karena `tasks`/`task_tags` sudah dipakai fitur `/tasks`, todo list flat yang terpisah dari board ini):**
```sql
CREATE TABLE kanban_tasks (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo','in_progress','done')),
  priority    TEXT NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low','medium','high')),
  due_date    TEXT,
  position    INTEGER NOT NULL DEFAULT 0,   -- urutan dalam kolom, di-reindex saat drag-drop
  spend_id    INTEGER REFERENCES spends(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE kanban_checklist_items (
  id         INTEGER PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,   -- 0/1
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE kanban_task_tags (
  task_id INTEGER NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

**Route (sudah dibangun):**
```
src/routes/kanban/+page.svelte + +page.server.ts
  → load: task terkelompok per status untuk render 3 kolom
  → actions: create (quick-add per kolom)

src/routes/kanban/[id]/+page.svelte + +page.server.ts
  → load + actions: update, archive, delete, addChecklistItem, toggleChecklistItem, deleteChecklistItem

PATCH /kanban/reorder  → { status, orderedIds }  (dipanggil client saat drag-drop selesai per kolom)
```

**Catatan non-fungsional:**
- Drag-drop harus terasa instan: update UI optimistic di client dulu, sinkron ke server di background, rollback bila request gagal.
- Harus berfungsi baik dengan mouse (desktop) maupun touch (mobile), sesuai dua konteks penggunaan di §3.
- Tidak menambah test framework formal — konsisten dengan pola existing proyek (tanpa vitest/jest saat ini).

**Keputusan yang masih dibutuhkan (⚠️):**
- Apakah task berstatus `done` otomatis diarsipkan setelah N hari, atau dibiarkan menumpuk di kolom Done sampai diarsipkan manual?
- Apakah `priority` murni label warna/visual, atau memengaruhi urutan default (mis. high selalu di atas dalam kolom)?
- Apakah task dengan `due_date` yang terlewat perlu indikator visual (highlight overdue)?
- Batas jumlah checklist item per task — dibiarkan bebas, atau ada limit wajar?
- Library drag-and-drop: konfirmasi `svelte-dnd-action`, atau ada preferensi lain?

### 11.5 Urutan Rilis yang Disarankan
1. **v0.1 (MVP):** bookmark, note, snippet — §4.
2. **v0.2:** Spend tracker (lebih sederhana, requirement lebih jelas).
3. **v0.3:** Job tracker (tunggu kejelasan apakah job ↔ spend perlu terhubung, agar tak refactor relasi).
4. **v0.4:** Bill reminder (§11.3) — bergantung pada `spends` (v0.2) sudah ada; independen dari job tracker.
5. **Kanban board (§11.4):** independen dari job tracker dan bill reminder — bisa dibangun kapan saja setelah v0.2, tidak wajib menunggu fitur lain selesai. Satu-satunya dependency lunak: bila dibangun sebelum §11.2 selesai, kolom `spend_id` di skema `kanban_tasks` cukup ditunda (nullable, tambahkan via migration kecil belakangan) tanpa mengubah tabel lain.

Alasan spend sebelum job: spend punya bentuk yang lebih stabil & mandiri, sedangkan job berpotensi butuh relasi ke spend — mendahulukan spend menghindari perubahan skema job dua kali.

---

## 12. Redesign UI — "Brutalist Dark" — `Built`

> **Status: Built.** Redesign diterapkan: token warna (`src/lib/tokens.css`), tema daisyUI `brutal` (`tailwind.config.js`), dan seluruh komponen/halaman di-refactor ke gaya monokrom-brutalist. Keputusan §12.8 yang diambil saat implementasi: font Geist + Geist Mono (sudah terpasang sebelumnya), **light mode ditunda** (dark-only, sesuai prioritas rendah di bawah), konsep "Workspaces" **tidak** ditambahkan (di luar cakupan lapisan-presentasi murni), syntax highlighting **dipertahankan** dengan tema monokrom kustom (`.hljs-mono` di `app.css`, menggantikan `github-dark.css`), dan halaman items desktop **tetap tabel** (`ItemTable`). Detail asli di bawah ini dipertahankan sebagai referensi spek.

### 12.1 Ringkasan Gaya

Empat kata kunci: **Brutalist · Dark Mode · Zinc borders · Blackboards.**

| Prinsip | Artinya dalam praktik |
|---|---|
| **Brutalist** | Tanpa `border-radius` (0px), tanpa shadow, tanpa gradient, tanpa blur. Hierarki dibangun dari *border 1px*, *ukuran tipografi*, dan *ruang kosong* — bukan dari elevasi/kedalaman. |
| **Dark Mode (default)** | Kanvas hitam pekat `#000000`; panel/permukaan *obsidian* `#09090B` (zinc-950). Bukan navy/slate seperti tema `dashboard` saat ini. |
| **Zinc borders** | Semua garis pemisah, outline kartu, dan tombol sekunder memakai `#27272A` (zinc-800), 1px, solid. Border putus-putus (`dashed`) khusus untuk *empty state / slot kosong*. |
| **Blackboards** | Kartu/panel diperlakukan seperti *papan tulis hitam*: permukaan matte `#09090B` dibingkai zinc, isi "kapur" putih. Tak ada kartu yang "melayang" — semua *flat* dan rata dengan grid. |
| **Monokrom** | Satu-satunya "warna" adalah putih. Status ditandai titik putih ● + label mono uppercase, bukan hijau/kuning. Warna semantik (error/warning) dibatasi ke kasus yang benar-benar butuh (validasi form, toast error) — lihat §12.2. |

### 12.2 Token Warna

Definisikan sebagai CSS custom properties di `src/app.css`, lalu dipetakan ke tema daisyUI (lihat §12.6). Skala mengikuti **Tailwind `zinc`** agar konsisten dan mudah diingat.

| Token | Hex | Pemakaian |
|---|---|---|
| `--bg-canvas` | `#000000` | Background `body` & area konten utama |
| `--bg-surface` | `#09090B` | Sidebar, kartu (*blackboard*), modal, dropdown, tooltip |
| `--bg-raised` | `#18181B` (zinc-900) | Item nav *hover*, baris tabel *hover*, input background |
| `--bg-active` | `#27272A` (zinc-800) | Nav item aktif tingkat utama (lihat "BOARDS" di referensi), *pressed state* |
| `--border` | `#27272A` (zinc-800) | Semua border 1px default |
| `--border-strong` | `#3F3F46` (zinc-700) | Border saat hover/fokus pada elemen interaktif |
| `--fg` | `#FFFFFF` | Judul, teks utama, ikon aktif, titik status |
| `--fg-muted` | `#A1A1AA` (zinc-400) | Label mono uppercase, nav item non-aktif, teks sekunder |
| `--fg-subtle` | `#71717A` (zinc-500) | Placeholder, teks disabled, ID/metadata dekoratif |
| `--accent` | `#FFFFFF` | Tombol primer (bg putih, teks hitam), garis aktif 2px di sisi kiri nav item |
| `--danger` | `#F87171` | **Hanya** untuk aksi destruktif (hard delete, toast error). Tidak dipakai untuk dekorasi. |
| `--warning` | `#FBBF24` | **Hanya** untuk peringatan nyata (mis. OCR gagal parsial). Opsional. |

> ⚠️ **Kontras:** `#71717A` di atas `#000000` ≈ 4.3:1 — sedikit di bawah AA (4.5:1) untuk teks kecil. Karena itu label mono berukuran 10–12px **wajib** memakai `--fg-muted` (`#A1A1AA`, ≈ 8:1), dan `--fg-subtle` dibatasi untuk placeholder/disabled/metadata yang tidak esensial. Ini menyimpang sedikit dari referensi demi mempertahankan a11y yang sudah dicapai di commit `aea1912`.

**Light mode (opsional, prioritas rendah):** inversi langsung — canvas `#FFFFFF`, surface `#FAFAFA` (zinc-50), border `#E4E4E7` (zinc-200), fg `#09090B`, accent hitam. Toggle ☾/☀ diletakkan di kaki sidebar seperti referensi. Dark tetap default dan `prefers-color-scheme` **tidak** diikuti otomatis (single user → preferensi disimpan di `localStorage`).

### 12.3 Tipografi

Dua keluarga huruf, peran tegas, tidak dicampur:

| Peran | Font | Spesifikasi |
|---|---|---|
| **Display / Judul** | Sans geometris netral — **Geist** (rekomendasi) atau Inter | Bold, `tracking-tight` (−0.02em), `leading-none`. H1 halaman 36–40px, judul kartu 20–22px semibold, judul modal 24px. Putih `--fg`. |
| **Label / UI / Meta** | Monospace — **Geist Mono** (rekomendasi) atau JetBrains Mono | **Uppercase**, `tracking-widest` (+0.1em), 10–12px, `--fg-muted`. Dipakai untuk: heading section sidebar ("NAVIGATION"), nav item, ID (`ID-001`), subtitle halaman ("ACTIVE PROJECTS WORKSPACE"), status badge, label tombol, kolom header tabel. |
| **Body** | Sans yang sama dengan display | Regular 14–15px, `--fg` untuk isi, `--fg-muted` untuk deskripsi kartu. |
| **Code** (snippet) | Monospace yang sama, **tidak** uppercase | 13px, `leading-relaxed`, preserve whitespace — tetap seperti `CodeBlock.svelte` sekarang. |

Font di-*self-host* (mis. `@fontsource-variable/geist` + `@fontsource-variable/geist-mono`) agar tak ada request ke pihak ketiga dan tetap konsisten dengan PWA/offline shell. Fallback: `ui-sans-serif, system-ui` dan `ui-monospace, Consolas`.

### 12.4 Bentuk, Ruang & Grid

- **Radius:** `0px` untuk semua elemen (kartu, tombol, input, modal, badge, avatar). Satu-satunya pengecualian: titik status ● (`rounded-full`, 6px) dan *focus ring*.
- **Border:** 1px `--border` di semua sisi. Tak ada border yang "lebih tebal untuk penekanan" — penekanan dilakukan lewat **garis aksen 2px putih di sisi kiri** (nav item aktif) atau **inversi warna** (tombol primer).
- **Shadow / blur / gradient:** dilarang. Modal memakai overlay hitam `rgba(0,0,0,0.7)` polos.
- **Spacing:** basis 4px. Padding kartu 24px, gap grid 24px, padding sidebar 24px horizontal, tinggi item nav 40px, tinggi tombol 40px (desktop) / 44px (mobile, `tap-target`).
- **Grid konten:** desktop 3 kolom (`grid-cols-3`), tablet 2, mobile 1. Sidebar tetap 256px di ≥ `lg`, drawer hamburger di bawahnya (perilaku existing dipertahankan).
- **Pemisah halaman:** setiap halaman diawali blok header — **H1 + subtitle mono** di kiri, **tombol aksi primer** di kanan — lalu **garis 1px** full-width di bawahnya (lihat "Your Boards ——— + CREATE BOARD").
- **Transisi:** hanya `background-color`/`border-color`, 100–150ms, `ease-out`. Tanpa animasi scale/slide kecuali drawer mobile. Hormati `prefers-reduced-motion` (sudah ada di `app.css`).

### 12.5 Katalog Komponen (spesifikasi visual)

| Komponen | Spesifikasi |
|---|---|
| **Sidebar** | Lebar 256px, bg `--bg-surface`, `border-r` 1px. Bagian atas: logotype (ikon kotak putih + wordmark bold) + sub-label mono ("PREMIUM ACCESS" → di sini mis. "SINGLE USER"). Section heading mono `--fg-muted` 10px ("NAVIGATION", "WORKSPACES"). Item nav: ikon 16px + label mono uppercase 12px, tinggi 40px; hover → bg `--bg-raised`; **aktif** → bg `--bg-active`, teks putih, garis 2px putih di kiri. Kaki sidebar: baris ikon (toggle tema, settings, trash/arsip) dalam kotak berborder, lalu kartu user (avatar kotak berinisial + nama mono uppercase). |
| **Header halaman** | H1 display bold + subtitle mono uppercase `--fg-muted`; tombol primer di kanan; `border-b` 1px setelahnya; margin bawah 48px. |
| **Kartu (Blackboard)** | bg `--bg-surface`, border 1px, padding 24px. Struktur: baris meta (ID/tipe mono `--fg-subtle` di kiri, tombol ⋯ berborder 32×32 di kanan) → judul display 20–22px → deskripsi `--fg-muted` 14px → `border-t` 1px → footer status (● putih + mono uppercase, mis. `PINNED`, `ARCHIVED`, `2 TAGS`). Hover → border `--border-strong`. Tak ada shadow. |
| **Kartu kosong / slot** | Border **dashed** 1px `--border`, bg transparan, ikon ⊕ di tengah 40px `--fg-muted`, label mono uppercase ("INITIALIZE NEW BOARD" → "NEW ITEM" / "NEW SPEND"). Klik → buka `CaptureForm`. |
| **Tombol primer** | bg putih, teks hitam, mono uppercase 12px `tracking-widest`, ikon `+` opsional, padding 12px 24px, radius 0. Hover → bg `#E4E4E7`. |
| **Tombol sekunder / ikon** | bg transparan, border 1px `--border`, teks `--fg`. Hover → border `--border-strong`, bg `--bg-raised`. Ukuran ikon-only 32×32 (desktop) / 44×44 (mobile). |
| **Tombol destruktif** | Sama seperti sekunder, tapi teks & ikon `--danger`; hover → border `--danger`. Tidak ada tombol merah solid. |
| **Input / textarea / select** | bg `--bg-raised`, border 1px `--border`, teks putih, placeholder `--fg-subtle`, radius 0, tinggi 40px. Fokus → border putih (bukan ring biru). Label di atas input: mono uppercase 10px `--fg-muted`. |
| **Chip / tag** (`.chip`) | Ganti `rounded-full` → radius 0; border 1px `--border`, bg transparan, mono uppercase 10px, padding 2px 8px. Tag aktif (filter) → inversi: bg putih, teks hitam. |
| **Status badge** | ● 6px putih + teks mono uppercase 11px putih. Untuk state non-aktif (arsip) titik `--fg-subtle`. |
| **Tabel** (`ItemTable`) | Tanpa zebra. Header kolom mono uppercase 10px `--fg-muted`, `border-b` 1px. Baris tinggi 48px, `border-b` 1px `--border`, hover → bg `--bg-raised`. Kolom aksi pakai tombol ikon berborder. |
| **Modal** (`ItemDetailModal`) | Overlay `rgba(0,0,0,.7)`. Panel bg `--bg-surface`, border 1px, radius 0, lebar maks 640px, padding 32px. Header: judul display + tombol ✕ berborder. Footer: `border-t` 1px + baris aksi rata kanan (pertahankan bottom padding dari fix `bfece27`). Mobile → full-screen sheet dari bawah. |
| **Code block** (`CodeBlock`) | bg `#000000` (lebih gelap dari kartu), border 1px, radius 0. Bar atas: label bahasa mono uppercase `--fg-muted` di kiri, tombol COPY berborder di kanan. Syntax highlight (jika ada) **monokrom**: keyword putih bold, string `--fg-muted`, comment `--fg-subtle` italic. |
| **Toast** | Kotak `--bg-surface` border 1px, radius 0, posisi bawah-tengah (mobile) / kanan-bawah (desktop). Teks mono uppercase 12px. Error → border `--danger`, teks `--danger`. Tanpa ikon berwarna. |
| **Chart** (`SpendChart`) | Bar putih penuh untuk **hari ini**, bar `--border-strong` (zinc-700) untuk hari lain, hover → `--fg-muted`. Sumbu & gridline `--border` 1px. Tooltip = kotak `--bg-surface` border 1px, teks mono. Tanpa gradient/rounded bar. |
| **Empty state halaman** | Sama seperti kartu kosong tapi memenuhi lebar konten: border dashed, ikon ⊕, satu kalimat mono uppercase, tombol primer di bawahnya. |
| **Shortcuts overlay** (`Shortcuts`) | Modal kecil; tiap shortcut = `<kbd>` kotak berborder 1px, mono uppercase, bg `--bg-raised`. |
| **Login** | Kanvas hitam, satu blackboard 400px di tengah: logotype, sub-label mono, dua input, tombol primer putih full-width. Tanpa ilustrasi. |

### 12.6 Strategi Implementasi (SvelteKit + Tailwind + daisyUI)

Pilihan sadar: **pertahankan daisyUI**, tapi ganti tema — bukan cabut daisyUI. Alasan: komponen existing (modal, drawer, toast) sudah memakai kelas daisyUI; mencabutnya = refactor besar tanpa manfaat visual. Cukup:

1. **Tema baru di `tailwind.config.js`** — ganti tema `dashboard` (navy/sky) dengan `brutal`:
   - `base-100: #000000`, `base-200: #09090B`, `base-300: #18181B`, `base-content: #FFFFFF`, `neutral: #27272A`, `primary: #FFFFFF`, `primary-content: #000000`, `error: #F87171`, `warning: #FBBF24`.
   - Variabel radius daisyUI: `--rounded-box: 0`, `--rounded-btn: 0`, `--rounded-badge: 0`, `--tab-radius: 0`, `--animation-btn: 0`, `--btn-focus-scale: 1`.
   - `darkTheme: 'brutal'`; tema `light` diganti `brutal-light` (inversi §12.2) bila light mode dibangun.
2. **`fontFamily` di Tailwind:** `sans: ['Geist Variable', ...]`, `mono: ['Geist Mono Variable', ...]`; import fontsource di `src/routes/+layout.svelte`.
3. **`src/app.css`:** deklarasi token CSS (§12.2) di `:root`/`[data-theme]`; update `.chip` (radius 0, border), `.skip-link` (radius 0), focus-visible → `outline: 2px solid #fff; outline-offset: 2px; border-radius: 0`.
4. **Kelas utilitas baru** di `@layer components`: `.label-mono` (mono uppercase tracking-widest 10px muted), `.blackboard` (bg surface + border 1px + p-6), `.page-header` (flex + border-b), `.btn-brutal` / `.btn-brutal-ghost`.
5. **Refactor komponen** urut dampak: layout & sidebar → `ItemCard` → `ItemTable` → `CaptureForm` → `ItemDetailModal` → `CodeBlock` → `Toast` → `SpendChart` → halaman `spends`, `receipts`, `archive`, `login`.
6. **Grep-and-kill:** cari & hapus semua `rounded-*`, `shadow-*`, `bg-gradient-*`, `btn-primary` berwarna, `badge-success/warning` dekoratif. Sisakan `rounded-full` hanya untuk titik status.

**Tidak berubah:** struktur route, form actions, skema DB, PWA manifest (kecuali `theme_color` → `#000000` dan `background_color` → `#000000`), perilaku a11y (skip link, tap-target, reduce-motion, focus-visible).

### 12.7 Kriteria Selesai

1. Tidak ada elemen dengan `border-radius > 0` kecuali titik status & focus ring (bisa dicek dengan grep `rounded-` di `src/`).
2. Tidak ada `box-shadow`, gradient, atau warna selain skala zinc + putih + `--danger`/`--warning` terbatas.
3. Semua teks lolos **WCAG AA** (≥ 4.5:1) — label mono kecil memakai `#A1A1AA`, bukan `#71717A`.
4. Lighthouse a11y & PWA installability tidak turun dari sebelum redesign.
5. Screenshot halaman `items`, `spends`, dan `login` di desktop & mobile dapat disandingkan dengan referensi Plynk dan terbaca sebagai "keluarga" yang sama.

### 12.8 Keputusan yang masih dibutuhkan (⚠️)

- **Font:** Geist + Geist Mono (rekomendasi, lisensi OFL), atau Inter + JetBrains Mono? Keduanya self-host via fontsource.
- **Light mode:** dibangun sekaligus (toggle ☾/☀ seperti referensi) atau ditunda sampai dark selesai?
- **Konsep "Workspaces" di sidebar referensi:** dipetakan ke apa di sini — filter tipe (Bookmark/Note/Snippet), tag ter-pin, atau dihilangkan? Rekomendasi: **tag ter-pin** (maks 5), karena tipe sudah ada di nav utama.
- **Syntax highlighting monokrom:** dipertahankan dengan tema custom, atau dilepas sama sekali demi konsistensi brutalist?
- **Kartu vs tabel** di halaman items desktop: referensi memakai grid kartu; saat ini desktop memakai `ItemTable`. Tetap tabel (padat, cepat scan) dengan gaya §12.5, atau ikut grid kartu?

---

## Pertanyaan Terbuka
- Perlukah **share target Android** di MVP, atau ditunda? (menambah kompleksitas manifest + handler)
- Syntax highlighting snippet: MVP atau nanti? (menambah dependency frontend)
- Backup: cukup file `.db` via cron, atau juga export JSON manual dari UI?
- Kanban board (§11.4): sudah dibangun dengan `svelte-dnd-action` untuk drag-and-drop. Keputusan masih terbuka: auto-arsip task `done` setelah N hari, apakah `priority` memengaruhi urutan default, dan indikator overdue untuk `due_date` — lihat daftar lengkap di §11.4.
- Redesign UI (§12): dikerjakan **sebelum** kanban (agar kanban langsung lahir dengan gaya baru) atau **sesudah**? Rekomendasi: sebelum — redesign menyentuh semua komponen, lebih murah dilakukan saat komponen masih sedikit.
- Redesign UI (§12): pasangan font & nasib light mode — lihat §12.8.