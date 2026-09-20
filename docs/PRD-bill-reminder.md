# PRD — Bill Reminder (Notifikasi PWA)

**Versi:** 0.1 (Draft)
**Pemilik/Pengguna:** Fadjar (single user)
**Status:** Draft — semua keputusan terbuka sudah dikunci, siap diimplementasikan
**Tanggal:** 4 September 2026
**Bergantung pada:** `docs/PRD.md` §2 (arsitektur inti), skema `spends` yang sudah ada (v0.2, lihat §11.2 di sana)

---

## 1. Ringkasan & Tujuan

Fitur untuk mencatat tagihan berulang (listrik, internet, kartu kredit, langganan, dll) dan **mendapat notifikasi push** menjelang atau tepat pada tanggal jatuh tempo — dikirim lewat mekanisme notifikasi asli PWA (Web Push), bukan sekadar badge di dalam app, supaya tetap muncul walau app/tab sedang tertutup.

**Tujuan utama:** tidak pernah lagi telat bayar tagihan karena lupa, tanpa harus buka app tiap hari untuk mengecek.

**Kenapa fitur ini masuk akal sekarang:** app sudah punya `spends` (pengeluaran aktual) dan sudah PWA-installable (`@vite-pwa/sveltekit`). Bill reminder mengisi celah di antara keduanya — "pengeluaran yang **akan** terjadi dan perlu diingatkan", bukan yang sudah tercatat.

---

## 2. Keputusan Arsitektur

| Aspek | Keputusan | Alasan |
|---|---|---|
| Mekanisme notifikasi | **Web Push API** (native browser push, bukan polling in-app) | Satu-satunya cara notifikasi muncul saat app/tab tertutup — itu inti dari permintaan fitur ini |
| Trigger pengiriman | **Cron OS** menjalankan skrip Node harian (pola sama seperti `db:backup`) | Konsisten dengan §2.1 PRD utama: "jangan over-engineer dengan scheduler dalam-app / job queue" untuk proyek 1 user |
| Strategi service worker | **Ganti dari `generateSW` ke `injectManifest`** (custom `src/service-worker.ts`) | `generateSW` (dipakai saat ini di `vite.config.ts`) menghasilkan SW otomatis tanpa titik ekstensi untuk listener custom. Push butuh `self.addEventListener('push', ...)` dan `notificationclick` — ini hanya bisa ditambahkan dengan menulis SW sendiri yang di-precache oleh Workbox lewat `injectManifest` |
| Identitas pengirim push | **VAPID keypair** disimpan sebagai env var (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) | Standar Web Push; tidak perlu layanan pihak ketiga (FCM/OneSignal) — hemat biaya & dependency untuk 1 user |
| Library server | **`web-push`** (npm) | Implementasi VAPID + payload encryption yang sudah battle-tested; menulis ulang ini sendiri tidak sepadan |
| Multi-device | **Satu user, banyak subscription** — tabel `push_subscriptions` terpisah dari `users`, bukan kolom tunggal | User yang sama akan install PWA di HP *dan* desktop (lihat §3 PRD utama, dua konteks penggunaan) — reminder harus sampai ke semua device yang pernah mengaktifkan notifikasi |
| Relasi ke `spends` | **Tidak ada — sepenuhnya terpisah.** "Tandai lunas" hanya mengubah status `bills`; tidak pernah membuat baris `spends` secara otomatis | Keputusan tetap: tagihan adalah rencana, spend adalah realisasi, dan keduanya sengaja tidak disatukan. Jika user ingin mencatat pengeluaran aktual, itu dilakukan manual lewat alur `/spends` yang sudah ada — di luar alur `bills` |
| Saluran notifikasi | **Push PWA saja — tidak ada email/SMS**, sekarang maupun nanti | Keputusan produk, bukan keterbatasan v1: single-user, sudah punya PWA terinstal, tidak ada kebutuhan kanal kedua. Menambah email berarti menambah dependency (mail provider, template, kredensial SMTP) untuk kasus yang sudah tertangani push |
| Kategori tagihan | **Daftar tetap** (`listrik`, `internet`, `cicilan`, `langganan`, `kartu_kredit`, `lainnya`), bukan teks bebas | Berbeda dari `spends.category` (teks bebas) — tagihan berulang punya himpunan kategori yang jauh lebih kecil & stabil, daftar tetap membuat filter/ringkasan konsisten tanpa typo/variasi penulisan |
| Aksi dari notifikasi | **Notification Actions** — tombol "Ingatkan besok" (snooze) langsung dari notifikasi, tanpa buka app | Ditangani di `notificationclick` pada service worker custom (konsisten dengan keputusan `injectManifest` di atas); butuh endpoint server yang bisa dipanggil langsung dari SW |

**Batasan yang diterima secara sadar:**
- ⚠️ **iOS Safari:** Web Push di iOS hanya berfungsi jika PWA sudah di-*add to home screen* (iOS ≥ 16.4), tidak berfungsi dari tab Safari biasa. Persona di PRD utama (§3) menyebut desktop + Android saja — jika nanti dipakai dari iPhone, ini perlu didokumentasikan sebagai syarat instalasi, bukan bug.
- **Butuh HTTPS** — sudah terpenuhi lewat Cloudflare Tunnel (`docs/DEPLOY-cloudflare-tunnel.md`), Web Push mensyaratkan ini seperti halnya PWA installability.
- **Tidak real-time.** Cron harian (atau beberapa kali sehari) cukup untuk kebutuhan "ingatkan tagihan", bukan notifikasi instan seperti chat.

### 2.1 Konsekuensi ke bagian lain proyek

- `vite.config.ts`: `SvelteKitPWA({...})` perlu tambahan opsi `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'service-worker.ts'`, dan `manifest` tetap sama. `workbox.navigateFallbackDenylist` yang sudah ada perlu dipindah/disesuaikan karena sebagian konfigurasi Workbox berubah bentuk di mode `injectManifest`.
- `.env.example`: tambah `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mis. `mailto:dark.fir21@gmail.com`) — digenerate sekali via `npx web-push generate-vapid-keys` dan disimpan permanen (mengganti keypair akan meng-invalidate semua subscription lama).
- `package.json`: tambah dependency `web-push` + `@types/web-push`, dan script baru `bills:remind` (pola sama seperti `db:backup`) untuk dipanggil cron.
- `hooks.server.ts` / `CSRF_EXEMPT`: **tidak perlu perubahan.** Endpoint subscribe/unsubscribe adalah fetch same-origin biasa dari halaman yang sudah login: request menyertakan cookie sesi apa adanya, jadi cek CSRF manual yang sudah ada otomatis berlaku tanpa pengecualian baru.
- README.md: perlu bagian baru "Bill reminder" mengikuti pola bagian "Spend tracker (v0.2)" yang sudah ada — cara generate VAPID key, cara daftar cron, cara uji push secara lokal.

---

## 3. Non-Tujuan

- Bukan pengingat generik/kalender (tetap fokus ke tagihan dengan nominal + jatuh tempo).
- Bukan integrasi bank/e-wallet untuk auto-deteksi tagihan (beda dengan alur OCR receipt yang sudah ada di spend tracker — itu untuk transaksi yang **sudah** terjadi, ini untuk yang **akan** terjadi).
- Bukan pengelolaan langganan penuh (tidak melacak trial period, auto-renewal cancellation, dll) — sekadar "ingatkan sebelum tanggal X".
- Tidak ada notifikasi email/SMS sebagai kanal kedua atau fallback — ini keputusan tetap (lihat §2), bukan sekadar belum dikerjakan. Jika push gagal (browser block, subscription expired), user hanya tahu saat buka app dan melihat badge "jatuh tempo".
- "Tandai lunas" tidak pernah membuat baris `spends` secara otomatis (lihat §2) — mencatat pengeluaran aktual tetap alur manual terpisah lewat `/spends`.

---

## 4. Fitur

### 4.1 CRUD Tagihan (`bills`)
- Buat tagihan: nama, jumlah (perkiraan, boleh diedit tiap siklus), kategori (dipilih dari daftar tetap — lihat §2), tanggal jatuh tempo, dan pola pengulangan.
- Pola pengulangan didukung sejak v1: `none` (sekali), `monthly` (tanggal tetap tiap bulan), `weekly` (hari tetap tiap minggu), `custom_days` (interval N hari). **Prioritas implementasi & pengujian tetap `monthly`** — itu kasus mayoritas nyata (listrik, internet, cicilan, kartu kredit); `weekly`/`custom_days` didukung skema & logikanya sejak awal supaya tidak perlu migrasi susulan, tapi UI boleh memperlakukannya sebagai jalur sekunder.
- List tagihan dengan status turunan (dihitung, bukan disimpan): `upcoming` (belum jatuh tempo), `due_soon` (dalam N hari, N dari pengaturan reminder), `overdue` (lewat tanggal & belum ditandai lunas), `paid` (siklus berjalan sudah ditandai lunas).

### 4.2 Tandai Lunas
- Tombol "Tandai lunas" pada tagihan yang due/overdue.
- **Untuk tagihan `monthly`/`weekly`/`custom_days`:** menandai lunas menggeser `next_due_at` ke siklus berikutnya (+1 bulan / +7 hari / +`interval_days`) — satu baris `bills` mewakili tagihan berulang selamanya, bukan per-siklus.
- **Untuk tagihan `none`:** menandai lunas mengarsipkan baris (`paid_at` terisi, tidak muncul lagi di listing aktif).
- **Terkunci: murni manual, tidak menyentuh `spends`.** Menandai lunas hanya mengubah status `bills` (geser `next_due_at` / isi `paid_at`) — tidak ada baris `spends` yang dibuat otomatis. Jika ingin mencatat pengeluaran aktualnya, itu alur terpisah di `/spends` yang sudah ada.

### 4.3 Aktivasi Notifikasi (per device)
- Tombol eksplisit "Aktifkan notifikasi tagihan" di UI (bukan auto-prompt saat load — `Notification.requestPermission()` yang dipanggil tanpa interaksi user sering langsung ditolak permanen oleh browser & buruk untuk UX).
- Setelah izin diberikan: browser membuat `PushSubscription`, dikirim ke server, disimpan sebagai satu baris `push_subscriptions` (satu per device/browser).
- UI menunjukkan device mana saja yang aktif menerima reminder (berguna karena user memakai ≥2 device — lihat §3 PRD utama), dengan opsi "matikan di device ini".
- Subscription yang gagal dipakai server (endpoint expired/HTTP 410) dihapus otomatis saat pengiriman push gagal dengan status tersebut — tidak perlu UI khusus untuk ini, cukup dibersihkan diam-diam oleh skrip pengirim.

### 4.4 Pengiriman Reminder Terjadwal
- Skrip `scripts/send-bill-reminders.ts` dijalankan cron harian (mis. jam 08:00 waktu lokal server).
- Untuk tiap `bills` aktif milik user: hitung apakah hari ini termasuk dalam jendela reminder (`next_due_at - reminder_days_before` sampai `next_due_at`).
- **Terkunci: maksimal 2 notifikasi per siklus** — satu saat memasuki awal jendela reminder, satu lagi tepat di hari-H jika tagihan masih belum ditandai lunas. Tidak mengirim tiap hari sepanjang jendela. Dilacak lewat `last_notified_at` (menyimpan tanggal siklus + penanda "sudah kirim window-open" vs "sudah kirim due-day", lihat §5) supaya tidak dobel walau skrip dijalankan berkali-kali.
- Tagihan dengan `snoozed_until` di masa depan dilewati dulu — reminder berikutnya baru dievaluasi ulang setelah tanggal snooze lewat (lihat §4.6).
- Payload notifikasi: judul (nama tagihan), body (jumlah + jatuh tempo dalam bahasa manusia, mis. "Rp 350.000 · jatuh tempo 3 hari lagi"), dua Notification Action: **"Ingatkan besok"** (snooze) dan klik utama → buka `/bills/:id`.

### 4.5 Pengaturan Reminder
- Global default: kirim reminder **3 hari sebelum** jatuh tempo (bisa dibuat per-tagihan bila nanti dirasa perlu, tapi mulai dengan satu nilai global lebih sederhana untuk v1).

### 4.6 Snooze dari Notifikasi
- Notifikasi reminder menyertakan tombol aksi **"Ingatkan besok"**, ditangani oleh `notificationclick` di service worker custom (§2) — tidak perlu membuka app untuk menunda.
- Klik snooze memanggil `POST /bills/:id/snooze` langsung dari SW (fetch same-origin, cookie sesi ikut terbawa otomatis), yang mengisi `bills.snoozed_until = besok`.
- Selama `snoozed_until` masih di masa depan, `send-bill-reminders.ts` melewati tagihan itu meski masih dalam jendela reminder — status `due_soon`/`overdue` di UI tetap apa adanya (snooze hanya menunda notifikasi, bukan tanggal jatuh tempo).
- Jika sesi user sudah expired saat SW mencoba fetch (device lama tak dipakai berbulan-bulan), permintaan snooze gagal diam-diam — reminder berikutnya tetap terkirim sesuai jadwal normal sebagai fallback (lihat §8).

---

## 5. Model Data

Dua tabel baru, mengikuti pola yang sudah ada di proyek ini (`user_id` di setiap baris meski 1 user, `created_at`/`updated_at` di setiap tabel, amount sebagai integer):

```sql
CREATE TABLE bills (
  id                    INTEGER PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  title                 TEXT NOT NULL,
  amount                INTEGER NOT NULL,          -- satuan terkecil (rupiah bulat), sama seperti spends.amount
  category              TEXT NOT NULL DEFAULT 'lainnya'
                        CHECK (category IN ('listrik','internet','cicilan','langganan','kartu_kredit','lainnya')),
  recurrence            TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (recurrence IN ('none', 'monthly', 'weekly', 'custom_days')),
  interval_days         INTEGER,                   -- wajib diisi hanya jika recurrence='custom_days'
  next_due_at           TEXT NOT NULL,             -- tanggal jatuh tempo siklus berjalan
  window_notified_at    TEXT,                      -- next_due_at siklus yang sudah dikirimi reminder "awal jendela"
  due_day_notified_at   TEXT,                      -- next_due_at siklus yang sudah dikirimi reminder "hari-H"
  snoozed_until         TEXT,                      -- reminder ditunda sampai tanggal ini (diisi via aksi snooze)
  paid_at               TEXT,                      -- diisi saat recurrence='none' ditandai lunas; NULL untuk tagihan berulang aktif
  archived_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE push_subscriptions (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  endpoint     TEXT NOT NULL UNIQUE,          -- URL unik per browser/device dari PushSubscription
  p256dh       TEXT NOT NULL,                 -- kunci publik subscription (untuk enkripsi payload)
  auth         TEXT NOT NULL,                 -- auth secret subscription
  device_label TEXT,                          -- opsional, mis. "Chrome - Pixel 7" untuk ditampilkan di UI
  created_at   TEXT NOT NULL
);
```

Catatan:
- `bills.amount` boleh diedit manual sebelum ditandai lunas (mis. tagihan listrik beda tiap bulan) — bukan nilai yang selalu identik antar siklus.
- `window_notified_at`/`due_day_notified_at` dipisah (bukan satu `last_notified_at`) supaya skrip cron bisa membedakan "reminder awal jendela sudah terkirim untuk siklus ini" dari "reminder hari-H sudah terkirim untuk siklus ini" — keduanya dibandingkan terhadap `next_due_at` siklus berjalan dan direset otomatis begitu `next_due_at` bergeser ke siklus berikutnya.
- Tidak ada tabel `bill_history` maupun link ke `spends` (lihat §2) — riwayat pembayaran tagihan cukup tersirat dari histori perubahan `next_due_at`/`paid_at`; tidak didesain untuk dilaporkan sebagai riwayat keuangan (itu peran `spends`).

---

## 6. API (garis besar)

Mengikuti pola form actions + endpoint REST eksplisit yang sudah dipakai proyek ini (lihat §7 PRD utama):

```
GET    /bills                      → list + status turunan (upcoming/due_soon/overdue/paid)
POST   /bills                      → create
GET    /bills/:id
PATCH  /bills/:id                  → update (amount, due date, dll)
POST   /bills/:id/mark-paid        → tandai lunas siklus berjalan (geser next_due_at bila berulang)
POST   /bills/:id/snooze           → { days? } (default 1) → set snoozed_until; dipanggil dari UI maupun dari SW saat aksi notifikasi
DELETE /bills/:id

POST   /api/push/subscribe         → { endpoint, keys: { p256dh, auth } } → simpan push_subscriptions
DELETE /api/push/subscribe         → { endpoint } → hapus subscription (device ini berhenti menerima)
GET    /api/push/vapid-public-key  → kirim VAPID_PUBLIC_KEY ke client untuk registrasi subscription
```

`scripts/send-bill-reminders.ts` tidak diekspos sebagai HTTP endpoint — dipanggil langsung oleh cron sebagai proses Node terpisah, sama seperti `scripts/backup.ts`.

---

## 7. Kebutuhan Non-Fungsional

- **Keandalan pengiriman:** kegagalan push ke satu subscription (device mati/offline lama, endpoint expired) tidak boleh menghentikan pengiriman ke subscription lain — loop per-subscription dengan try/catch individual.
- **Idempotensi:** menjalankan `send-bill-reminders.ts` dua kali di hari yang sama tidak boleh mengirim reminder dobel (dicegah lewat `last_notified_at`).
- **Keamanan:** `VAPID_PRIVATE_KEY` hanya di server (env var, tidak pernah dikirim ke client — hanya `VAPID_PUBLIC_KEY` yang boleh). Endpoint subscribe/unsubscribe tetap di balik auth session seperti semua endpoint lain.
- **PWA:** perubahan ke `injectManifest` tidak boleh merusak installability yang sudah ada (manifest, ikon, precache app shell) — perlu diuji ulang lulus Lighthouse PWA checklist setelah migrasi strategi SW.

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Browser/OS membatasi push saat app di-*force close* lama (device-level battery optimization, terutama Android) | Reminder tidak sampai tepat waktu | Diterima sebagai batasan platform; jendela reminder beberapa hari (bukan H-0 saja) mengurangi dampak |
| VAPID key hilang/berubah | Semua subscription lama invalid, user harus aktifkan ulang notifikasi di tiap device | Simpan `VAPID_PRIVATE_KEY` di tempat yang ikut ter-backup (bukan hanya `.env` lokal yang tak di-commit) |
| Migrasi `generateSW` → `injectManifest` salah konfigurasi | App shell tidak ke-cache, PWA gagal lulus installability | Uji manual (Lighthouse + install nyata di Android) sebelum dianggap selesai, bukan hanya baca dokumentasi plugin |
| Cron server mati/tidak jalan (mirip risiko backup) | Reminder tidak terkirim sama sekali | Sama seperti mitigasi backup di PRD utama — pastikan cron terpasang saat deploy, dicek manual pasca setup |
| Aksi snooze dari SW gagal (sesi expired, device offline saat notifikasi diklik) | `snoozed_until` tidak tersimpan, reminder berikutnya tetap terkirim sesuai jadwal normal | Diterima sebagai fallback yang aman by design — gagal snoozing berarti "tetap diingatkan", bukan "tidak diingatkan sama sekali", jadi tidak butuh retry/queue khusus |

---

## 9. Kriteria Sukses

1. User bisa mencatat tagihan berulang (nama, jumlah, tanggal jatuh tempo) dari HP maupun desktop.
2. User bisa mengaktifkan notifikasi di ≥2 device berbeda dan keduanya menerima reminder yang sama.
3. Reminder push muncul di device meski app/tab dalam keadaan tertutup total.
4. Menandai lunas pada tagihan berulang (`monthly`/`weekly`/`custom_days`) menggeser jatuh tempo ke siklus berikutnya tanpa membuat baris baru, dan tidak membuat baris `spends`.
5. Tidak ada reminder dobel untuk siklus jatuh tempo yang sama (maksimal 2: awal jendela + hari-H).
6. Tombol "Ingatkan besok" di notifikasi berhasil menunda reminder tanpa perlu membuka app.
