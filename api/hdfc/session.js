// api/hdfc/session.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, username, password, otp, api_key, api_secret, token_id } = req.body || {};
  if (!api_key || !api_secret) return res.status(400).json({ error: 'Missing API key or secret' });

  try {
    if (step === 'initiate') {
      // Step 1: Login to get tokenId for OTP
      if (!username || !password)
        return res.status(400).json({ error: 'Missing username or password' });

      const resp = await fetch('https://api.hdfcsec.com/Token/api/authenticate/Login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api_key,
          'x-api-secret': api_secret
        },
        body: JSON.stringify({ userId: username, password })
      });
      const data = await resp.json();
      if (resp.ok && data.tokenId) {
        return res.status(200).json({ token_id: data.tokenId, message: 'OTP sent' });
      }
      if (resp.ok && data.accessToken) {
        return res.status(200).json({ access_token: data.accessToken });
      }
      return res.status(resp.status).json({ error: data.error || 'Login failed', details: data });

    } else if (step === 'verify') {
      // Step 2: OTP validation
      if (!otp || !token_id) return res.status(400).json({ error: 'Missing OTP or token_id' });

      const resp = await fetch('https://api.hdfcsec.com/Token/api/authenticate/ValidateToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api_key,
          'x-api-secret': api_secret
        },
        body: JSON.stringify({ tokenId: token_id, otp })
      });
      const data = await resp.json();
      if (resp.ok && data.accessToken) {
        return res.status(200).json({ access_token: data.accessToken });
      }
      return res.status(resp.status).json({ error: data.error || 'OTP validation failed', details: data });

    } else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
