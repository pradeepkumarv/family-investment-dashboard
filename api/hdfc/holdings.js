export default async function handler(req, res) {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token, api_key, type } = req.body || {};
  if (!access_token || !api_key) {
    return res.status(400).json({ error: 'Missing access_token or api_key' });
  }

  try {
    let endpoint = 'https://api.hdfcsec.com/Token/api/portfolio/GetHoldings';
    if (type === 'mf' || type === 'mutualfunds') {
      endpoint = 'https://api.hdfcsec.com/Token/api/portfolio/holdings/mf';
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': access_token,
        'X-API-Key': api_key,
        'User-Agent': 'FamilyDashboard/1.0'
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid response from HDFC holdings API',
        details: text.substring(0, 500)
      });
    }

    if (response.ok) {
      return res.status(200).json({ status: 'success', data: data.data || data });
    } else {
      return res.status(response.status).json({
        error: data.error || data.message || 'Failed to fetch holdings',
        details: data
      });
    }
  }
  catch (error) {
    console.error('HDFC Holdings Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
