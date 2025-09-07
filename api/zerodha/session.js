import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Allow requests from your GitHub Pages domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { request_token } = req.body;
    
    if (!request_token) {
      return res.status(400).json({ error: 'Missing request_token' });
    }

    // Get API credentials from environment variables
    const API_KEY = process.env.ZERODHA_API_KEY;
    const API_SECRET = process.env.ZERODHA_API_SECRET;

    if (!API_KEY || !API_SECRET) {
      return res.status(500).json({ error: 'Missing API credentials' });
    }

    // Generate checksum: SHA256(api_key + request_token + api_secret)
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(API_KEY + request_token + API_SECRET);
    const checksum = hash.digest('hex');

    // Call Zerodha session API
    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_key: API_KEY,
        request_token,
        checksum,
      }),
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Session API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

