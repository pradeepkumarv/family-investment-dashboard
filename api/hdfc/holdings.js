// api/hdfc/holdings.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { access_token, api_key } = req.body || {};
  if (!access_token || !api_key) return res.status(400).json({ error: 'Missing access_token or api_key' });

  try {
    const url = 'https://developer.hdfcsec.com/oapi/v1/holdings';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Family-Investment-Dashboard/1.0 (+https://your-app.example)',
        'Authorization': `Bearer ${access_token}`,
        'X-API-Key': api_key
      },
      body: JSON.stringify({ api_key }) // keep body as documented
    });

    const text = await resp.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) {
      return res.status(500).json({ status: 'error', error: 'Invalid JSON from holdings endpoint', details: text.substring(0, 1000) });
    }

    if (resp.ok) {
      // defensive: holdings might be in data.data or data.holdings etc
      const payload = data.data || data.holdings || data;
      return res.status(200).json({ status: 'success', data: payload });
    } else {
      return res.status(resp.status).json({ status: 'error', error: data.error || data.message || 'Failed to fetch holdings', details: data });
    }
  } catch (err) {
    console.error('Holdings API error:', err);
    return res.status(500).json({ status: 'error', error: 'Internal server error', details: err.message });
  }
}
