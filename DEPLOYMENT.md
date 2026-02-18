# Deployment Guide

## 🌐 Live Application

**URL**: http://72.60.220.43/sleazzy  
**Health Check**: http://72.60.220.43/sleazzy/health

## 📊 Server Information

- **VPS IP**: 72.60.220.43
- **User**: root
- **Route**: `/sleazzy`
- **API Port**: 4000
- **Webhook Port**: 9000

## 🔄 Auto-Deployment Status

✅ **Configured**: GitHub Actions workflow is set up for automatic deployment on push to `main` branch.

## 📝 Monitoring & Management

### Check Application Status

```bash
ssh root@72.60.220.43
pm2 status
```

### View Logs

```bash
# API logs
pm2 logs sleazzy-api

# All logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/sleazzy-access.log
tail -f /var/log/nginx/sleazzy-error.log

# Webhook logs
journalctl -u sleazzy-webhook -f
```

### Restart Services

```bash
# Restart API
pm2 restart sleazzy-api

# Restart Nginx
systemctl restart nginx

# Restart Webhook
systemctl restart sleazzy-webhook
```

### Manual Deployment

```bash
ssh root@72.60.220.43
cd /root/sleazzy
bash deploy.sh
```

## 🏗️ Architecture

### Stack
- **Frontend**: React 19 + Vite (built to `/root/sleazzy/client/dist`)
- **Backend**: Node.js + Express (running on port 4000)
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **Auto-Deploy**: GitHub Actions + Webhook Handler

### File Structure on VPS

```
/root/sleazzy/
├── client/
│   └── dist/              # Built frontend files
├── server/
│   ├── dist/              # Compiled backend
│   └── .env               # Server environment variables
├── logs/                  # PM2 logs
├── deploy.sh              # Deployment script
├── ecosystem.config.js    # PM2 configuration
├── nginx.conf             # Nginx configuration (reference)
└── webhook-server.js      # Webhook handler
```

## 🔧 Configuration Files

### PM2 Configuration (`ecosystem.config.js`)

The PM2 process manager runs the Node.js server with the configuration defined in `ecosystem.config.js`.

### Nginx Configuration

Located at `/etc/nginx/sites-available/sleazzy`, configured to:
- Serve frontend at `/sleazzy`
- Proxy API requests to `localhost:4000`
- Handle static assets with caching

### Environment Variables

#### Server (`/root/sleazzy/server/.env`)
```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=4000
NODE_ENV=production
```

#### Client (`/root/sleazzy/client/.env`)
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=/sleazzy
```

**Note**: The `VITE_API_URL` should be `/sleazzy` (not `/sleazzy/api`) because the API routes already include the `/api` prefix.

## 🐛 Troubleshooting

### Application Not Loading

1. Check PM2 status:
```bash
pm2 status
pm2 logs sleazzy-api --lines 50
```

2. Check if port 4000 is listening:
```bash
netstat -tlnp | grep 4000
```

3. Check Nginx:
```bash
systemctl status nginx
nginx -t
```

### Permission Issues

If Nginx can't access files:
```bash
chmod -R 755 /root/sleazzy
chmod +x /root
```

### Build Failures

```bash
cd /root/sleazzy/server
npm install
npm run build

cd /root/sleazzy/client
npm install
npm run build
```

## 📚 Additional Resources

- GitHub Repository: https://github.com/ossdaiict/sleazzy
- Supabase Dashboard: https://supabase.com/dashboard
