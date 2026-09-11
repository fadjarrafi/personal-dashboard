# Deploy — sinkronisasi vault Obsidian ↔ dashboard

Menyambungkan vault Obsidian (`G:\My Drive\rclone\Fadjar's Article Sync GDrive`,
Drive-backed lewat rclone di sisi Windows) ke dashboard yang jalan di VPS
terpisah (lihat `docs/DEPLOY-cloudflare-tunnel.md`). Google Drive jadi
perantara: VPS tidak pernah bicara langsung ke laptop Windows.

Arsitektur singkat: `rclone copy` satu arah menarik seluruh vault dari Drive
ke `/srv/vault-mirror` tiap 5 menit (read mirror). Dashboard hanya menulis ke
satu folder di dalam mirror itu (`Dashboard Sync/`), lalu memicu `rclone copy`
satu arah lain untuk mendorong folder itu balik ke Drive. Sengaja **bukan**
`rclone sync`/`bisync` dua arah penuh — `copy` tidak pernah menghapus file di
tujuan, jadi note yang baru ditulis dashboard tapi belum sempat ke-push tidak
akan tertimpa/terhapus oleh pull berikutnya.

## 1. Prasyarat VPS

Lanjutan dari `docs/DEPLOY-cloudflare-tunnel.md` — dashboard sudah jalan lewat
PM2. Tambahan:

```bash
sudo apt install -y rclone
rclone version   # pastikan >= 1.65
```

## 2. Buat rclone remote ke Google Drive

Pakai akun Drive yang sama dengan yang dipakai rclone di Windows (`gdrive-vault`
di sini hanya nama remote di VPS, boleh beda dari nama remote di Windows —
keduanya independen, sama-sama mengarah ke akun Drive yang sama):

```bash
rclone config
# n) New remote → name: gdrive-vault → Storage: drive
# ikuti OAuth flow (headless: pilih "No" saat ditanya auto config,
# lalu buka link yang dicetak di browser manapun dan tempel kode verifikasi)
```

Verifikasi bisa melihat vault (folder ada satu level di bawah root Drive, di
dalam folder `rclone/`):

```bash
rclone lsf "gdrive-vault:rclone/Fadjar's Article Sync GDrive" | head
```

## 3. Mirror lokal + folder milik dashboard

```bash
sudo mkdir -p /srv/vault-mirror
sudo chown $USER:$USER /srv/vault-mirror

# Pull awal (bisa beberapa menit untuk ~568 note)
rclone copy "gdrive-vault:rclone/Fadjar's Article Sync GDrive" /srv/vault-mirror --fast-list

mkdir -p "/srv/vault-mirror/Dashboard Sync"
```

## 4. Push script

```bash
cd /var/www/html/personal-dashboard
cp deploy/vault-sync-push.sh /srv/vault-sync-push.sh
chmod +x /srv/vault-sync-push.sh
```

Buka `/srv/vault-sync-push.sh` dan pastikan `RCLONE_REMOTE`, `DRIVE_VAULT_PATH`,
`MIRROR_PATH`, `DASHBOARD_FOLDER` sesuai §2–3.

## 5. `.env` dashboard — tambahan

Tambahkan ke `.env` produksi (lihat `.env.example` untuk deskripsi tiap var):

```bash
VAULT_MIRROR_PATH=/srv/vault-mirror
VAULT_DASHBOARD_FOLDER=Dashboard Sync
VAULT_SYNC_PUSH_CMD=/srv/vault-sync-push.sh
```

```bash
pm2 restart personal-dashboard --update-env
```

## 6. Migrasi tabel `vault_tasks`

```bash
npx tsx src/lib/server/db/migrate.ts
```

## 7. Timer pull otomatis (systemd)

```bash
sudo cp deploy/systemd/vault-sync-pull.service /etc/systemd/system/
sudo cp deploy/systemd/vault-sync-pull.timer /etc/systemd/system/
```

Edit `/etc/systemd/system/vault-sync-pull.service`: ganti dua `<user>` dengan
user VPS (`whoami`), dan path npm dengan output `which npm` (biasanya lewat
nvm, mis. `/home/<user>/.nvm/versions/node/v22/bin/npm`).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vault-sync-pull.timer
systemctl list-timers vault-sync-pull.timer   # cek jadwal
sudo systemctl start vault-sync-pull.service  # trigger manual sekali, cek error
journalctl -u vault-sync-pull.service -n 50
```

Tidak punya systemd atau lebih suka cron — alternatif:

```bash
crontab -e
```

```cron
*/5 * * * * cd /var/www/html/personal-dashboard && /usr/bin/rclone copy "gdrive-vault:rclone/Fadjar's Article Sync GDrive" /srv/vault-mirror --fast-list && /home/$USER/.nvm/versions/node/v22/bin/npm run vault:resync >> /var/log/vault-sync.log 2>&1
```

## 8. Verifikasi end-to-end

1. Buka `https://personal.fadjarrafi.my.id/vault` — Journal/Roadmap harus
   menampilkan note asli dari vault.
2. `/vault/new` → buat note → cek muncul di
   `/srv/vault-mirror/Dashboard Sync/` dan (setelah beberapa detik) di Drive
   lewat `rclone lsf "gdrive-vault:...:Dashboard Sync"`.
3. Tunggu sync berikutnya di sisi Windows (rclone yang sudah ada di laptop) —
   note baru harus muncul di `G:\My Drive\rclone\Fadjar's Article Sync GDrive\Dashboard Sync`.
   **Cek ini secara eksplisit** — kalau setup rclone di Windows saat ini
   hanya push (laptop → Drive) dan tidak pernah pull (Drive → laptop), note
   dari dashboard tidak akan pernah sampai ke Obsidian sampai arah itu
   ditambahkan di sisi Windows.
4. Centang task di `/vault` → cek `Dashboard Sync/Tasks.md` berubah dan
   ter-push ke Drive. Centang checkbox langsung di Obsidian → tunggu satu
   siklus timer (≤5 menit) → refresh `/vault` → status harus ikut berubah.

## Troubleshooting

**`/vault` kosong / 404 semua note**
`VAULT_MIRROR_PATH` di `.env` tidak match folder mirror, atau pull pertama
(§3) belum pernah jalan. Cek `ls /srv/vault-mirror`.

**Note baru dari dashboard hilang lagi setelah beberapa menit**
Push script gagal diam-diam (cek `journalctl`/log aplikasi untuk
`vault sync push gagal`) sehingga pull berikutnya "menang" — tapi ingat,
`rclone copy` tidak pernah menghapus, jadi ini biasanya berarti file memang
belum pernah sampai ke Drive. Jalankan `bash /srv/vault-sync-push.sh` manual
dan baca error-nya.

**Task yang dicentang di Obsidian tidak muncul di dashboard**
`npm run vault:resync` tidak ikut jalan setelah pull (cek `ExecStartPost` di
service, atau baris cron). Jalankan manual: `npm run vault:resync` lalu cek
tabel `vault_tasks`.

**`rclone: command not found` di ExecStart**
Path rclone beda dari `/usr/bin/rclone` — cek `which rclone` dan sesuaikan
service/script.
