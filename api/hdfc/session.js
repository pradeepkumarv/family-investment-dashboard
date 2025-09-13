export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, username, password, otp, api_key, api_secret, token_id } = req.body || {};
  
  if (!api_key || !api_secret) {
    return res.status(400).json({ error: 'Missing API key or secret' });
  }

  try {
    if (step === 'initiate') {
      // Step 1: Login to get token_id for OTP
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
      }

      const response = await fetch('https://developer.hdfcsec.com/ir-api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': api_key,
          'x-api-secret': api_secret,
          'User-Agent': 'FamilyDashboard/1.0'
        },
        body: JSON.stringify({
          userId: username,
          password: password
        })
      });

      const data = await response.json();
      console.log('HDFC Login Response:', data);

      if (response.ok && data.token_id) {
        return res.status(200).json({ 
          token_id: data.token_id, 
          message: 'OTP sent to your registered mobile/email' 
        });
      } else if (response.ok && data.access_token) {
        return res.status(200).json({ 
          access_token: data.access_token,
          user_info: data.user_info || {}
        });
      }

      return res.status(400).json({ 
        error: data.error || data.message || 'Login failed',
        details: data
      });

    } else if (step === 'verify') {
      // Step 2: Validate OTP
      if (!otp || !token_id) {
        return res.status(400).json({ error: 'Missing OTP or token_id' });
      }

      const params = new URLSearchParams({ api_key, token_id });
      const response = await fetch(`https://developer.hdfcsec.com/ir-api/auth/validate?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FamilyDashboard/1.0'
        },
        body: JSON.stringify({ answer: otp })
      });

      const data = await response.json();
      console.log('HDFC OTP Response:', data);

      if (response.ok && data.access_token) {
        return res.status(200).json({ 
          access_token: data.access_token,
          user_info: data.user_info || {}
        });
      }

      return res.status(400).json({ 
        error: data.error || data.message || 'OTP validation failed',
        details: data
      });

    } else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }
  } catch (error) {
    console.error('HDFC API Error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
