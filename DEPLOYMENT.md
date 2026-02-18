# VPS Deployment Guide

## 🚀 Quick Setup

### Prerequisites
- VPS with Ubuntu/Debian
- Root access to VPS
- GitHub repository access

### VPS Credentials
- IP: `YOUR_VPS_IP`
- User: `root`
- Password: `YOUR_PASSWORD` (keep this secure!)

---

## 📦 Initial Setup

### 1. Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

### 2. Download and Run Setup Script
```bash
# Download the setup script
curl -o setup.sh https://raw.githubusercontent.com/ossdaiict/sleazzy/main/vps-setup.sh

# Make it executable
chmod +x setup.sh

# Run the setup script
sudo bash setup.sh
```

The setup script will:
- ✅ Clean up old installations
- ✅ Install Node.js, Nginx, PM2, Git
- ✅ Clone the repository to `/var/www/sleazzy`
- ✅ Set up environment files
- ✅ Build the project
- ✅ Configure Nginx
- ✅ Start PM2 processes
- ✅ Generate webhook secret

### 3. Configure Environment Variables

Edit the server environment file:
```bash
nano /var/www/sleazzy/server/.env
```

Update with your actual values:
```env
NODE_ENV=production
PORT=4000

SUPABASE_URL=your_actual_supabase_url
SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

JWT_SECRET=your_actual_jwt_secret
```

Restart services after updating:
```bash
pm2 restart all
```

---

## 🔄 Configure Auto-Deployment (GitHub Webhook)

### 1. Get Webhook Secret
After running the setup script, the webhook secret will be displayed. You can also find it:
```bash
grep WEBHOOK_SECRET /root/.bashrc
```

### 2. Configure GitHub Webhook

1. Go to your repository: https://github.com/ossdaiict/sleazzy
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `http://YOUR_VPS_IP/webhook`
   - **Content type**: `application/json`
   - **Secret**: Paste the webhook secret from step 1
   - **Events**: Select "Just the push event"
   - **Active**: ✅ Check this box
4. Click **Add webhook**

### 3. Test Auto-Deployment

Make a change to your repository and push to the main branch:
```bash
git add .
git commit -m "Test auto-deployment"
git push origin main
```

The webhook will automatically trigger deployment on the VPS!

---

## 📁 Project Structure on VPS

```
/var/www/sleazzy/          # Main project directory
├── client/                # Frontend (React + Vite)
│   └── dist/             # Built frontend files
├── server/                # Backend (Node.js + Express)
│   ├── dist/             # Built backend files
│   └── .env              # Environment variables
├── logs/                  # Application logs
│   ├── api-*.log         # API logs
│   └── webhook-*.log     # Webhook logs
├── webhook-server.js      # Webhook handler
├── deploy.sh              # Deployment script
├── ecosystem.config.js    # PM2 configuration
└── nginx.conf            # Nginx configuration
```

---

## 🛠️ Management Commands

### PM2 Process Management
```bash
# View all processes
pm2 status

# View logs
pm2 logs                    # All logs
pm2 logs sleazzy-api        # API logs only
pm2 logs sleazzy-webhook    # Webhook logs only

# Restart processes
pm2 restart all             # Restart all
pm2 restart sleazzy-api     # Restart API only
pm2 restart sleazzy-webhook # Restart webhook only

# Stop processes
pm2 stop all

# Save PM2 configuration
pm2 save

# View detailed info
pm2 show sleazzy-api
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/sleazzy-access.log
sudo tail -f /var/log/nginx/sleazzy-error.log
```

### Manual Deployment
```bash
cd /var/www/sleazzy
bash deploy.sh
```

### View Application Logs
```bash
# API logs
tail -f /var/www/sleazzy/logs/api-combined.log

# Webhook logs
tail -f /var/www/sleazzy/logs/webhook.log

# All logs
pm2 logs
```

---

## 🌐 Access Points

- **Application**: http://YOUR_VPS_IP/sleazzy
- **API**: http://YOUR_VPS_IP/sleazzy/api
- **Health Check**: http://YOUR_VPS_IP/sleazzy/health
- **Webhook**: http://YOUR_VPS_IP/webhook (GitHub only)

---

## 🔧 Troubleshooting

### Application not loading
1. Check PM2 status: `pm2 status`
2. Check PM2 logs: `pm2 logs`
3. Check if processes are running: `pm2 restart all`

### API not responding
1. Check API logs: `pm2 logs sleazzy-api`
2. Verify environment variables: `cat /var/www/sleazzy/server/.env`
3. Restart API: `pm2 restart sleazzy-api`

### Nginx errors
1. Test config: `sudo nginx -t`
2. Check logs: `sudo tail -f /var/log/nginx/sleazzy-error.log`
3. Restart Nginx: `sudo systemctl restart nginx`

### Webhook not triggering
1. Check webhook logs: `pm2 logs sleazzy-webhook`
2. Verify webhook is running: `pm2 status`
3. Test webhook locally: `curl http://localhost:9000/health`
4. Check GitHub webhook delivery status in repository settings

### Port conflicts
```bash
# Check what's using a port
sudo lsof -i :4000   # API port
sudo lsof -i :9000   # Webhook port
sudo lsof -i :80     # Nginx port
```

---

## 🔒 Security Recommendations

1. **Change default passwords** after initial setup
2. **Set up SSH key authentication**:
   ```bash
   ssh-keygen -t rsa -b 4096
   ssh-copy-id root@YOUR_VPS_IP
   ```
3. **Disable password authentication** in `/etc/ssh/sshd_config`
4. **Enable firewall**:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
5. **Set up SSL/TLS** with Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## 📊 Monitoring

### Check System Resources
```bash
# CPU and Memory
htop

# Disk usage
df -h

# Check service status
systemctl status nginx
pm2 status
```

### Set up monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🚀 Deployment Flow

1. **Developer pushes to GitHub** → `git push origin main`
2. **GitHub webhook triggers** → Sends POST to `http://YOUR_VPS_IP/webhook`
3. **Webhook server receives** → Verifies signature
4. **Deployment script runs** → `deploy.sh`
   - Pulls latest code
   - Installs dependencies
   - Builds project
   - Restarts PM2 processes
   - Reloads Nginx
5. **Application updated** → Available at `http://YOUR_VPS_IP/sleazzy`

---

## 📝 Adding More Projects

To host multiple projects on the same VPS:

1. Create new project directory:
   ```bash
   mkdir -p /var/www/project-name
   ```

2. Clone repository:
   ```bash
   cd /var/www/project-name
   git clone https://github.com/username/project-name.git .
   ```

3. Update Nginx config to add new location:
   ```nginx
   location /project-name {
       alias /var/www/project-name/dist;
       try_files $uri $uri/ /project-name/index.html;
   }
   ```

4. Add PM2 app to ecosystem.config.js

5. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   pm2 restart all
   ```

---

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs`
- Review Nginx logs: `/var/log/nginx/`
- Check PM2 status: `pm2 status`

---

**Last Updated**: February 2026
