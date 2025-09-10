import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse request body
    let body = req.body;
    if (!body) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      body = JSON.parse(Buffer.concat(buffers).toString());
    }
    if (typeof body === 'string') body = JSON.parse(body);

    const { access_token, api_key } = body;
    if (!access_token || !api_key) {
      return res.status(400).json({ error: 'Missing access_token or api_key' });
    }

    // ---- CHANGE THIS LINE FOR MF HOLDINGS ----
    // Zerodha MF endpoint: https://api.kite.trade/mf/holdings
    const response = await fetch('https://api.kite.trade/mf/holdings', {
      method: 'GET',
      headers: {
        'Authorization': `token ${api_key}:${access_token}`,
        'X-Kite-Version': '3',
      },
    });

    // Defensive parse of Zerodha API response
    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      data = { error: 'Invalid JSON from Zerodha', raw: responseBody };
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
