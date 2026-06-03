const { kv } = require('@vercel/kv');

const TOKEN = process.env.TRANSLATION_TOKEN;
const KV_KEY = 'messages';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-token'] || req.query.token;
  if (!TOKEN || token !== TOKEN) return res.status(403).json({ error: 'Forbidden' });

  const since = parseInt(req.query.since) || 0;
  const raw = await kv.zrangebyscore(KV_KEY, since + 1, '+inf');
  const messages = raw.map(m => (typeof m === 'string' ? JSON.parse(m) : m));

  return res.status(200).json({ messages });
};
