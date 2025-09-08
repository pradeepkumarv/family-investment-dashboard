import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // ... (rest of your logic)
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

{
  "functions": {
    "api/zerodha/session.js": {
      "maxDuration": 10
    },
    "api/zerodha/holdings.js": {
      "maxDuration": 10
    }
  }
}
