module.exports = {
  apps: [
    {
      name: 'sleazzy-api',
      script: 'dist/server.js',
      cwd: '/root/sleazzy/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/root/sleazzy/server/.env',
      error_file: '/root/sleazzy/logs/api-error.log',
      out_file: '/root/sleazzy/logs/api-out.log',
      log_file: '/root/sleazzy/logs/api-combined.log',
      time: true
    }
  ]
};
