import { URLSearchParams } from 'url';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pradeepkumarv.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { step, username, password, otp, api_key, api_secret, token_id } = req.body;

  if (!api_key || !api_secret) {
    return res.status(400).json({ error: 'API key and secret are required' });
  }

  try {
    if (step === 'initiate') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const loginPayload = {
        userId: username,
        password,
      };

      const loginResponse = await fetch('https://developer.hdfcsec.com/ir-api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': api_key,
          'x-api-secret': api_secret,
          'User-Agent': 'YourAppName/1.0',
        },
        body: JSON.stringify(loginPayload),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok || loginData.status === 'failure') {
        return res.status(400).json({ error: loginData.message || 'Login failed', details: loginData });
      }

      if (loginData.token_id) {
        return res.status(200).json({ token_id: loginData.token_id, message: 'OTP sent' });
      } else if (loginData.access_token) {
        return res.status(200).json({ access_token: loginData.access_token });
      }

      return res.status(400).json({ error: 'Unexpected login response', details: loginData });

    } else if (step === 'verify') {
      if (!otp || !token_id) {
        return res.status(400).json({ error: 'OTP and token_id are required' });
      }

      const params = new URLSearchParams({ api_key, token_id });

      const verifyResponse = await fetch(`https://developer.hdfcsec.com/ir-api/auth/validate?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'YourAppName/1.0',
        },
        body: JSON.stringify({ answer: otp }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || verifyData.status === 'failure') {
        return res.status(400).json({ error: verifyData.message || 'OTP validation failed', details: verifyData });
      }

      if (verifyData.access_token) {
        return res.status(200).json({ access_token: verifyData.access_token });
      }

      return res.status(400).json({ error: 'Unexpected OTP validation response', details: verifyData });
    } else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }
  } catch (error) {
    console.error('HDFC API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
