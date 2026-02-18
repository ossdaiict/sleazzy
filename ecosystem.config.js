module.exports = {
  apps: [
    {
      name: 'sleazzy-api',
      script: 'dist/server.js',
      cwd: '/var/www/sleazzy/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/var/www/sleazzy/server/.env',
      error_file: '/var/www/sleazzy/logs/api-error.log',
      out_file: '/var/www/sleazzy/logs/api-out.log',
      log_file: '/var/www/sleazzy/logs/api-combined.log',
      time: true
    },
    {
      name: 'sleazzy-webhook',
      script: 'webhook-server.js',
      cwd: '/var/www/sleazzy',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || ''
      },
      error_file: '/var/www/sleazzy/logs/webhook-error.log',
      out_file: '/var/www/sleazzy/logs/webhook-out.log',
      log_file: '/var/www/sleazzy/logs/webhook-combined.log',
      time: true
    }
  ]
};
