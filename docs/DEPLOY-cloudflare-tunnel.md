# Deploy — VPS lokal (Ubuntu) via Cloudflare Tunnel + PM2

Panduan ini mencerminkan setup nyata yang dipakai: VPS Ubuntu di Proxmox,
domain di-proxy Cloudflare Tunnel, proses aplikasi dijalankan PM2.

Domain contoh: `personal.fadjarrafi.my.id`. Ganti dengan milik Anda.
Path contoh: `/var/www/html/personal-dashboard`. Sesuaikan bila berbeda.

---

## 1. Cloudflare Tunnel — public hostname

Di Cloudflare Zero Trust dashboard, di tunnel yang sudah ada, tambah
**Public Hostname**:

- **Subdomain**: `personal`
- **Domain**: `fadjarrafi.my.id`
- **Service**: `HTTP` → `<TARGET>:5173`

`<TARGET>`:
- `localhost` — jika cloudflared berjalan di VPS yang sama
- IP LAN VPS — jika cloudflared di host/VM lain di Proxmox

## 2. Setelan Cloudflare dashboard

Di zona `fadjarrafi.my.id`:

- **Speed → Optimization**:
  - Rocket Loader → **Off** (memecah SvelteKit hydration)
  - Auto Minify JS/CSS/HTML → **Off** (SvelteKit sudah minify saat build)
- **Caching → Cache Rules** — tambah rule "**Bypass cache untuk personal**":
  - When incoming requests match: `Hostname equals personal.fadjarrafi.my.id`
  - Then → **Bypass cache**

## 3. Prasyarat VPS

Ubuntu, akses `sudo`. Install Node 22 atau 24 (LTS) via nvm — hindari
Node 26+ karena `better-sqlite3` belum kompatibel dengannya.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# reload shell
nvm install 22 && nvm alias default 22
node -v      # v22.x.x
sudo apt install -y build-essential python3 sqlite3
```

## 4. Clone repo

```bash
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html
cd /var/www/html
git clone https://github.com/<user>/personal-dashboard.git
cd personal-dashboard
npm install
```

Kalau `EACCES` di `mkdir node_modules` — folder milik root. Fix:
`sudo chown -R $USER:$USER /var/www/html/personal-dashboard` lalu ulangi.

## 5. `.env` produksi

```bash
tee .env >/dev/null <<EOF
DATABASE_URL=/var/www/html/personal-dashboard/data/app.db
SESSION_SECRET=$(openssl rand -base64 48)
NODE_ENV=production

# Port harus SAMA dengan target di Cloudflare Tunnel (§1).
PORT=5173

# 127.0.0.1 kalau cloudflared di VPS ini juga; 0.0.0.0 kalau di host LAN lain.
HOST=127.0.0.1

# WAJIB — SvelteKit adapter-node menolak POST/form action kalau
# Origin header dari browser ≠ ORIGIN env ini.
ORIGIN=https://personal.fadjarrafi.my.id

# Supaya SvelteKit tahu request aslinya HTTPS + host publik.
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host

BODY_SIZE_LIMIT=524288
EOF
chmod 600 .env
```

Kalau `HOST=0.0.0.0`, buka firewall LAN saja (bukan publik):

```bash
sudo ufw allow from 192.168.0.0/16 to any port 5173 proto tcp
```

## 6. Migrasi + user pertama

```bash
npx tsx src/lib/server/db/migrate.ts
npx tsx scripts/seed.ts you@mail.com yourStrongPassword
```

## 7. Build produksi

```bash
npm run build
```

## 8. PM2 — install, config, run

```bash
npm install -g pm2
cp deploy/pm2/ecosystem.config.cjs .
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs personal-dashboard --lines 30
```

Aktifkan auto-start setelah reboot:

```bash
pm2 save
pm2 startup
# → cetak baris `sudo env PATH=... pm2 startup systemd -u <user> --hp /home/<user>`
# jalankan baris tersebut persis.
```

## 9. Cron backup

Jadwalkan backup DB harian jam 03:00:

```bash
crontab -e
```

Tambahkan (sesuaikan path Node jika berbeda dari nvm default):

```cron
0 3 * * * cd /var/www/html/personal-dashboard && /home/$USER/.nvm/versions/node/v22/bin/npm run db:backup >> /var/log/dashboard-backup.log 2>&1
```

Buat log writable:

```bash
sudo touch /var/log/dashboard-backup.log
sudo chown $USER:$USER /var/log/dashboard-backup.log
```

## 10. Verifikasi

```bash
curl -sSf http://127.0.0.1:5173/ | head -c 200
```

Lalu di browser buka `https://personal.fadjarrafi.my.id`:

1. Login berhasil.
2. Chrome DevTools → Application → Manifest tanpa error; Service Worker `activated`.
3. Lighthouse → PWA → *Installable* hijau.
4. Chrome Android → menu → **Install app** → ikon di home screen → open standalone.
5. Tambah bookmark/note/snippet dari HP & desktop dalam < 5 detik.
6. Copy snippet 1 klik dari list.

---

## Update dari GitHub

Alur normal setelah ada commit baru di remote:

```bash
cd /var/www/html/personal-dashboard

# 1. tarik perubahan
git pull

# 2. sinkronkan dependencies (kalau package-lock.json berubah)
npm install

# 3. build ulang
npm run build

# 4. terapkan migrasi database (idempotent — aman diulang)
npx tsx src/lib/server/db/migrate.ts

# 5. restart PM2 dengan env terbaru
pm2 restart personal-dashboard --update-env
```

Kalau ada perubahan di `ecosystem.config.cjs` (mis. dari `deploy/pm2/`):

```bash
cp deploy/pm2/ecosystem.config.cjs .
pm2 delete personal-dashboard
pm2 start ecosystem.config.cjs
pm2 save
```

Kalau ada perubahan di `.env.example` yang menuntut var baru: bandingkan
dengan `.env` lokal, tambahkan yang hilang, lalu `pm2 restart --update-env`.

### Rollback cepat

```bash
cd /var/www/html/personal-dashboard
git log --oneline -5              # cari commit sebelumnya
git reset --hard <commit-sha>     # ⚠️ destruktif untuk file tracked
npm install
npm run build
pm2 restart personal-dashboard --update-env
```

`data/app.db` tidak tersentuh oleh `git reset` karena folder `data/`
di-`.gitignore`. Kalau migrasi baru sudah keburu jalan, rollback skema harus
manual (restore dari `data/backups/`).

---

## Troubleshooting

**502 dari Cloudflare**
Cek tunnel `HEALTHY` di Cloudflare Zero Trust dashboard dan target port = 5173.

**403 di POST (form login gagal / redirect loop)**
`ORIGIN` di `.env` tidak match. Fix: `ORIGIN=https://personal.fadjarrafi.my.id`
persis tanpa trailing slash, lalu `pm2 restart personal-dashboard --update-env`.
Log akan tercetak: *cross-site POST form submissions are forbidden*.

**Aset JS 404 / MIME salah**
Rocket Loader atau Auto Minify masih menyala di Cloudflare (§2).

**Service worker tidak update setelah deploy**
Cache Rule "Bypass cache" (§2) belum aktif untuk hostname ini, atau
purge manual di Cloudflare → Caching → Purge Everything.

**`better-sqlite3` gagal load / NODE_MODULE_VERSION mismatch**
Node versi berubah antara `npm install` dan runtime. Bangun ulang:
`npm rebuild better-sqlite3`.

**Setelah reboot `pm2 status` kosong**
`pm2 startup` belum dijalankan. Ulangi §8 langkah `pm2 startup` + `pm2 save`.

**Ganti versi Node bikin PM2 tidak mau start**
Systemd unit PM2 menyimpan path Node lama. Regenerate:

```bash
pm2 unstartup systemd
pm2 startup   # jalankan baris sudo yang dicetak
pm2 save
```

**Log**
`pm2 logs personal-dashboard --lines 200` — file mentah di
`~/.pm2/logs/personal-dashboard-{out,error}.log`.
