#!/bin/bash

# VPS Configuration Script
# This script connects to the VPS and runs the complete setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Details
VPS_IP="72.60.220.43"
VPS_USER="root"
VPS_PASSWORD="GDGisbest@2025"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  VPS Remote Setup Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

echo -e "${YELLOW}This script will:${NC}"
echo "1. Connect to VPS at ${VPS_IP}"
echo "2. Clean up old installations"
echo "3. Set up the project in /var/www/sleazzy"
echo "4. Configure automatic deployment"
echo ""

read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo -e "${GREEN}Starting VPS setup...${NC}"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}Installing sshpass for automated SSH...${NC}"
    
    # Detect OS and install sshpass
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y sshpass
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo -e "${RED}Please install sshpass manually${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}Connecting to VPS...${NC}"

# Create a temporary script file
TEMP_SCRIPT=$(mktemp)

cat > ${TEMP_SCRIPT} << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "🌐 Connected to VPS successfully!"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/var/www/sleazzy"
REPO_URL="https://github.com/ossdaiict/sleazzy.git"

# Step 1: Clean up
echo -e "${YELLOW}Step 1: Cleaning up old installations...${NC}"

if command -v pm2 &> /dev/null; then
    pm2 stop all || true
    pm2 delete all || true
fi

rm -rf /root/sleazzy || true
mkdir -p ${PROJECT_DIR}/logs

# Step 2: Update system
echo -e "${YELLOW}Step 2: Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Git
apt-get install -y git

# Nginx
apt-get install -y nginx

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
    env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
fi

# Step 4: Clone repository
echo -e "${YELLOW}Step 4: Cloning repository...${NC}"
if [ -d "${PROJECT_DIR}/.git" ]; then
    cd ${PROJECT_DIR}
    git pull origin main
else
    git clone ${REPO_URL} ${PROJECT_DIR}
    cd ${PROJECT_DIR}
fi

# Step 5: Create .env files
echo -e "${YELLOW}Step 5: Creating environment files...${NC}"

if [ ! -f "${PROJECT_DIR}/server/.env" ]; then
    cat > ${PROJECT_DIR}/server/.env << 'EOL'
NODE_ENV=production
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=change_this_jwt_secret_in_production
EOL
    echo -e "${RED}⚠️  Edit ${PROJECT_DIR}/server/.env with actual credentials!${NC}"
fi

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "export WEBHOOK_SECRET='${WEBHOOK_SECRET}'" >> /root/.bashrc
export WEBHOOK_SECRET="${WEBHOOK_SECRET}"

# Step 6: Build project
echo -e "${YELLOW}Step 6: Building project...${NC}"

cd ${PROJECT_DIR}/server
npm install
npm run build

cd ${PROJECT_DIR}/client
npm install
npm run build

# Step 7: Configure Nginx
echo -e "${YELLOW}Step 7: Configuring Nginx...${NC}"

cp ${PROJECT_DIR}/nginx.conf /etc/nginx/sites-available/sleazzy
ln -sf /etc/nginx/sites-available/sleazzy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# Step 8: Start PM2
echo -e "${YELLOW}Step 8: Starting PM2 processes...${NC}"

cd ${PROJECT_DIR}
pm2 start ecosystem.config.js
pm2 save

# Step 9: Firewall
echo -e "${YELLOW}Step 9: Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
fi

# Final output
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Webhook Secret (save this for GitHub):${NC}"
echo -e "${GREEN}${WEBHOOK_SECRET}${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Edit environment: nano ${PROJECT_DIR}/server/.env"
echo "2. Add GitHub webhook at:"
echo "   https://github.com/ossdaiict/sleazzy/settings/hooks"
echo "   Payload URL: http://72.60.220.43/webhook"
echo "   Secret: ${WEBHOOK_SECRET}"
echo ""
echo -e "${GREEN}Application URL: http://72.60.220.43/sleazzy${NC}"
echo ""
echo "PM2 Status:"
pm2 status
echo ""

EOFSCRIPT

# Copy and execute script on VPS
echo -e "${YELLOW}Uploading and executing setup script on VPS...${NC}"
echo ""

sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} 'bash -s' < ${TEMP_SCRIPT}

# Clean up
rm ${TEMP_SCRIPT}

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  VPS Setup Completed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}To access your VPS:${NC}"
echo "ssh ${VPS_USER}@${VPS_IP}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "pm2 status              # Check processes"
echo "pm2 logs                # View logs"
echo "pm2 restart all         # Restart all"
echo ""
