# Security Guidelines

## ⚠️ CRITICAL: Never Commit Credentials

**NEVER commit the following to Git:**
- VPS passwords
- API keys
- Database credentials
- Webhook secrets
- Private keys
- Any sensitive configuration

## 🔒 How to Use VPS Setup Scripts Securely

### Method 1: Environment Variables (Recommended)
```bash
# Set environment variables in your terminal
export VPS_IP='your.vps.ip'
export VPS_USER='root'
export VPS_PASSWORD='your_password'

# Run the setup script
bash setup-vps.sh
```

### Method 2: Create Local Config (Not tracked by Git)
```bash
# Create a local config file (already in .gitignore)
cp .env.vps.example .env.vps
nano .env.vps  # Edit with your actual credentials

# Source it before running
source .env.vps
bash setup-vps.sh
```

### Method 3: SSH Directly (Most Secure)
```bash
# Copy the vps-setup.sh to your server
scp vps-setup.sh root@your.vps.ip:/tmp/

# SSH into your server and run it
ssh root@your.vps.ip
bash /tmp/vps-setup.sh
```

## 🛡️ Security Best Practices

1. **Change Default Passwords Immediately**
   ```bash
   ssh root@your.vps.ip
   passwd
   ```

2. **Use SSH Keys Instead of Passwords**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ssh-copy-id root@your.vps.ip
   ```

3. **Disable Password Authentication**
   ```bash
   # On VPS:
   nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   systemctl restart sshd
   ```

4. **Keep Webhook Secrets Secure**
   - The webhook secret is auto-generated on VPS
   - Find it with: `ssh root@your.vps.ip 'grep WEBHOOK_SECRET /root/.bashrc'`
   - Add it to GitHub webhook settings manually

5. **Rotate Credentials Regularly**
   - Change passwords every 90 days
   - Rotate API keys and tokens
   - Update webhook secrets if compromised

## 🚨 If Credentials Are Compromised

1. **Immediately change all passwords**
2. **Rotate all API keys and tokens**
3. **Check server logs for unauthorized access**
4. **Consider rebuilding the VPS if severely compromised**

## 📝 Files That Should NEVER Be Committed

Already in `.gitignore`:
- `.env`
- `.env.local`
- `.env.production`
- `.env.vps`
- `*.pem`
- `*.key`
- Any file with credentials

## ✅ Safe to Commit

- Configuration templates (`.example` files)
- Documentation
- Scripts with placeholder values
- nginx.conf with `YOUR_VPS_IP` placeholders
