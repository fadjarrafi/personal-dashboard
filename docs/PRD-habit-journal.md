# PRD — Habit Tracker & Jurnal Harian

**Versi:** 0.1 (Draft)
**Pemilik/Pengguna:** Fadjar (single user)
**Status:** Draft — siap diimplementasikan
**Tanggal:** 11 September 2026
**Bergantung pada:** `docs/PRD.md` §2 (arsitektur inti), pola tabel per-fitur yang sudah ada (`bills`, `tasks`, `boards`)

---

## 1. Ringkasan & Tujuan

Dua fitur pelacakan harian yang berdiri sendiri, bagian dari backlog "personal workspace" (habit tracker, jurnal, calendar/agenda view, lampiran file generik, dan widget dashboard "hari ini" — lihat §9 PRD utama):

1. **Habit tracker** — daftar kebiasaan singkat, tiap kebiasaan menampilkan 14 hari terakhir sebagai sel yang bisa ditandai selesai/belum, plus hitungan streak.
2. **Jurnal harian** — satu entri bebas per tanggal kalender, dibaca kronologis seperti diary.

**Kenapa dua fitur ini duluan:** dari lima item backlog, calendar/agenda view dan widget "hari ini" adalah agregator yang menarik data dari fitur lain (tasks, bills, habit, jurnal) — keduanya baru masuk akal dibangun setelah sumber datanya ada. Habit tracker dan jurnal tidak bergantung pada apa pun yang belum ada, jadi keduanya dikerjakan lebih dulu; lampiran file generik, calendar view, dan widget dashboard menyusul di putaran berikutnya.

**Tujuan utama:** menangkap dua jenis catatan berulang harian (kebiasaan yang dicentang, refleksi bebas per hari) dengan gesekan seminimal mungkin — konsisten dengan tujuan MVP utama app ini ("tambah & temu kembali < 5 detik").

---

## 2. Keputusan Arsitektur

| Aspek | Keputusan | Alasan |
|---|---|---|
| Model tabel | **Tabel sendiri untuk tiap fitur** (`habits`+`habit_logs`, `journal_entries`), bukan perluasan `items` | Preseden yang sudah berjalan sejak `bills`/`tasks`/`boards` — PRD utama awalnya membingkai `items` sebagai "cukup tambah `type` baru", tapi tiap fitur nyata sejak MVP justru dapat tabel sendiri karena bentuk datanya (tanggal, status turunan) tidak cocok dipaksakan ke kolom `items` yang generik |
| Status selesai habit | **Keberadaan baris di `habit_logs`** (toggle-by-existence), bukan kolom boolean per hari | Lebih sederhana untuk query rentang tanggal (`WHERE date BETWEEN ...`) dan hitung streak (hitung baris berurutan) dibanding boolean yang perlu di-upsert tiap toggle |
| Satu entri jurnal per hari | **`UNIQUE(user_id, date)`** + upsert (`ON CONFLICT DO UPDATE`), bukan banyak baris per hari | Beda sengaja dari `items.type='note'` (bebas, boleh banyak per hari, tanpa struktur tanggal) — jurnal meniru buku harian: satu halaman per tanggal, ditulis ulang di tempat sepanjang hari |
| Streak habit | **Dihitung dari log yang di-fetch (jendela 14 hari), bukan kolom tersimpan** | Turunan, bukan sumber kebenaran — konsisten dengan pola status turunan `bills`/`tasks` (`upcoming`/`overdue`/dsb dihitung saat baca, bukan disimpan) |
| Cakupan konten | **Sesederhana mungkin** — habit tanpa tag/notes/prioritas, jurnal tanpa tag/pin/arsip | Kedua fitur ini sengaja jadi tabel paling minim di app, berbeda dari `tasks`/`items` yang punya tag+prioritas+pin — kebutuhan sebenarnya di sini hanya "tandai" dan "tulis", bukan mengelola metadata |
| Helper tanggal | **Perluas `src/lib/server/date.ts`** (`todayLocalISODate`, `diffInDays` yang sudah ada) dengan `shiftDateIso` baru | Dua fitur ini butuh operasi "geser N hari" yang sama; `date.ts` sudah jadi tempat khusus logika tanggal lokal sejak diekstrak dari `bills.ts` untuk dipakai `tasks.ts` |

**Batasan yang diterima secara sadar:**
- Streak habit hanya dihitung dari jendela 14 hari yang ditampilkan — streak yang lebih panjang dari itu akan terpotong di angka 14. Diterima karena UI memang hanya menampilkan 14 hari; menghitung streak tak terbatas berarti query tanpa batas atas per habit, tidak sepadan untuk v1.
- Jurnal tidak punya draft-recovery `localStorage` seperti field note di `CaptureForm.svelte` — tidak perlu, karena tiap simpan langsung persisten di server (bukan capture cepat yang rawan hilang sebelum sempat disimpan).
- Tidak ada halaman kalender bulanan untuk jurnal di v1 (hanya list "terbaru" + navigasi hari sebelum/sesudah) — kalender visual penuh ditangani nanti oleh fitur calendar/agenda view yang mengagregasi semua sumber tanggal sekaligus, bukan diduplikasi di sini.

---

## 3. Non-Tujuan

- Bukan pengingat/notifikasi untuk habit yang belum dicentang (beda dari `bills`' push reminder) — habit tracker ini pasif, user yang membuka app dan mencentang sendiri.
- Bukan analitik/statistik habit jangka panjang (grafik bulanan, tingkat keberhasilan %, dst) — v1 hanya streak berjalan dari jendela 14 hari.
- Bukan editor rich-text untuk jurnal (bold/italic/gambar inline) — textarea polos, sama seperti fleeting note.
- Bukan lampiran foto ke entri jurnal — itu bagian dari fitur "lampiran file generik" di putaran backlog berikutnya, sengaja dipisah supaya jurnal v1 tetap sesederhana mungkin.
- Bukan kalender visual bulanan — lihat §2 (batasan yang diterima).
- Tidak menyentuh `items`, `tasks`, atau `bills` sama sekali — dua fitur ini murni berdiri sendiri di v1; agregasi lintas-fitur adalah tanggung jawab fitur calendar/agenda view & widget dashboard yang menyusul.

---

## 4. Fitur

### 4.1 Habit Tracker

- **Daftar kebiasaan** — buat kebiasaan baru dengan hanya judul (mis. "Olahraga", "Baca buku"). Tanpa tag, catatan, atau prioritas.
- **Strip 14 hari** — tiap kebiasaan menampilkan 14 sel tanggal terakhir (hari ini di ujung kanan). Sel bisa diklik untuk menandai selesai/belum pada tanggal itu; klik ulang membatalkan tanda.
- **Tanggal masa depan terkunci** — sel untuk tanggal setelah hari ini tampil nonaktif (tidak bisa diklik), dan server menolak percobaan menandai tanggal masa depan sebagai lapisan pertahanan kedua (bukan hanya dibatasi di UI).
- **Streak** — badge angka "🔥 N hari" per kebiasaan, dihitung mundur dari hari ini selama baris log berurutan ada (lihat §2).
- **Arsip & hapus** — kebiasaan yang sudah tidak relevan bisa diarsipkan (hilang dari daftar aktif) atau dihapus permanen (menghapus juga seluruh riwayat log-nya, dengan konfirmasi eksplisit sebelum hapus).

### 4.2 Jurnal Harian

- **Entri hari ini** — halaman utama `/journal` langsung menampilkan textarea entri hari ini (kosong bila belum ditulis), disimpan lewat tombol simpan.
- **Tulis ulang = update, bukan duplikat** — menyimpan entri untuk tanggal yang sudah punya entri akan menimpa isinya (upsert), bukan membuat baris baru. Entri boleh diedit berkali-kali sepanjang hari itu.
- **Navigasi ke hari lain** — `/journal/[tanggal]` menampilkan (atau membuka form kosong untuk) entri tanggal tertentu, dengan tautan hari sebelumnya/berikutnya. Mengunjungi tanggal valid yang belum punya entri **bukan** error 404 — tampil sebagai form kosong siap diisi.
- **List terbaru** — di bawah entri hari ini, daftar 30 entri terakhir terurut mundur (terbaru dulu), tiap baris menampilkan tanggal + cuplikan baris pertama, tertaut ke halaman detail tanggalnya.
- **Hapus entri** — entri yang ada bisa dihapus (dengan konfirmasi), mengembalikan tanggal itu ke status "belum ada entri".

---

## 5. Model Data

Dua pasang tabel baru, mengikuti pola yang sudah ada di proyek ini (`user_id` di tiap baris meski 1 user, `created_at`/`updated_at` standar):

```sql
-- Migrasi 0007
CREATE TABLE habits (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  archived_at TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE habit_logs (
  id         INTEGER PRIMARY KEY,
  habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,     -- YYYY-MM-DD; keberadaan baris = selesai hari itu
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, date)
);

-- Migrasi 0008
CREATE TABLE journal_entries (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  date       TEXT NOT NULL,     -- YYYY-MM-DD
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, date)
);
```

Catatan:
- `habit_logs` tidak punya kolom status/boolean — satu baris berarti "selesai pada `date` itu"; membatalkan tanda = hapus barisnya (lihat §2).
- `journal_entries.body` tidak boleh kosong (`NOT NULL`, divalidasi juga di form action) — entri kosong secara praktis sama dengan "tidak ada entri", jadi tidak perlu disimpan sebagai baris.
- Tidak ada `archived_at` di `journal_entries` — entri jurnal dihapus langsung (hard delete) bila tak diinginkan, tidak ada konsep arsip untuk buku harian.

---

## 6. API (garis besar)

Mengikuti pola form actions SvelteKit yang sudah dipakai proyek ini (lihat §7 PRD utama) — bukan REST terpisah, karena keduanya adalah halaman biasa dengan form progressive-enhancement:

```
GET  /habits                        → list kebiasaan aktif + log 14 hari + streak
POST /habits?/create                → { title }
POST /habits?/toggleLog             → { habitId, date } → toggle tanda selesai
POST /habits?/archive                → { id }
POST /habits?/delete                 → { id }

GET  /journal                       → entri hari ini + 30 entri terakhir
POST /journal?/save                  → { body } → upsert entri hari ini

GET  /journal/[date]                 → entri tanggal tsb (kosong bila belum ada)
POST /journal/[date]?/save           → { body } → upsert entri tanggal tsb
POST /journal/[date]?/delete         → hapus entri tanggal tsb
```

---

## 7. Kebutuhan Non-Fungsional

- **Konsistensi tanggal lokal:** semua perhitungan "hari ini"/rentang tanggal memakai `todayLocalISODate()`/`shiftDateIso()` dari `src/lib/server/date.ts` — dihitung server-side, bukan `Date` di browser, supaya konsisten dengan cara `bills`/`tasks` sudah menghitung status jatuh tempo.
- **Idempotensi toggle habit:** menekan sel yang sama dua kali berturut-turut harus menghasilkan status yang benar (nyala→mati→nyala), bukan menumpuk baris log ganda — dijamin oleh `UNIQUE(habit_id, date)` + cek keberadaan sebelum insert/delete.
- **Idempotensi simpan jurnal:** menyimpan entri tanggal yang sama berkali-kali tidak boleh membuat baris duplikat — dijamin oleh `UNIQUE(user_id, date)` + `ON CONFLICT DO UPDATE`.
- **Tidak ada regresi pada fitur lain:** kedua fitur ini murni tambahan (tabel baru, route baru, satu baris nav baru) — tidak mengubah skema atau perilaku `items`/`bills`/`tasks`/`boards` yang sudah ada.

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Streak dihitung salah dekat pergantian hari (timezone server vs perangkat) | Streak tampak putus padahal user sudah mencentang "hari ini" menurut jamnya sendiri | Pakai `todayLocalISODate()` yang sudah dipakai konsisten di `bills`/`tasks` untuk masalah serupa — bukan bug baru, melainkan batasan yang sudah diterima di seluruh app (server sebagai satu-satunya sumber kebenaran "hari ini") |
| User menghapus kebiasaan yang punya riwayat log panjang tanpa sadar | Kehilangan riwayat streak secara permanen | Konfirmasi eksplisit (`confirm()`) sebelum hapus, sama seperti pola hapus di `tasks`/`bills`/`boards`; arsip tersedia sebagai alternatif yang tidak destruktif |
| Entri jurnal panjang tersimpan tanpa disadari menimpa entri lama saat tanggal server "berpindah" tengah menulis (menulis mendekati tengah malam) | Isi baru masuk ke tanggal yang salah, atau entri sebelumnya tertimpa tanpa sadar | Diterima sebagai batasan v1 — kasus tepi yang jarang terjadi untuk pemakaian personal; tidak menambah kompleksitas (mis. kunci tanggal saat form dibuka) untuk kasus ini |

---

## 9. Kriteria Sukses

1. User bisa membuat kebiasaan, mencentang/membatalkan status hari ini dan hari-hari sebelumnya dalam 14 hari terakhir, dan melihat streak yang benar.
2. Tanggal masa depan tidak bisa ditandai selesai, baik dari UI maupun percobaan langsung ke server action.
3. User bisa menulis, menyimpan ulang (tanpa duplikat), menavigasi ke tanggal lain, dan menghapus entri jurnal.
4. Mengunjungi tanggal jurnal yang valid tapi belum punya entri menampilkan form kosong, bukan error.
5. Kedua fitur muncul di navigasi ("Kebiasaan", "Jurnal") dan `npm run check` tetap bersih tanpa error baru.
