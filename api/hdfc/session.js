export default async function handler(req, res) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // --- Input ---
    const { step, username, password, otp, api_key, api_secret, request_token } = req.body;
    if (!api_key || !api_secret) return res.status(400).json({ error: 'Missing API key or secret' });

    try {
        if (step === 'initiate') {
            // Step 1: Login with credentials
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }
            
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: api_key,
                    api_secret: api_secret,
                    username: username,
                    password: password
                })
            });

            const text = await response.text();
            console.log('HDFC Raw Response:', text);
            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries(response.headers));

            let data = {};
            try { 
                data = JSON.parse(text); 
            } catch (e) { 
                console.error('Failed to parse HDFC response:', text);
                return res.status(500).json({ error: 'Invalid response from HDFC API' });
            }
            
            console.log('HDFC Parsed Response:', data);

            if (response.ok) {
                if (data.status === 'success' && data.data && data.data.request_token) {
                    // OTP required
                    return res.status(200).json({ 
                        otpRequired: true, 
                        request_token: data.data.request_token 
                    });
                } else if (data.status === 'success' && data.data && data.data.access_token) {
                    // Direct login success
                    return res.status(200).json({ 
                        access_token: data.data.access_token, 
                        user_info: data.data.user_info || {} 
                    });
                } else {
                    return res.status(400).json({ error: data.error || data.message || 'Unexpected response format' });
                }
            } else {
                return res.status(400).json({ error: data.error || data.message || 'Login failed' });
            }

        } else if (step === 'verify') {
            // Step 2: Submit OTP with request_token
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }
            
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    request_token: request_token, 
                    otp: otp 
                })
            });

            const text = await response.text();
            console.log('HDFC OTP Raw Response:', text);

            let data = {};
            try { 
                data = JSON.parse(text); 
            } catch (e) {
                console.error('Failed to parse HDFC OTP response:', text);
                return res.status(500).json({ error: 'Invalid OTP response from HDFC API' });
            }
            
            console.log('HDFC OTP Parsed Response:', data);

            if (response.ok && data.status === 'success' && data.data && data.data.access_token) {
                return res.status(200).json({ 
                    access_token: data.data.access_token, 
                    user_info: data.data.user_info || {} 
                });
            } else {
                return res.status(400).json({ error: data.error || data.message || 'OTP validation failed' });
            }

        } else {
            return res.status(400).json({ error: 'Invalid step parameter' });
        }
    } catch (error) {
        console.error('HDFC session API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
