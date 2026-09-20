#!/usr/bin/env bash
# Push satu arah: mirror lokal VPS -> Google Drive, hanya folder yang dimiliki
# dashboard. Dipanggil oleh VAULT_SYNC_PUSH_CMD setelah tiap tulis (lihat
# src/lib/server/vault.ts:triggerPush) - fire-and-forget, jadi skrip ini sengaja
# tanpa argumen dan semua path di-hardcode lewat env var di bawah.
#
# Pemakaian: salin ke VPS, isi tiga variabel di bawah, lalu:
#   chmod +x vault-sync-push.sh
#   VAULT_SYNC_PUSH_CMD=/path/ke/vault-sync-push.sh (di .env dashboard)
#
# Lihat docs/DEPLOY-vault-sync.md untuk setup rclone remote & mirror lengkap.
set -euo pipefail

RCLONE_REMOTE="gdrive-vault"                          # nama remote di `rclone config`
DRIVE_VAULT_PATH="rclone/Fadjar's Article Sync GDrive" # path folder vault di Drive
MIRROR_PATH="/srv/vault-mirror"                        # harus sama dengan VAULT_MIRROR_PATH
DASHBOARD_FOLDER="Dashboard Sync"                      # harus sama dengan VAULT_DASHBOARD_FOLDER

rclone copy \
	"${MIRROR_PATH}/${DASHBOARD_FOLDER}" \
	"${RCLONE_REMOTE}:${DRIVE_VAULT_PATH}/${DASHBOARD_FOLDER}" \
	--fast-list
