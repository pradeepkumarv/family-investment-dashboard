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
            // Step 1: Initial login request (gets request_token for 2FA)
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            console.log('HDFC Step 1: Initial login request');

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
                    api_secret: api_secret
                })
            });

            const responseText = await response.text();
            console.log('HDFC Login Response Status:', response.status);
            console.log('HDFC Login Response Text:', responseText);

            let data = {};
            if (responseText.trim()) {
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.error('Failed to parse HDFC response as JSON:', responseText);
                    return res.status(500).json({
                        error: 'Invalid response from HDFC API - not JSON',
                        details: responseText.substring(0, 300)
                    });
                }
            }

            console.log('HDFC Parsed Response:', data);

            if (response.ok) {
                if (data.status === 'success') {
                    if (data.data && data.data.access_token) {
                        // Direct login success (no 2FA)
                        return res.status(200).json({
                            access_token: data.data.access_token,
                            user_info: data.data.user_info || {}
                        });
                    } else if (data.data && data.data.request_token) {
                        // 2FA required
                        return res.status(200).json({
                            requires_2fa: true,
                            request_token: data.data.request_token,
                            message: 'OTP sent to registered mobile/email'
                        });
                    }
                } else if (data.request_token) {
                    // Alternative response format - 2FA required
                    return res.status(200).json({
                        requires_2fa: true,
                        request_token: data.request_token,
                        message: 'OTP sent to registered mobile/email'
                    });
                } else if (data.access_token) {
                    // Alternative response format - direct access
                    return res.status(200).json({
                        access_token: data.access_token,
                        user_info: data.user_info || {}
                    });
                }
            }

            // Handle error or unexpected response
            return res.status(400).json({
                error: data?.error || data?.message || 'Login failed',
                status: response.status,
                response: data
            });

        } else if (step === 'verify') {
            // Step 2: Validate OTP
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }

            console.log('HDFC Step 2: OTP validation');

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
            console.log('HDFC OTP Response Text:', responseText);

            let data = {};
            if (responseText.trim()) {
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.error('Failed to parse HDFC OTP response as JSON:', responseText);
                    return res.status(500).json({
                        error: 'Invalid OTP response from HDFC API - not JSON',
                        details: responseText.substring(0, 300)
                    });
                }
            }

            console.log('HDFC OTP Parsed Response:', data);

            if (response.ok && data) {
                if ((data.status === 'success' && data.data && data.data.access_token) || data.access_token) {
                    const accessToken = data.data?.access_token || data.access_token;
                    const userInfo = data.data?.user_info || data.user_info || {};
                    
                    return res.status(200).json({
                        access_token: accessToken,
                        user_info: userInfo
                    });
                }
            }

            return res.status(400).json({
                error: data?.error || data?.message || 'OTP validation failed',
                response: data
            });

        } else {
            return res.status(400).json({
                error: 'Invalid step. Use "initiate" or "verify"'
            });
        }

    } catch (error) {
        console.error('HDFC API Handler Error:', error);
        return res.status(500).json({
            error: 'Internal server error: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
