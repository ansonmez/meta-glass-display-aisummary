module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.TRANSLATION_TOKEN) {
    return res.status(503).json({ error: 'TRANSLATION_TOKEN not configured' });
  }

  return res.status(200).json({ token: process.env.TRANSLATION_TOKEN });
};
