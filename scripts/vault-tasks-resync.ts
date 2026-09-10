/**
 * Parse "<Dashboard Sync>/Tasks.md" dari vault mirror dan upsert ke tabel
 * vault_tasks, supaya centang yang dibuat langsung di Obsidian ikut muncul
 * di dashboard.
 *
 * Jalankan: npm run vault:resync
 * Cron: setelah tiap pull sync rclone selesai - lihat docs/DEPLOY-vault-sync.md.
 */
import { syncTasksFromFile } from '../src/lib/server/vault';

syncTasksFromFile();
console.log('vault tasks resync selesai');
