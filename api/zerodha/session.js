import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers on all responses to allow your frontend domain (or use '*' for testing)
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { request_token } = req.body;
    if (!request_token) {
      return res.status(400).json({ error: 'Missing request_token' });
    }

    const API_KEY = process.env.ZERODHA_API_KEY;
    const API_SECRET = process.env.ZERODHA_API_SECRET;
    if (!API_KEY || !API_SECRET) {
      return res.status(500).json({ error: 'Missing API credentials in environment' });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(API_KEY + request_token + API_SECRET);
    const checksum = hash.digest('hex');

    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_key: API_KEY,
        request_token,
        checksum
      }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Session API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
