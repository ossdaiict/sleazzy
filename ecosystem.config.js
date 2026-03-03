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

      // 🔥 Explicitly define environment
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },

      env_file: '/var/www/sleazzy/server/.env',

      error_file: '/var/www/sleazzy/logs/api-error.log',
      out_file: '/var/www/sleazzy/logs/api-out.log',
      log_file: '/var/www/sleazzy/logs/api-combined.log',
      time: true
    },

    {
      name: 'sleazzy-fe',
      script: 'serve',
      args: 'dist -l 3005',
      interpreter: 'npx',
      cwd: '/var/www/sleazzy/client',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '256M',

      env: {
        NODE_ENV: 'production'
      },

      error_file: '/var/www/sleazzy/logs/fe-error.log',
      out_file: '/var/www/sleazzy/logs/fe-out.log',
      log_file: '/var/www/sleazzy/logs/fe-combined.log',
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
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
        PORT: 4000 // optional - if webhook needs separate port
      },

      error_file: '/var/www/sleazzy/logs/webhook-error.log',
      out_file: '/var/www/sleazzy/logs/webhook-out.log',
      log_file: '/var/www/sleazzy/logs/webhook-combined.log',
      time: true
    }
  ]
};