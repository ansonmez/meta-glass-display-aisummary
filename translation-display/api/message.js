const { put, head, del } = require('@vercel/blob');

const TOKEN = process.env.TRANSLATION_TOKEN;
const MAX_MESSAGES = 50;
const BLOB_PATH = 'messages.json';

async function readMessages() {
  try {
    const result = await head(BLOB_PATH);
    const res = await fetch(result.url);
    return await res.json();
  } catch (e) {
    return [];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-token'] || req.headers['x-api-key'] || req.query.token;
  if (!TOKEN || token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const { text, type } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text field' });

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    text,
    type: type || 'translation',
    timestamp: Date.now(),
  };

  const messages = await readMessages();
  messages.push(message);
  if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);

  await put(BLOB_PATH, JSON.stringify(messages), { access: 'public', addRandomSuffix: false });

  return res.status(200).json({ success: true });
};
