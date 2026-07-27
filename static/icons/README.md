# PWA icons

- `icon.svg` — ikon utama (skalabel ke semua ukuran)
- `maskable.svg` — varian dengan safe-zone 60% untuk purpose `maskable` (Android)

Untuk hasil terbaik di Android home screen, ganti keduanya dengan raster PNG
(mis. 192×192 + 512×512) — banyak launcher masih lebih baik render PNG daripada SVG.
Kalau diganti PNG, sinkronkan juga `static/manifest.webmanifest` dan blok `manifest.icons`
di `vite.config.ts`.

Generator maskable interaktif: https://maskable.app
