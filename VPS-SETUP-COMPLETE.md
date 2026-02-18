# 🎉 VPS Setup Complete!

## ✅ What Has Been Done

### 1. **VPS Clean Up & Organization**
- ✅ Removed old installation from `/root/sleazzy`
- ✅ Created new project directory at `/var/www/sleazzy`
- ✅ Set up proper directory structure for multiple projects
- ✅ Configured logs directory

### 2. **System Configuration**
- ✅ Updated all system packages
- ✅ Installed Node.js 20
- ✅ Installed and configured Nginx
- ✅ Installed and configured PM2
- ✅ Configured firewall (UFW)

### 3. **Project Deployment**
- ✅ Cloned repository to `/var/www/sleazzy`
- ✅ Installed all dependencies
- ✅ Built both client and server
- ✅ Configured Nginx for `/sleazzy` route
- ✅ Started PM2 processes (API + Webhook server)

### 4. **Automatic Deployment**
- ✅ Set up webhook server on port 9000
- ✅ Configured webhook endpoint at `/webhook`
- ✅ Generated secure webhook secret

---

## 🔑 Important Information

### **VPS Access**
```bash
ssh root@YOUR_VPS_IP
```

### **Webhook Secret**
The webhook secret was generated during setup and saved to `/root/.bashrc` on your VPS.
Check it with: `grep WEBHOOK_SECRET /root/.bashrc`

### **Application URLs**
- **Main App**: http://YOUR_VPS_IP/sleazzy
- **API**: http://YOUR_VPS_IP/sleazzy/api
- **Health Check**: http://YOUR_VPS_IP/sleazzy/health
- **Webhook** (GitHub only): http://YOUR_VPS_IP/webhook

---

## 🚀 Next Steps

### 1. **Configure Environment Variables**

SSH into the VPS and edit the environment file:
```bash
ssh root@YOUR_VPS_IP
nano /var/www/sleazzy/server/.env
```

Update with your actual Supabase credentials:
```env
NODE_ENV=production
PORT=4000

# Replace these with your actual values
SUPABASE_URL=your_actual_supabase_url
SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key

JWT_SECRET=your_actual_jwt_secret
```

After editing, restart the services:
```bash
pm2 restart all
```

### 2. **Set Up GitHub Webhook**

1. Go to: https://github.com/ossdaiict/sleazzy/settings/hooks
2. Click **"Add webhook"**
3. Configure:
   - **Payload URL**: `http://YOUR_VPS_IP/webhook`
   - **Content type**: `application/json`
   - **Secret**: `34515080e3ff7447c0112ba83a8c68076c26b5fa560971fb3ffb730cb3f55592`
   - **Which events?**: Select "Just the push event"
   - **Active**: ✅ Ensure this is checked
4. Click **"Add webhook"**

### 3. **Test Automatic Deployment**

Make any small change and push to GitHub:
```bash
git add .
git commit -m "test: verify auto-deployment"
git push origin main
```

The webhook will automatically:
- Pull the latest code
- Install dependencies
- Build the project
- Restart PM2 processes
- Reload Nginx

---

## 📊 Useful Commands

### **PM2 Management**
```bash
pm2 status                    # Check all processes
pm2 logs                      # View all logs
pm2 logs sleazzy-api          # View API logs only
pm2 logs sleazzy-webhook      # View webhook logs only
pm2 restart all               # Restart all processes
pm2 stop all                  # Stop all processes
pm2 save                      # Save current process list
```

### **Nginx Management**
```bash
sudo nginx -t                 # Test configuration
sudo systemctl restart nginx  # Restart Nginx
sudo systemctl reload nginx   # Reload Nginx
sudo systemctl status nginx   # Check status
```

### **View Logs**
```bash
# Application logs
tail -f /var/www/sleazzy/logs/api-combined.log
tail -f /var/www/sleazzy/logs/webhook.log

# Nginx logs
sudo tail -f /var/log/nginx/sleazzy-access.log
sudo tail -f /var/log/nginx/sleazzy-error.log
```

### **Manual Deployment**
```bash
cd /var/www/sleazzy
bash deploy.sh
```

---

## 🌐 Project Structure on VPS

```
/var/www/sleazzy/
├── client/
│   ├── dist/              # Built frontend files (served by Nginx)
│   ├── src/
│   └── package.json
├── server/
│   ├── dist/              # Built backend files (run by PM2)
│   ├── src/
│   ├── .env              # ⚠️ CONFIGURE THIS!
│   └── package.json
├── logs/
│   ├── api-*.log         # API logs
│   └── webhook-*.log     # Webhook logs
├── webhook-server.js      # Webhook handler (port 9000)
├── deploy.sh             # Deployment script
├── ecosystem.config.js   # PM2 configuration
└── nginx.conf           # Nginx configuration

Ready for more projects:
/var/www/
├── sleazzy/              # Current project
├── project2/             # Future project
└── project3/             # Future project
```

---

## 🔄 Deployment Flow

1. **You push code to GitHub** → `git push origin main`
2. **GitHub webhook triggers** → POST to `http://YOUR_VPS_IP/webhook`
3. **Webhook server receives** → Verifies signature
4. **Deployment script runs** → `deploy.sh`
   - Pulls latest code
   - Installs dependencies
   - Builds project
   - Restarts PM2 processes
   - Reloads Nginx
5. **Application updated** → Available at `http://YOUR_VPS_IP/sleazzy`

---

## 🔒 Security Recommendations

### **Immediate Actions:**
1. ✅ Change the default VPS password:
   ```bash
   passwd
   ```

2. ✅ Set up SSH key authentication:
   ```bash
   # On your local machine
   ssh-keygen -t rsa -b 4096
   ssh-copy-id root@YOUR_VPS_IP
   ```

3. ✅ Disable password authentication (after setting up SSH keys):
   ```bash
   nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   systemctl restart sshd
   ```

### **Future Enhancements:**
- Set up SSL/TLS with Let's Encrypt (when you have a domain)
- Configure fail2ban for brute-force protection
- Set up automated backups
- Enable log rotation

---

## 📝 Adding More Projects

When you're ready to host another project:

1. Create new directory:
   ```bash
   mkdir -p /var/www/new-project
   cd /var/www/new-project
   git clone https://github.com/username/new-project.git .
   ```

2. Add Nginx location block in `/etc/nginx/sites-available/sleazzy`:
   ```nginx
   location /new-project {
       alias /var/www/new-project/dist;
       try_files $uri $uri/ /new-project/index.html;
   }
   ```

3. Add PM2 app to ecosystem.config.js

4. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   pm2 restart all
   ```

---

## 🎯 Current Status

✅ **VPS is clean and organized**  
✅ **Project deployed at** `/var/www/sleazzy`  
✅ **Application accessible at** http://YOUR_VPS_IP/sleazzy  
✅ **Auto-deployment configured**  
⚠️ **Action Required**: Configure environment variables  
⚠️ **Action Required**: Set up GitHub webhook  

---

## 📞 Support & Monitoring

### **Check if everything is running:**
```bash
pm2 status
sudo systemctl status nginx
```

### **Test the application:**
```bash
# Health check
curl http://YOUR_VPS_IP/sleazzy/health

# Webhook health check
curl http://localhost:9000/health
```

### **Common Issues:**

**App not loading?**
```bash
pm2 logs sleazzy-api
pm2 restart sleazzy-api
```

**Webhook not working?**
```bash
pm2 logs sleazzy-webhook
```

**Nginx errors?**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/sleazzy-error.log
```

---

## 🎉 You're All Set!

Your VPS is now:
- ✅ Clean and organized
- ✅ Running your application at `/sleazzy`
- ✅ Ready for automatic deployments
- ✅ Prepared for hosting multiple projects

**Next push to `main` branch will automatically deploy! 🚀**

---

For detailed documentation, see: `DEPLOYMENT.md`
