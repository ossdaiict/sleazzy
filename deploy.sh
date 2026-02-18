#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
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
pm2 restart sleazzy-api || pm2 start ecosystem.config.js

# Reload Nginx to ensure latest config
echo "🔄 Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Application available at: http://72.60.220.43/sleazzy"
