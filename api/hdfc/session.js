export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, username, password, otp, api_key, api_secret, token_id } = req.body || {};
  
  if (!api_key || !api_secret) {
    return res.status(400).json({ error: 'Missing API credentials' });
  }

  console.log(`HDFC Session Step: ${step}`);

  try {
    if (step === 'initiate') {
      // Step 1: Login to get token_id for OTP
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
      }

      console.log('Initiating HDFC login...');
      
      const loginResponse = await fetch('https://developer.hdfcsec.com/oapi/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FamilyDashboard/1.0'
        },
        body: JSON.stringify({
          api_key: api_key,
          api_secret: api_secret,
          username: username,
          password: password
        })
      });

      const loginText = await loginResponse.text();
      console.log('HDFC Login Response:', loginText);
      
      let loginData;
      try {
        loginData = JSON.parse(loginText);
      } catch (e) {
        return res.status(500).json({
          error: 'Invalid response from HDFC API',
          details: loginText.substring(0, 500)
        });
      }

      if (loginResponse.ok) {
        if (loginData.status === 'success' && loginData.data) {
          if (loginData.data.request_token) {
            return res.status(200).json({
              token_id: loginData.data.request_token,
              message: 'OTP sent to registered mobile/email'
            });
          } else if (loginData.data.access_token) {
            return res.status(200).json({
              access_token: loginData.data.access_token,
              user_info: loginData.data.user_info || {}
            });
          }
        }
      }

      return res.status(400).json({
        error: loginData.error || loginData.message || 'Login failed',
        details: loginData
      });

    } else if (step === 'verify') {
      // Step 2: Validate OTP
      if (!otp || !token_id) {
        return res.status(400).json({ error: 'Missing OTP or token_id' });
      }

      console.log('Validating HDFC OTP...');

      const otpResponse = await fetch(`https://developer.hdfcsec.com/oapi/v1/twofa/validate?api_key=${api_key}&token_id=${token_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FamilyDashboard/1.0'
        },
        body: JSON.stringify({
          answer: otp
        })
      });

      const otpText = await otpResponse.text();
      console.log('HDFC OTP Response:', otpText);
      
      let otpData;
      try {
        otpData = JSON.parse(otpText);
      } catch (e) {
        return res.status(500).json({
          error: 'Invalid OTP response from HDFC API',
          details: otpText.substring(0, 500)
        });
      }

      if (otpResponse.ok && otpData.status === 'success' && otpData.data) {
        if (otpData.data.access_token) {
          return res.status(200).json({
            access_token: otpData.data.access_token,
            user_info: otpData.data.user_info || {}
          });
        } else if (otpData.data.request_token) {
          // Need to exchange request_token for access_token
          const tokenResponse = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              api_key: api_key,
              api_secret: api_secret,
              request_token: otpData.data.request_token
            })
          });

          const tokenData = await tokenResponse.json();
          if (tokenResponse.ok && tokenData.status === 'success' && tokenData.data.access_token) {
            return res.status(200).json({
              access_token: tokenData.data.access_token,
              user_info: tokenData.data.user_info || {}
            });
          }
        }
      }

      return res.status(400).json({
        error: otpData.error || otpData.message || 'OTP validation failed',
        details: otpData
      });

    } else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }

  } catch (error) {
    console.error('HDFC Session Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
