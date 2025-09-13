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
  console.log(`Username: ${username}`);
  console.log(`API Key: ${api_key}`);

  try {
    if (step === 'initiate') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
      }

      console.log('Making request to HDFC login endpoint...');
      
      // Try the correct HDFC endpoint based on their documentation
      const loginResponse = await fetch('https://developer.hdfcsec.com/ir-api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; FamilyDashboard/1.0)',
          'X-API-Key': api_key,
          'X-API-Secret': api_secret
        },
        body: JSON.stringify({
          userId: username,
          password: password
        })
      });

      console.log(`HDFC Response Status: ${loginResponse.status}`);
      console.log(`HDFC Response Headers:`, Object.fromEntries(loginResponse.headers));
      
      const loginText = await loginResponse.text();
      console.log(`HDFC Response Body (first 1000 chars):`, loginText.substring(0, 1000));
      
      // Return debug information to frontend
      return res.status(200).json({
        debug: true,
        status: loginResponse.status,
        headers: Object.fromEntries(loginResponse.headers),
        body: loginText,
        bodyLength: loginText.length,
        isJSON: loginText.trim().startsWith('{') || loginText.trim().startsWith('[')
      });

    } else if (step === 'verify') {
      // For now, just return debug info for verify step too
      return res.status(200).json({
        debug: true,
        message: 'Verify step - not implemented yet in debug mode'
      });

    } else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
    }

  } catch (error) {
    console.error('HDFC Session Error:', error);
    return res.status(500).json({
      error: 'Network or server error',
      details: error.message,
      stack: error.stack
    });
  }
}
