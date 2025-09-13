import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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

  const { step, username, password, otp, api_key, api_secret, token_id } = req.body || {};
  if (!api_key || !api_secret) {
    return res.status(400).json({ error: 'Missing API credentials' });
  }

  try {
    if (step === 'initiate') {
      // Step 1: Initiate login
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
      }

      console.log('Initiating HDFC login...');
      const loginResponse = await fetch(
        'https://api.hdfcsec.com/Token/api/authenticate/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'FamilyDashboard/1.0'
          },
          body: JSON.stringify({ api_key, api_secret, username, password }),
          agent: httpsAgent
        }
      );

      const loginText = await loginResponse.text();
      console.log('Login Response:', loginText);

      if (!loginText.trim()) {
        return res.status(400).json({
          error: 'Empty response from HDFC API',
          details: `Status: ${loginResponse.status}`
        });
      }

      let loginData;
      try {
        loginData = JSON.parse(loginText);
      } catch (e) {
        return res.status(500).json({
          error: 'Invalid JSON response from HDFC API',
          details: loginText.substring(0, 500)
        });
      }

      if (loginResponse.ok && loginData.status === 'success') {
        if (loginData.data?.request_token) {
          return res.status(200).json({
            token_id: loginData.data.request_token,
            message: 'OTP sent to registered mobile/email'
          });
        } else if (loginData.data?.access_token) {
          return res.status(200).json({
            access_token: loginData.data.access_token,
            user_info: loginData.data.user_info || {}
          });
        }
      }
      return res.status(loginResponse.status).json({
        error: loginData.error || loginData.message || 'Login failed',
        details: loginData
      });
    }
    else if (step === 'verify') {
      // Step 2: Verify OTP
      if (!otp || !token_id) {
        return res.status(400).json({ error: 'Missing OTP or token_id' });
      }

      console.log('Validating HDFC OTP...');
      const otpUrl = `https://api.hdfcsec.com/Token/api/authenticate/validate?api_key=${encodeURIComponent(api_key)}&token_id=${encodeURIComponent(token_id)}`;
      const otpResponse = await fetch(otpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FamilyDashboard/1.0'
        },
        body: JSON.stringify({ answer: otp }),
        agent: httpsAgent
      });

      const otpText = await otpResponse.text();
      console.log('OTP Response:', otpText);

      if (!otpText.trim()) {
        return res.status(400).json({
          error: 'Empty OTP response from HDFC API',
          details: `Status: ${otpResponse.status}`
        });
      }

      let otpData;
      try {
        otpData = JSON.parse(otpText);
      } catch (e) {
        return res.status(500).json({
          error: 'Invalid JSON response from OTP API',
          details: otpText.substring(0, 500)
        });
      }

      if (otpResponse.ok && otpData.status === 'success') {
        if (otpData.data?.access_token) {
          return res.status(200).json({
            access_token: otpData.data.access_token,
            user_info: otpData.data.user_info || {}
          });
        }
        // Exchange request_token for access_token
        if (otpData.data?.request_token) {
          const tokenExchange = await fetch(
            'https://api.hdfcsec.com/Token/api/authenticate/validatetoken',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                api_key,
                api_secret,
                request_token: otpData.data.request_token
              }),
              agent: httpsAgent
            }
          );
          const exchangeData = await tokenExchange.json();
          if (tokenExchange.ok && exchangeData.status === 'success' && exchangeData.data?.access_token) {
            return res.status(200).json({
              access_token: exchangeData.data.access_token,
              user_info: exchangeData.data.user_info || {}
            });
          }
        }
      }

      return res.status(otpResponse.status).json({
        error: otpData.error || otpData.message || 'OTP validation failed',
        details: otpData
      });
    }
    else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }
  }
  catch (error) {
    console.error('HDFC Session Error:', error);
    return res.status(500).json({
      error: 'Network or server error',
      details: error.message
    });
  }
}
