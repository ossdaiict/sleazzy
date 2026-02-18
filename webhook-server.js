const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const PROJECT_PATH = '/var/www/sleazzy';
const LOG_FILE = '/var/www/sleazzy/logs/webhook.log';

// Load webhook secret from environment
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  
  // Ensure log directory exists
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(LOG_FILE, logMessage);
}

function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) {
    log('WARNING: No webhook secret configured, skipping verification');
    return true;
  }
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function deploy() {
  log('Starting deployment...');
  
  try {
    // Run deployment script
    const output = execSync(`cd ${PROJECT_PATH} && bash deploy.sh`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    log('Deployment output:\n' + output);
    log('Deployment completed successfully');
    return true;
  } catch (error) {
    log('Deployment failed: ' + error.message);
    if (error.stdout) log('stdout: ' + error.stdout);
    if (error.stderr) log('stderr: ' + error.stderr);
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const signature = req.headers['x-hub-signature-256'];
        
        // Verify signature if secret is configured
        if (WEBHOOK_SECRET && signature) {
          if (!verifySignature(body, signature)) {
            log('Invalid signature received');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid signature' }));
            return;
          }
        }
        
        const payload = JSON.parse(body);
        
        // Only deploy on push to main branch
        if (payload.ref === 'refs/heads/main') {
          log(`Received push to main branch from ${payload.pusher?.name || 'unknown'}`);
          log(`Commit: ${payload.head_commit?.message || 'N/A'}`);
          
          const success = deploy();
          
          res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: success ? 'success' : 'failed',
            message: success ? 'Deployment triggered' : 'Deployment failed'
          }));
        } else {
          log(`Ignoring push to ${payload.ref}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ignored', message: 'Not main branch' }));
        }
      } catch (error) {
        log('Error processing webhook: ' + error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Webhook server is running' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  log(`Webhook server listening on port ${PORT}`);
  log(`Project path: ${PROJECT_PATH}`);
  log(`Webhook secret configured: ${!!WEBHOOK_SECRET}`);
});

server.on('error', (error) => {
  log('Server error: ' + error.message);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});
