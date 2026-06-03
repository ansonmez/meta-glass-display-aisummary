const { head } = require('@vercel/blob');

const TOKEN = process.env.TRANSLATION_TOKEN;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-token'] || req.query.token;
  if (!TOKEN || token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const since = parseInt(req.query.since) || 0;
  const messages = await readMessages();
  const filtered = messages.filter(m => m.timestamp > since);

  return res.status(200).json({ messages: filtered });
};
