// api/hdfc/callback.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  const clientId = process.env.HDFC_CLIENT_ID;
  const clientSecret = process.env.HDFC_CLIENT_SECRET;
  const redirectUri = process.env.HDFC_REDIRECT_URI;

  try {
    const tokenResp = await fetch('https://developer.hdfcsec.com/ir-api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResp.json();
    if (!tokenResp.ok) {
      return res
        .status(tokenResp.status)
        .json({ error: tokenData.error || tokenData.message || 'Token exchange failed' });
    }

    // Return access_token and refresh_token if needed
    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (e) {
    console.error('Callback error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
