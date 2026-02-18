#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  VPS Setup & Deployment Script${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# Variables
PROJECT_NAME="sleazzy"
PROJECT_DIR="/var/www/${PROJECT_NAME}"
REPO_URL="https://github.com/ossdaiict/sleazzy.git"
NODE_VERSION="20"

# Step 1: Clean up old installations
echo -e "${YELLOW}Step 1: Cleaning up old installations...${NC}"

# Stop PM2 processes if they exist
if command -v pm2 &> /dev/null; then
    echo "Stopping PM2 processes..."
    pm2 stop all || true
    pm2 delete all || true
fi

# Remove old project directory if it exists
if [ -d "/root/sleazzy" ]; then
    echo "Removing old /root/sleazzy directory..."
    rm -rf /root/sleazzy
fi

# Create project directory structure
echo "Creating project directory at ${PROJECT_DIR}..."
mkdir -p ${PROJECT_DIR}
mkdir -p ${PROJECT_DIR}/logs

# Step 2: Update system packages
echo -e "${YELLOW}Step 2: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Step 3: Install required packages
echo -e "${YELLOW}Step 3: Installing required packages...${NC}"

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Install Git
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt-get install -y git
else
    echo "Git already installed: $(git --version)"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
else
    echo "Nginx already installed: $(nginx -v 2>&1)"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
else
    echo "PM2 already installed: $(pm2 --version)"
fi

# Step 4: Clone the repository
echo -e "${YELLOW}Step 4: Cloning repository...${NC}"
cd ${PROJECT_DIR}

if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository from ${REPO_URL}..."
    git clone ${REPO_URL} .
fi

# Step 5: Set up environment variables
echo -e "${YELLOW}Step 5: Setting up environment variables...${NC}"

# Create server .env file if it doesn't exist
if [ ! -f "${PROJECT_DIR}/server/.env" ]; then
    echo "Creating server/.env file..."
    cat > ${PROJECT_DIR}/server/.env << 'EOL'
# Server Configuration
NODE_ENV=production
PORT=4000

# Supabase Configuration (REPLACE WITH YOUR VALUES)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email Configuration (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EOL
    echo -e "${RED}⚠️  IMPORTANT: Edit ${PROJECT_DIR}/server/.env with your actual credentials!${NC}"
else
    echo "server/.env already exists, skipping..."
fi

# Create webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "export WEBHOOK_SECRET='${WEBHOOK_SECRET}'" >> /root/.bashrc
export WEBHOOK_SECRET="${WEBHOOK_SECRET}"

echo -e "${GREEN}Webhook secret generated and saved to /root/.bashrc${NC}"
echo -e "${YELLOW}Copy this webhook secret for GitHub webhook configuration:${NC}"
echo -e "${GREEN}${WEBHOOK_SECRET}${NC}"

# Step 6: Install dependencies and build
echo -e "${YELLOW}Step 6: Installing dependencies and building...${NC}"

# Install server dependencies
echo "Installing server dependencies..."
cd ${PROJECT_DIR}/server
npm install --production
npm run build

# Install client dependencies and build
echo "Installing client dependencies..."
cd ${PROJECT_DIR}/client
npm install
npm run build

# Step 7: Configure Nginx
echo -e "${YELLOW}Step 7: Configuring Nginx...${NC}"

# Backup existing nginx config if it exists
if [ -f "/etc/nginx/sites-available/sleazzy" ]; then
    echo "Backing up existing Nginx config..."
    mv /etc/nginx/sites-available/sleazzy /etc/nginx/sites-available/sleazzy.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy nginx config
echo "Copying Nginx configuration..."
cp ${PROJECT_DIR}/nginx.conf /etc/nginx/sites-available/sleazzy

# Enable site
if [ ! -L "/etc/nginx/sites-enabled/sleazzy" ]; then
    ln -s /etc/nginx/sites-available/sleazzy /etc/nginx/sites-enabled/
fi

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test and reload Nginx
echo "Testing Nginx configuration..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx
systemctl enable nginx

# Step 8: Start PM2 processes
echo -e "${YELLOW}Step 8: Starting PM2 processes...${NC}"

cd ${PROJECT_DIR}
pm2 start ecosystem.config.js
pm2 save

# Step 9: Configure firewall
echo -e "${YELLOW}Step 9: Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    echo "y" | ufw enable || true
else
    echo "UFW not installed, skipping firewall configuration..."
fi

# Step 10: Final checks
echo -e "${YELLOW}Step 10: Running final checks...${NC}"

echo "PM2 Status:"
pm2 status

echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Setup completed successfully! ${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Edit ${PROJECT_DIR}/server/.env with your actual credentials"
echo "2. Configure GitHub webhook:"
echo "   - Go to: https://github.com/ossdaiict/sleazzy/settings/hooks"
echo "   - Payload URL: http://72.60.220.43/webhook"
echo "   - Content type: application/json"
echo "   - Secret: ${WEBHOOK_SECRET}"
echo "   - Events: Just the push event"
echo "3. Restart the server: pm2 restart all"
echo ""
echo -e "${GREEN}🌐 Your application is available at:${NC}"
echo "   http://72.60.220.43/sleazzy"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "   pm2 status          - Check PM2 processes"
echo "   pm2 logs            - View all logs"
echo "   pm2 logs sleazzy-api      - View API logs"
echo "   pm2 logs sleazzy-webhook  - View webhook logs"
echo "   pm2 restart all     - Restart all processes"
echo "   nginx -t            - Test Nginx config"
echo "   systemctl status nginx    - Check Nginx status"
echo ""
