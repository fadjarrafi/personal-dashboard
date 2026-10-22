# Deploy — Docker + GitHub Actions (self-hosted runner)

Alur `.github/workflows/ci-cd.yml`:

1. **check** (push `main`/`dev`, PR ke `main`) — `bun install`, `svelte-check`, `vite build`.
2. **image** (push `main` saja) — build `Dockerfile`, push ke
   `ghcr.io/fadjarrafi/personal-dashboard:{latest,sha-<commit>}`.
3. **deploy** — jalan di runner self-hosted di server: salin
   `deploy/docker-compose.yml` ke `DEPLOY_DIR`, `docker compose pull && up -d`,
   lalu tunggu container `healthy`.

Container listen langsung di port **5173** (tanpa nginx). Migrasi DB dijalankan
otomatis setiap container start (`node scripts/migrate.js`) sebelum server naik.

Default `DEPLOY_DIR` = `/var/www/html/personal-dashboard`. Ganti lewat
**Settings → Secrets and variables → Actions → Variables** → `DEPLOY_DIR`.

---

## 1. Pasang self-hosted runner di server

Di GitHub: **Settings → Actions → Runners → New self-hosted runner → Linux x64**,
ikuti perintah download + `config.sh` yang ditampilkan. Saat `config.sh`
menanyakan label tambahan, isi: `production`.

```bash
# user runner harus bisa akses docker tanpa sudo
sudo usermod -aG docker $USER   # logout/login setelahnya

# jalankan sebagai service supaya hidup terus setelah reboot
sudo ./svc.sh install $USER
sudo ./svc.sh start
```

> Repo publik + self-hosted runner berisiko (PR dari fork bisa menjalankan kode
> di server). Job `deploy` hanya jalan di push `main`, tapi tetap aktifkan
> **Settings → Actions → General → Require approval for all outside collaborators**.

Opsional: buat environment `production` (**Settings → Environments**) untuk
menambah required reviewer sebelum deploy.

## 2. Siapkan `DEPLOY_DIR`

```bash
mkdir -p /var/www/html/personal-dashboard/data
cd /var/www/html/personal-dashboard
```

`.env` produksi (tidak dibuat oleh workflow — job deploy gagal kalau belum ada):

```bash
tee .env >/dev/null <<EOF
NODE_ENV=production
SESSION_SECRET=$(openssl rand -base64 48)
ORIGIN=https://personal.fadjarrafi.my.id
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
BODY_SIZE_LIMIT=10485760
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:dark.fir21@gmail.com
EOF
chmod 600 .env
```

`DATABASE_URL`, `RECEIPT_DIR`, `BOARD_DIR`, `HOST`, `PORT` di-set oleh
`docker-compose.yml` (path di dalam container), jadi tidak perlu di `.env`.

Container jalan sebagai user `node` (uid 1000). Pastikan `data/` bisa ditulis:

```bash
sudo chown -R 1000:1000 data
```

## 3. Migrasi dari setup PM2

Kalau folder ini sebelumnya clone repo + PM2 (`docs/DEPLOY-cloudflare-tunnel.md`),
`data/` (DB, receipts, boards) dipakai ulang apa adanya:

```bash
pm2 stop personal-dashboard && pm2 delete personal-dashboard && pm2 save
bun run db:backup          # backup dulu, sekali saja
```

Hapus `DATABASE_URL`, `HOST`, `PORT` dari `.env` lama (path host tidak valid di
container). Lalu push ke `main` — atau jalankan workflow manual via
**Actions → CI/CD → Run workflow** pada branch `main`.

Cloudflare Tunnel tetap menunjuk ke `localhost:5173`, tidak ada yang berubah.

## 4. Cron (bill reminder, backup)

Script sudah di-bundle jadi JS di dalam image (`/app/scripts`). Ganti entri
crontab lama dengan `docker exec`:

```cron
0 8 * * * docker exec personal-dashboard node scripts/send-bill-reminders.js >> /var/log/dashboard-bills.log 2>&1
0 3 * * * docker exec personal-dashboard node scripts/backup.js >> /var/log/dashboard-backup.log 2>&1
```

Backup tersimpan di `data/backups/` di host.

## 5. Vault sync (opsional)

Uncomment mount vault di `deploy/docker-compose.yml` dan set
`VAULT_MIRROR_PATH=/srv/vault-mirror` di `.env`. `rclone` tidak ada di dalam
image, jadi kosongkan `VAULT_SYNC_PUSH_CMD` dan jalankan
`deploy/vault-sync-push.sh` dari cron host. Resync tasks:

```cron
*/10 * * * * docker exec personal-dashboard node scripts/vault-tasks-resync.js
```

## Rollback

```bash
cd /var/www/html/personal-dashboard
IMAGE_TAG=sha-<commit-lama> docker compose up -d
```
