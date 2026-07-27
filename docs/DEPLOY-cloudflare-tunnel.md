# Deploy — Cloudflare Tunnel (VPS Ubuntu di Proxmox)

Panduan ini menggantikan [docs/DEPLOY.md](./DEPLOY.md) §7 (nginx + certbot).
**Tidak** ada nginx dan **tidak** ada certbot — Cloudflare edge yang meng-terminate
TLS, dan cloudflared (di suatu tempat di LAN) menjangkau app secara langsung.

Domain di contoh: `personal.fadjarrafi.my.id`. Ganti dengan milik Anda.

## Prasyarat

- Teman/kamu sudah membuat tunnel Cloudflare dengan **Public Hostname**:
  - Hostname: `personal.fadjarrafi.my.id`
  - Service: `http://<TARGET>:5173`
- `<TARGET>` bisa `localhost` (jika cloudflared di VPS yang sama)
  atau IP LAN VPS (jika cloudflared di host/VM lain di Proxmox).

## 1. Ikuti DEPLOY.md §1–§6 kecuali:

- **Skip** `sudo apt install nginx certbot python3-certbot-nginx` di §1.
- **Skip** §7 seluruhnya (nginx + certbot).

## 2. `.env` produksi (menggantikan §4)

```bash
sudo -u dashboard tee /srv/personal-dashboard/shared/.env >/dev/null <<'EOF'
DATABASE_URL=/srv/personal-dashboard/shared/data/app.db
SESSION_SECRET=REPLACE_WITH_openssl_rand_-base64_48
NODE_ENV=production

# Port harus SAMA dengan yang teman kamu masukkan di Cloudflare Tunnel
PORT=5173

# Pilih SATU sesuai lokasi cloudflared:
#   (A) cloudflared di VPS yang sama:
# HOST=127.0.0.1
#   (B) cloudflared di host/VM lain di LAN Proxmox:
HOST=0.0.0.0

# WAJIB — SvelteKit adapter-node menolak POST/form action kalau
# Origin header dari browser ≠ ORIGIN env ini.
ORIGIN=https://personal.fadjarrafi.my.id

# Supaya SvelteKit tahu request aslinya HTTPS dan host publik,
# bukan HTTP:5173 dari sisi cloudflared.
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host

BODY_SIZE_LIMIT=524288
EOF
sudo chmod 600 /srv/personal-dashboard/shared/.env
sudo chown dashboard:dashboard /srv/personal-dashboard/shared/.env
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

## 3. Firewall (hanya jika HOST=0.0.0.0)

Kalau cloudflared **di host lain di LAN**, buka port 5173 hanya untuk LAN:

```bash
# Ganti 10.0.0.0/8 dengan CIDR LAN Proxmox Anda (mis. 192.168.1.0/24)
sudo ufw allow from 10.0.0.0/8 to any port 5173 proto tcp
sudo ufw reload
```

Jangan buka `:5173` ke internet — trafik publik harus lewat Cloudflare saja.
Kalau `HOST=127.0.0.1`, tidak perlu ubah firewall (port hanya bind loopback).

## 4. Aktifkan systemd (sama seperti DEPLOY.md §6)

Unit systemd sekarang membaca **semua** env dari `.env` di atas — tidak perlu
`systemctl edit`.

```bash
sudo cp /srv/personal-dashboard/current/deploy/systemd/personal-dashboard.service \
        /etc/systemd/system/personal-dashboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now personal-dashboard.service
sudo systemctl status personal-dashboard.service --no-pager

# Uji lokal (dari VPS, tanpa lewat Cloudflare)
curl -sSf -H 'Host: personal.fadjarrafi.my.id' http://127.0.0.1:5173/ | head -c 200
```

## 5. Setelan Cloudflare (dashboard)

Buka Cloudflare Dashboard → domain `fadjarrafi.my.id`:

### Speed → Optimization → Content Optimization
- **Auto Minify**: **Off** untuk JS/CSS/HTML (SvelteKit sudah minify saat build; Auto Minify bisa merusak module chunks).
- **Rocket Loader**: **Off** (menunda eksekusi JS, memecahkan SvelteKit hydration).

### Caching → Cache Rules
Tambah rule "**Bypass cache untuk personal**":
- **When incoming requests match**:
  `Hostname equals personal.fadjarrafi.my.id`
- **Then**:
  - Cache eligibility: **Bypass cache**

Alasan: app SSR, mengandung sesi user. Cache Cloudflare bisa menyajikan HTML
milik user lain (di kasus 1-user aman, tapi Anda juga tidak ingin dashboard
"macet" di versi lama saat deploy). Aset immutable di `/_app/immutable/`
tetap di-cache browser via header `Cache-Control` bawaan SvelteKit.

### SSL/TLS
- Mode: biarkan bawaan tunnel. Tunnel Cloudflare menangani TLS end-to-end
  dari edge ke cloudflared, jadi setting SSL/TLS mode di dashboard tidak
  relevan untuk hostname ini.

## 6. Verifikasi §10 PRD

1. Buka `https://personal.fadjarrafi.my.id` → login berhasil.
2. Chrome DevTools → **Application → Manifest** → tidak ada error; **Service Workers → sw.js** terdaftar `activated`.
3. Lighthouse → PWA → *Installable* hijau.
4. Buka di Chrome Android → menu "Install app" muncul → coba install → ikon muncul di home screen → open standalone.
5. Login dari HP + desktop, tambah note/bookmark/snippet dalam < 5 detik.
6. Cari "kata" dari kotak search di desktop — hasil FTS instan.
7. Copy snippet 1 klik.
8. Cron backup: `sudo -u dashboard crontab -l` menunjukkan job, coba trigger manual `sudo -u dashboard bash -lc 'cd /srv/personal-dashboard/current && npm run db:backup'`.

## Troubleshooting spesifik Cloudflare Tunnel

**502 Bad Gateway dari Cloudflare**:
- Cek cloudflared status di host tempat ia berjalan.
- Cek Cloudflare Dashboard → Zero Trust → Networks → Tunnels → tunnel ini → status "HEALTHY".
- Verifikasi rule Public Hostname target port = **5173** (bukan 3000).

**Form login gagal / redirect loop, status 403 di POST**:
- ORIGIN env di `.env` tidak match. Cek `journalctl -u personal-dashboard`
  — SvelteKit akan mencetak `cross-site POST form submissions are forbidden`.
  Fix: `ORIGIN=https://personal.fadjarrafi.my.id` persis (tanpa trailing slash),
  lalu `sudo systemctl restart personal-dashboard`.

**Aset JS 404 atau MIME wrong**:
- Rocket Loader / Auto Minify masih menyala. Matikan (§5).

**Service worker tidak update setelah deploy**:
- Cloudflare cache `sw.js`. Terapkan Cache Rule Bypass (§5) atau purge cache
  untuk path `/sw.js` setiap deploy.

**"Access denied" atau "Cross-origin" saat mencoba install PWA**:
- Manifest dan `sw.js` harus disajikan dari origin yang **sama** dengan
  halaman. Cloudflare Tunnel tidak mengubah ini, tapi pastikan Anda tidak
  mengakses via IP LAN dari browser — selalu lewat
  `https://personal.fadjarrafi.my.id`.

**Log tidak muncul di `journalctl`**:
- `sudo journalctl -u personal-dashboard.service -f --no-pager` — kalau kosong,
  cek `systemctl status` untuk exit code. Umum: `EnvironmentFile` tidak
  terbaca (permission 600 tapi bukan milik user `dashboard`).
