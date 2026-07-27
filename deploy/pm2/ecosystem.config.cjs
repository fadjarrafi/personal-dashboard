/**
 * PM2 process file untuk Personal Dashboard.
 *
 * Semua konfigurasi (PORT, HOST, ORIGIN, DATABASE_URL, SESSION_SECRET, dll.)
 * dibaca dari file .env di CWD lewat flag Node `--env-file` (butuh Node >= 20.6).
 * Ini menghindari menaruh secret di file yang di-commit ke git.
 *
 * Pemakaian:
 *   cd /var/www/html/personal-dashboard
 *   cp deploy/pm2/ecosystem.config.cjs .
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   # ikuti instruksi sudo yang dicetak — bikin PM2 auto-start saat boot
 */
module.exports = {
	apps: [
		{
			name: 'personal-dashboard',
			script: 'build/index.js',
			interpreter_args: '--env-file=.env',

			// WAJIB fork — better-sqlite3 memakai satu proses writer.
			// cluster mode akan menghasilkan multiple writer → korupsi DB.
			exec_mode: 'fork',
			instances: 1,

			autorestart: true,
			max_memory_restart: '300M',

			// NODE_ENV sengaja di sini (bukan di .env) karena ini bukan secret
			// dan membuat perilaku PM2 (misalnya restart delay) jadi eksplisit.
			env: {
				NODE_ENV: 'production'
			}
		}
	]
};
