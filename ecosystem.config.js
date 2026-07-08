/**
 * ecosystem.config.js
 * PM2 process manager configuration for production deployment.
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'basirhatcollege-updates-bot',
      script: './src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork', // fork mode required: node-telegram-bot-api polling should run as a single instance
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
