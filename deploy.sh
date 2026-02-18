#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production
npm run build
cd ..

# Install client dependencies and build
echo "📦 Installing client dependencies and building..."
cd client
npm install
npm run build
cd ..

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 restart ecosystem.config.js --update-env

# Reload Nginx to ensure latest config
echo "🔄 Reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Application available at: http://72.60.220.43/sleazzy"
