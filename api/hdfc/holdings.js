// api/hdfc/holdings.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token } = req.body || {};
  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  try {
    const resp = await fetch('https://developer.hdfcsec.com/ir-api/portfolio/holdings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`,
        'X-API-Key': process.env.HDFC_CLIENT_ID
      }
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data.error || data.message || 'Fetch failed' });
    }

    // Return holdings array
    return res.status(200).json({ data: data.holdings || data.data || data });
  } catch (e) {
    console.error('Holdings error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
