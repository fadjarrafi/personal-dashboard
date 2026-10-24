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
Node 26+ karena `better-sqlite3` belum kompatibel dengannya. Versi minimum
(security release 21 Oktober 2026): **v22.23.4** atau **v24.22.1** — lihat
`engines` di `package.json` dan "Upgrade Node" di "Update dari GitHub". Bun dipakai sebagai
package manager + script runner saja; runtime aplikasi tetap Node (`better-sqlite3`
belum didukung runtime Bun), jadi keduanya wajib terpasang.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# reload shell
nvm install 22 && nvm alias default 22
node -v      # v22.x.x
curl -fsSL https://bun.sh/install | bash
# reload shell
bun -v
sudo apt install -y build-essential python3 sqlite3
```

## 4. Clone repo

```bash
sudo mkdir -p /var/www/html
sudo chown -R $USER:$USER /var/www/html
cd /var/www/html
git clone https://github.com/<user>/personal-dashboard.git
cd personal-dashboard
bun install
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

# 10 MB — di atas batas 8 MB untuk foto receipt (lihat MAX_SIZE di
# src/lib/server/receipts.ts). Kalau ini kekecilan, upload foto receipt
# dari HP akan gagal 413 sebelum sempat kena validasi ukuran aplikasi.
BODY_SIZE_LIMIT=10485760
EOF
chmod 600 .env
```

Kalau `HOST=0.0.0.0`, buka firewall LAN saja (bukan publik):

```bash
sudo ufw allow from 192.168.0.0/16 to any port 5173 proto tcp
```

## 6. Migrasi + user pertama

```bash
bunx tsx src/lib/server/db/migrate.ts
bunx tsx scripts/seed.ts you@mail.com yourStrongPassword
```

## 7. Build produksi

```bash
bun run build
```

## 8. PM2 — install, config, run

```bash
bun add -g pm2
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

Tambahkan (sesuaikan path Node jika berbeda dari nvm default). `PATH` Node wajib
diset karena cron tidak load shell profile — tanpa `node` di PATH, `bun run`
akan menjalankan skrip dengan runtime Bun dan `better-sqlite3` gagal load:

```cron
0 3 * * * cd /var/www/html/personal-dashboard && PATH=/home/$USER/.nvm/versions/node/v22/bin:$PATH /home/$USER/.bun/bin/bun run db:backup >> /var/log/dashboard-backup.log 2>&1
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
3. Lighthouse → PWA → _Installable_ hijau.
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

# 2. sinkronkan dependencies (kalau bun.lock berubah)
bun install

# 3. build ulang
bun run build

# 4. terapkan migrasi database (idempotent — aman diulang)
bunx tsx src/lib/server/db/migrate.ts

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

### Upgrade Node (security release)

Patch keamanan Node ada di runtime, bukan di repo — `git pull` saja tidak
cukup. Contoh untuk security release 21 Oktober 2026 (22.x → v22.23.4):

```bash
cd /var/www/html/personal-dashboard
nvm install 22 && nvm alias default 22
node -v                              # wajib >= v22.23.4

# daemon PM2 masih memegang binary Node lama — reload ke Node baru
pm2 update
pm2 restart personal-dashboard --update-env

# systemd unit PM2 menyimpan path Node lama — regenerate
pm2 unstartup systemd
pm2 startup                          # jalankan baris sudo yang dicetak
pm2 save
```

Lalu cek `crontab -e`: nvm memasang tiap versi di direktori sendiri
(`~/.nvm/versions/node/v22.23.4/bin`), jadi `PATH` cron yang menunjuk direktori
versi lama tetap menjalankan Node lama. Sesuaikan dengan `ls ~/.nvm/versions/node`.
Hal yang sama berlaku untuk `Environment=PATH` di `deploy/systemd/*.service`.

Upgrade dalam major yang sama tidak mengubah ABI, jadi `better-sqlite3` tidak
perlu di-rebuild. Verifikasi: `pm2 describe personal-dashboard | grep "node.js version"`.
Setelah itu `nvm uninstall <versi-lama>` supaya tidak ada yang terlanjur memakainya.

### Rollback cepat

```bash
cd /var/www/html/personal-dashboard
git log --oneline -5              # cari commit sebelumnya
git reset --hard <commit-sha>     # ⚠️ destruktif untuk file tracked
bun install
bun run build
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
Log akan tercetak: _cross-site POST form submissions are forbidden_.

**413 Payload Too Large saat scan/share receipt**
`BODY_SIZE_LIMIT` di `.env` lebih kecil dari ukuran foto (default
adapter-node 512 KB). Set ke `10485760` (10 MB, sudah di atas batas 8 MB
aplikasi di `receipts.ts`), lalu `pm2 restart personal-dashboard --update-env`.

**Aset JS 404 / MIME salah**
Rocket Loader atau Auto Minify masih menyala di Cloudflare (§2).

**Service worker tidak update setelah deploy**
Cache Rule "Bypass cache" (§2) belum aktif untuk hostname ini, atau
purge manual di Cloudflare → Caching → Purge Everything.

**`better-sqlite3` gagal load / NODE_MODULE_VERSION mismatch**
Node versi berubah antara `bun install` dan runtime. Bangun ulang:
`rm -rf node_modules/better-sqlite3 && bun install`.

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
