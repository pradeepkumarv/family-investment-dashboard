export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { step, username, password, otp, api_key, api_secret, request_token, auth_code } = req.body || {};
    
    if (!api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing API key or secret' });
    }

    try {
        if (step === 'authorize') {
            // Step 1: Initial authorization (get authorization code)
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            console.log('HDFC Step 1: Authorization request');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/authorize', {
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
                    response_type: "code",
                    grant_type: "authorization_code"
                })
            });

            const responseText = await response.text();
            console.log('HDFC Authorize Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return res.status(500).json({
                    error: 'Invalid response from HDFC authorize API',
                    details: responseText.substring(0, 200)
                });
            }

            if (response.ok && data.status === 'success') {
                return res.status(200).json({
                    success: true,
                    auth_code: data.data?.code,
                    next_step: 'access_token'
                });
            } else {
                return res.status(400).json({
                    error: data?.message || 'Authorization failed'
                });
            }

        } else if (step === 'access_token') {
            // Step 2: Get access token with authorization code
            if (!auth_code) {
                return res.status(400).json({ error: 'Missing authorization code' });
            }

            console.log('HDFC Step 2: Access token request');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    code: auth_code,
                    api_key: api_key,
                    api_secret: api_secret,
                    grant_type: "authorization_code"
                })
            });

            const responseText = await response.text();
            console.log('HDFC Access Token Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return res.status(500).json({
                    error: 'Invalid response from HDFC access token API',
                    details: responseText.substring(0, 200)
                });
            }

            if (response.ok && data.status === 'success') {
                if (data.data?.access_token) {
                    // Direct access - no 2FA required
                    return res.status(200).json({
                        access_token: data.data.access_token,
                        user_info: data.data.user_info || {}
                    });
                } else if (data.data?.request_token) {
                    // 2FA required
                    return res.status(200).json({
                        requires_2fa: true,
                        request_token: data.data.request_token,
                        message: 'OTP sent to registered mobile/email'
                    });
                }
            }

            return res.status(400).json({
                error: data?.message || 'Failed to get access token'
            });

        } else if (step === 'validate_2fa') {
            // Step 3: Validate OTP for 2FA
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }

            console.log('HDFC Step 3: 2FA validation');

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
            console.log('HDFC 2FA Validation Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return res.status(500).json({
                    error: 'Invalid response from HDFC 2FA validation API',
                    details: responseText.substring(0, 200)
                });
            }

            if (response.ok && data.status === 'success' && data.data?.access_token) {
                return res.status(200).json({
                    access_token: data.data.access_token,
                    user_info: data.data.user_info || {}
                });
            }

            return res.status(400).json({
                error: data?.message || 'OTP validation failed'
            });

        } else if (step === 'resend_otp') {
            // Step 4: Resend OTP
            if (!request_token) {
                return res.status(400).json({ error: 'Missing request token' });
            }

            console.log('HDFC Step 4: Resend OTP');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/resend2fa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    request_token: request_token
                })
            });

            const responseText = await response.text();
            console.log('HDFC Resend OTP Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return res.status(500).json({
                    error: 'Invalid response from HDFC resend OTP API',
                    details: responseText.substring(0, 200)
                });
            }

            if (response.ok && data.status === 'success') {
                return res.status(200).json({
                    success: true,
                    message: 'OTP resent successfully'
                });
            }

            return res.status(400).json({
                error: data?.message || 'Failed to resend OTP'
            });

        } else {
            return res.status(400).json({
                error: 'Invalid step. Use: authorize, access_token, validate_2fa, or resend_otp'
            });
        }

    } catch (error) {
        console.error('HDFC API Handler Error:', error);
        return res.status(500).json({
            error: 'Internal server error: ' + error.message
        });
    }
}
