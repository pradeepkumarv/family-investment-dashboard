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
    let body = req.body;
    if (!body) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      body = JSON.parse(Buffer.concat(buffers).toString());
    }
    if (typeof body === 'string') body = JSON.parse(body);

    const { access_token, api_key, type } = body;
    if (!access_token || !api_key) {
      return res.status(400).json({ error: 'Missing access_token or api_key' });
    }

    // HDFC Securities URLs
    let url = '';
    if (type === 'equity') {
      url = 'https://api.investright.hdfcsec.com/oapi/v1/holdings/equity'; // Example, please validate actual endpoint
    } else if (type === 'mf') {
      url = 'https://api.investright.hdfcsec.com/oapi/v1/holdings/mf'; // Example MF endpoint
    } else {
      return res.status(400).json({ error: 'Invalid type parameter, must be equity or mf' });
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'x-api-key': api_key,
        'Content-Type': 'application/json',
      },
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      data = { error: 'Invalid JSON from HDFC Securities', raw: responseBody };
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
