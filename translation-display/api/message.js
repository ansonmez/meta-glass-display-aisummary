const { kv } = require('@vercel/kv');

const TOKEN = process.env.TRANSLATION_TOKEN;
const MAX_MESSAGES = 50;
const KV_KEY = 'messages';

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

  await kv.zadd(KV_KEY, { score: message.timestamp, member: JSON.stringify(message) });
  await kv.zremrangebyrank(KV_KEY, 0, -(MAX_MESSAGES + 1));

  return res.status(200).json({ success: true });
};
