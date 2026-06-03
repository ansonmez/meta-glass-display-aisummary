const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 9090;
const TOKEN = process.env.TRANSLATION_TOKEN;
const MAX_MESSAGES = 50;

if (!TOKEN) {
  console.error('ERROR: TRANSLATION_TOKEN environment variable is not set.');
  console.error('Start the server with: TRANSLATION_TOKEN=your-secret node server.js');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.webmanifest': 'application/manifest+json',
};

const messages = [];

function validateToken(req) {
  const header = req.headers['x-token'] || req.headers['x-api-key'];
  if (header === TOKEN) return true;
  const match = req.url.match(/[?&]token=([^&]+)/);
  return match && match[1] === TOKEN;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token, X-Api-Key');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const urlPath = req.url.split('?')[0];

  // GET /api/config — returns token for browser
  if (req.method === 'GET' && urlPath === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token: TOKEN }));
    return;
  }

  // POST /api/message — receive from iOS app
  if (req.method === 'POST' && urlPath === '/api/message') {
    if (!validateToken(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    try {
      const body = await parseBody(req);
      if (!body.text) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing text field' }));
        return;
      }
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        text: body.text,
        type: body.type || 'translation',
        timestamp: Date.now(),
      };
      messages.push(message);
      if (messages.length > MAX_MESSAGES) messages.shift();
      console.log(`[${new Date().toISOString()}] Message: ${body.text.substring(0, 60)}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch(e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
    return;
  }

  // GET /api/messages — browser polls for new messages
  if (req.method === 'GET' && urlPath === '/api/messages') {
    if (!validateToken(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    const since = parseInt(req.url.match(/[?&]since=([^&]+)/)?.[1]) || 0;
    const newMessages = messages.filter(m => m.timestamp > since);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: newMessages }));
    return;
  }

  // GET /health
  if (req.method === 'GET' && urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', messageCount: messages.length }));
    return;
  }

  // Serve static files from public/
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const fullPath = path.join(__dirname, 'public', filePath);
  const ext = path.extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\nTranslation Display — local server`);
  console.log(`=====================================`);
  console.log(`Web app:  http://localhost:${PORT}/?token=${TOKEN}`);
  console.log(`Post msg: POST http://localhost:${PORT}/api/message?token=${TOKEN}`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`=====================================\n`);
});
