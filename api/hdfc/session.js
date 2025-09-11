export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { step, username, password, otp, api_key, api_secret, request_token } = req.body || {};
    
    if (!api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing API key or secret' });
    }

    try {
        if (step === 'initiate') {
            // Step 1: Initial authentication to get request_token
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            console.log('Making HDFC 2FA initiation request...');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    api_key: api_key,
                    api_secret: api_secret,
                    product: "investright"  // This might be required
                })
            });

            const responseText = await response.text();
            console.log('HDFC Response Status:', response.status);
            console.log('HDFC Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response:', responseText);
                return res.status(500).json({ 
                    error: 'Invalid response from HDFC API',
                    details: responseText.substring(0, 200)
                });
            }

            // Check if 2FA is required
            if (response.ok && data.status === 'success' && data.data) {
                if (data.data.request_token) {
                    // 2FA required - OTP will be sent
                    return res.status(200).json({
                        otpRequired: true,
                        request_token: data.data.request_token,
                        message: 'OTP sent to registered mobile/email'
                    });
                } else if (data.data.access_token) {
                    // Direct login success (no 2FA required)
                    return res.status(200).json({
                        access_token: data.data.access_token,
                        user_info: data.data.user_info || {}
                    });
                }
            }

            // Handle error response
            return res.status(400).json({
                error: data?.message || data?.error || 'Authentication failed',
                details: data
            });

        } else if (step === 'verify') {
            // Step 2: Validate OTP with request_token
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }

            console.log('Making HDFC OTP validation request...');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    request_token: request_token,
                    otp: otp
                })
            });

            const responseText = await response.text();
            console.log('HDFC OTP Response Status:', response.status);
            console.log('HDFC OTP Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse OTP response:', responseText);
                return res.status(500).json({ 
                    error: 'Invalid OTP response from HDFC API',
                    details: responseText.substring(0, 200)
                });
            }

            if (response.ok && data.status === 'success' && data.data && data.data.access_token) {
                return res.status(200).json({
                    access_token: data.data.access_token,
                    user_info: data.data.user_info || {}
                });
            }

            // Handle OTP validation error
            return res.status(400).json({
                error: data?.message || data?.error || 'OTP validation failed',
                details: data
            });

        } else {
            return res.status(400).json({ error: 'Invalid step. Use "initiate" or "verify"' });
        }

    } catch (error) {
        console.error('HDFC API Handler Error:', error);
        return res.status(500).json({
            error: 'Internal server error: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
