// api/hdfc/session.js
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { step, username, password, otp, api_key, api_secret, request_token } = req.body || {};
    
    if (!api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing API key or secret' });
    }

    console.log(`HDFC Step: ${step}`);

    try {
        if (step === 'initiate') {
            // Step 1: Initial login to get request_token for 2FA
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            console.log('HDFC: Attempting initial login...');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; FamilyDashboard/1.0)'
                },
                body: JSON.stringify({
                    user_id: username,
                    password: password,
                    api_key: api_key,
                    api_secret: api_secret
                })
            });

            const responseText = await response.text();
            console.log('HDFC Login Response Status:', response.status);
            console.log('HDFC Login Response:', responseText);

            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('Failed to parse HDFC response:', responseText);
                return res.status(500).json({
                    error: 'Invalid response from HDFC API',
                    details: responseText.substring(0, 500)
                });
            }

            if (response.ok) {
                // Check for different response formats
                if (data.status === 'success' || data.success) {
                    const responseData = data.data || data;
                    
                    if (responseData.access_token) {
                        // Direct login success (no 2FA required)
                        return res.status(200).json({
                            access_token: responseData.access_token,
                            user_info: responseData.user_info || {}
                        });
                    } else if (responseData.request_token) {
                        // 2FA required
                        return res.status(200).json({
                            requires_2fa: true,
                            request_token: responseData.request_token,
                            message: 'OTP sent to your registered mobile/email'
                        });
                    }
                }
                
                // Handle direct token response (some APIs return token directly)
                if (data.request_token) {
                    return res.status(200).json({
                        requires_2fa: true,
                        request_token: data.request_token,
                        message: 'OTP sent to your registered mobile/email'
                    });
                }
                
                if (data.access_token) {
                    return res.status(200).json({
                        access_token: data.access_token,
                        user_info: data.user_info || {}
                    });
                }
            }

            // Handle error response
            const errorMessage = data.error || data.message || data.error_description || 'Login failed';
            console.error('HDFC Login Error:', errorMessage, data);
            
            return res.status(400).json({
                error: errorMessage,
                details: data,
                status_code: response.status
            });

        } else if (step === 'verify') {
            // Step 2: Validate OTP
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request_token' });
            }

            console.log('HDFC: Validating OTP...');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/twofa/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; FamilyDashboard/1.0)'
                },
                body: JSON.stringify({
                    request_token: request_token,
                    otp: otp,
                    api_key: api_key,
                    api_secret: api_secret
                })
            });

            const responseText = await response.text();
            console.log('HDFC OTP Response Status:', response.status);
            console.log('HDFC OTP Response:', responseText);

            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('Failed to parse HDFC OTP response:', responseText);
                return res.status(500).json({
                    error: 'Invalid OTP response from HDFC API',
                    details: responseText.substring(0, 500)
                });
            }

            if (response.ok) {
                if (data.status === 'success' || data.success) {
                    const responseData = data.data || data;
                    
                    if (responseData.access_token) {
                        return res.status(200).json({
                            access_token: responseData.access_token,
                            user_info: responseData.user_info || {}
                        });
                    }
                }
                
                // Handle direct token response
                if (data.access_token) {
                    return res.status(200).json({
                        access_token: data.access_token,
                        user_info: data.user_info || {}
                    });
                }
            }

            // Handle OTP error
            const errorMessage = data.error || data.message || data.error_description || 'OTP validation failed';
            console.error('HDFC OTP Error:', errorMessage, data);
            
            return res.status(400).json({
                error: errorMessage,
                details: data,
                status_code: response.status
            });

        } else if (step === 'resend_otp') {
            // Step 3: Resend OTP
            if (!request_token) {
                return res.status(400).json({ error: 'Missing request_token' });
            }

            console.log('HDFC: Resending OTP...');

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/twofa/resend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; FamilyDashboard/1.0)'
                },
                body: JSON.stringify({
                    request_token: request_token,
                    api_key: api_key,
                    api_secret: api_secret
                })
            });

            const responseText = await response.text();
            console.log('HDFC Resend Response:', responseText);

            let data = {};
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                return res.status(500).json({
                    error: 'Invalid resend response from HDFC API',
                    details: responseText.substring(0, 500)
                });
            }

            if (response.ok && (data.status === 'success' || data.success)) {
                return res.status(200).json({
                    success: true,
                    message: 'OTP resent successfully'
                });
            }

            return res.status(400).json({
                error: data.error || data.message || 'Failed to resend OTP',
                details: data
            });

        } else {
            return res.status(400).json({
                error: 'Invalid step. Use "initiate", "verify", or "resend_otp"'
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
