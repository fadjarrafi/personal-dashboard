# Deploy — Personal Dashboard (VPS Ubuntu)

Panduan deploy MVP v0.1 ke VPS Ubuntu di belakang Nginx + Let's Encrypt.
Mengunci semua keputusan §2.1 PRD: `adapter-node`, disk persisten, cron OS.

Placeholder yang harus Anda ganti:
- `dashboard.example.com` → domain Anda
- `dashboard` → nama user Linux non-root
- `github.com/you/personal-dashboard.git` → URL repo Anda

## 1. Prasyarat VPS

Ubuntu 22.04+ dengan akses root. DNS `A` record `dashboard.example.com` →
IP VPS **sudah propagasi** sebelum certbot dijalankan.

```bash
sudo apt update && sudo apt install -y curl nginx sqlite3

# Node 20 LTS (untuk better-sqlite3 native module — jangan pakai `apt install nodejs`)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# Certbot untuk HTTPS
sudo apt install -y certbot python3-certbot-nginx
```

Cek: `node -v` ≥ 20, `nginx -v`, `certbot --version` tersedia.

## 2. User + layout direktori

```bash
sudo useradd -m -s /bin/bash dashboard
sudo mkdir -p /srv/personal-dashboard/{current,releases,shared/data}
sudo chown -R dashboard:dashboard /srv/personal-dashboard
```

Struktur akhir:

```
/srv/personal-dashboard/
├── current/                # symlink → releases/<timestamp>
├── releases/               # setiap deploy jadi subfolder baru
└── shared/
    ├── .env                # secret, di-mount ke systemd
    └── data/               # app.db + backups/  ← WAJIB persisten
```

## 3. Deploy build pertama

Di **mesin dev** (Windows/macOS):

```bash
npm ci
npm run build
tar -czf release.tar.gz build package.json package-lock.json src/lib/server/db/migrations scripts
scp release.tar.gz dashboard@vps:/tmp/
```

Di **VPS** sebagai user `dashboard`:

```bash
sudo -iu dashboard
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /srv/personal-dashboard/releases/$STAMP
tar -xzf /tmp/release.tar.gz -C /srv/personal-dashboard/releases/$STAMP
cd /srv/personal-dashboard/releases/$STAMP

# install runtime deps saja (dev deps tidak dibutuhkan runtime)
npm ci --omit=dev

# link data ke shared, agar release ganti tidak menyentuh DB
ln -s /srv/personal-dashboard/shared/data ./data

# aktifkan release ini
ln -sfn /srv/personal-dashboard/releases/$STAMP /srv/personal-dashboard/current
```

## 4. Config `.env` produksi

```bash
sudo -u dashboard tee /srv/personal-dashboard/shared/.env >/dev/null <<'EOF'
DATABASE_URL=/srv/personal-dashboard/shared/data/app.db
SESSION_SECRET=REPLACE_WITH_openssl_rand_-base64_48
NODE_ENV=production
EOF
sudo chmod 600 /srv/personal-dashboard/shared/.env
sudo chown dashboard:dashboard /srv/personal-dashboard/shared/.env
```

Generate secret asli:

```bash
openssl rand -base64 48
```

## 5. Migrasi + user pertama

```bash
sudo -iu dashboard
cd /srv/personal-dashboard/current
set -a; source /srv/personal-dashboard/shared/.env; set +a

# Karena kita hanya install --omit=dev, tsx tidak ada. Install ad-hoc:
npx --yes tsx src/lib/server/db/migrate.ts
npx --yes tsx scripts/seed.ts you@mail.com yourStrongPassword
```

> Alternatif lebih rapi: sebelum tar, jalankan `tsc` untuk memproduksi `.js`
> dari `scripts/` — lalu di VPS panggil `node dist/scripts/migrate.js`. Untuk MVP,
> `npx tsx` sudah cukup dan hanya dipanggil saat migrasi/seed.

## 6. Pasang systemd unit

```bash
sudo cp /srv/personal-dashboard/current/deploy/systemd/personal-dashboard.service \
        /etc/systemd/system/personal-dashboard.service

# Edit ORIGIN=https://dashboard.example.com sesuai domain Anda
sudo systemctl edit --full personal-dashboard.service

sudo systemctl daemon-reload
sudo systemctl enable --now personal-dashboard.service
sudo systemctl status personal-dashboard.service
curl -sSf http://127.0.0.1:3000/ | head -c 200
```

## 7. Nginx + HTTPS

```bash
sudo cp /srv/personal-dashboard/current/deploy/nginx/personal-dashboard.conf \
        /etc/nginx/sites-available/personal-dashboard.conf
sudo sed -i 's/dashboard.example.com/dashboard.YOURDOMAIN.com/g' \
        /etc/nginx/sites-available/personal-dashboard.conf
sudo ln -s /etc/nginx/sites-available/personal-dashboard.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Terbitkan sertifikat + otomatis edit blok server
sudo certbot --nginx -d dashboard.YOURDOMAIN.com

# Cek renewal timer aktif
sudo systemctl list-timers | grep certbot
```

## 8. Cron backup

```bash
sudo -u dashboard crontab -e
```

Tambahkan:

```cron
0 3 * * * cd /srv/personal-dashboard/current && /usr/bin/npm run db:backup >> /var/log/dashboard-backup.log 2>&1
```

Buat log file bisa ditulis oleh user `dashboard`:

```bash
sudo touch /var/log/dashboard-backup.log
sudo chown dashboard:dashboard /var/log/dashboard-backup.log
```

## 9. Verifikasi MVP §10

1. Buka `https://dashboard.YOURDOMAIN.com` → login berhasil.
2. Chrome DevTools → Lighthouse → PWA → *Installable* hijau.
3. Buka dari Android Chrome → "Install app" muncul → ikon di home screen → open standalone.
4. Tambah bookmark/note/snippet dari HP & desktop dalam < 5 detik.
5. Pencarian FTS instant lintas-tipe.
6. Copy snippet 1 klik.
7. `sudo -u dashboard crontab -l` menunjukkan job backup; tunggu 24 jam / trigger manual `npm run db:backup` → verifikasi file di `data/backups/`.

## 10. Update selanjutnya (zero-downtime cukup baik untuk 1 user)

```bash
# di dev
npm ci && npm run build
tar -czf release.tar.gz build package.json package-lock.json \
    src/lib/server/db/migrations scripts deploy
scp release.tar.gz dashboard@vps:/tmp/

# di VPS
sudo -iu dashboard
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir /srv/personal-dashboard/releases/$STAMP
tar -xzf /tmp/release.tar.gz -C /srv/personal-dashboard/releases/$STAMP
cd /srv/personal-dashboard/releases/$STAMP
npm ci --omit=dev
ln -s /srv/personal-dashboard/shared/data ./data
set -a; source /srv/personal-dashboard/shared/.env; set +a
npx --yes tsx src/lib/server/db/migrate.ts   # idempotent, aman diulang
ln -sfn /srv/personal-dashboard/releases/$STAMP /srv/personal-dashboard/current
sudo systemctl restart personal-dashboard.service
```

Rollback = `ln -sfn releases/<STAMP-lama> current && systemctl restart …`.
Simpan ~3 release terakhir untuk cepat rollback, sisanya `rm -rf`.

## Troubleshooting

- **502 Bad Gateway** → `sudo journalctl -u personal-dashboard -f` untuk log Node.
  Umum: `SESSION_SECRET` kosong, atau `DATABASE_URL` tidak bisa dibuat karena
  folder `shared/data` belum ada / permission salah.
- **PWA tidak "Installable"** → cek HTTPS aktif, manifest 200, service worker
  terdaftar (DevTools → Application). PRD melarang mode serverless — pastikan
  `adapter-node`, bukan Vercel/Cloudflare.
- **DB read-only error** → cek pemilik file `data/app.db*` = `dashboard`, dan
  systemd `ReadWritePaths` mencakup folder tersebut.
- **`better-sqlite3` gagal load native** → biasanya Node major berbeda dengan
  waktu build. Bangun ulang di VPS: `npm rebuild better-sqlite3`.
