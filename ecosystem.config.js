/**
 * PM2 Produzione - Sito Padel
 * Modalità cluster, restart automatico, gestione log
 *
 * Setup log rotation: pm2 install pm2-logrotate
 */
module.exports = {
  apps: [
    {
      name: 'padel-tour',
      script: 'server.js',
      args: '',
      cwd: '/home/ubuntu/Sito-Padel',

      // WebSocket richiede processo singolo (no cluster)
      exec_mode: 'fork',
      instances: 1,

      // Restart automatico
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Log
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: '/home/ubuntu/.pm2/logs/padel-tour-out.log',
      error_file: '/home/ubuntu/.pm2/logs/padel-tour-error.log',

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
