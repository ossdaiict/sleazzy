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
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        SUPABASE_URL: 'your_supabase_url_here',
        SUPABASE_SERVICE_ROLE_KEY: 'your_supabase_key_here'
      },
      error_file: '/root/sleazzy/logs/api-error.log',
      out_file: '/root/sleazzy/logs/api-out.log',
      log_file: '/root/sleazzy/logs/api-combined.log',
      time: true
    }
  ]
};
