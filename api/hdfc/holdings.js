export default async function handler(req, res) {
   res.setHeader('Access-Control-Allow-Origin', 'https://pradeepkumarv.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  //... rest of handler
}

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { access_token, api_key } = req.body;

  if (!access_token || !api_key) {
    return res.status(400).json({ error: 'Missing access_token or api_key' });
  }

  try {
    const holdingsResponse = await fetch('https://developer.hdfcsec.com/ir-api/portfolio/holdings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`,
        'X-API-Key': api_key,
        'User-Agent': 'YourAppName/1.0',
      },
    });

    const data = await holdingsResponse.json();

    if (!holdingsResponse.ok) {
      return res.status(holdingsResponse.status).json({ error: data.message || 'Failed to fetch holdings' });
    }

    return res.status(200).json({ holdings: data.holdings || data });

  } catch (error) {
    console.error('Fetch holdings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
