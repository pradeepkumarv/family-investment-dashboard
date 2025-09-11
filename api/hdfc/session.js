// let tempSessions = {}; // Simple in-memory store for session tokens (use DB for production)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { step, username, password, otp, api_key, api_secret, request_token } = req.body;
    
    if (!api_key || !api_secret) return res.status(400).json({ error: 'Missing API key or secret' });

    try {
        if (step === 'initiate') {
            // Step 1: Generate request token
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: api_key, client_secret: api_secret, username, password })
            });
            const data = await response.json();
            if (response.ok && data.request_token) {
                return res.status(200).json({ otpRequired: true, request_token: data.request_token });
            } else {
                return res.status(400).json({ error: data.error || 'Failed to initiate login' });
            }
        } else if (step === 'verify') {
            // Step 2: Validate OTP using request token
            if (!otp || !request_token) return res.status(400).json({ error: 'Missing OTP or request token' });
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/2fa/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_token, otp })
            });
            const data = await response.json();
            if (response.ok && data.access_token) {
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info });
            } else {
                return res.status(400).json({ error: data.error || 'OTP validation failed' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid step parameter' });
        }
    } catch (error) {
        console.error('HDFC session API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/initiate_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, api_key, api_secret })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.otp_required) {
                    tempSessions[username] = data.session_token || null;
                    return res.status(200).json({ otpRequired: true, session_token: data.session_token });
                } else if (data.access_token) {
                    return res.status(200).json({ access_token: data.access_token, user_info: data.user_info });
                } else {
                    console.error('Unexpected response from initiate_session:', data);
                    return res.status(400).json({ error: 'Unexpected response from initiate session' });
                }
            } else {
                console.error('Initiate session failed:', data);
                return res.status(400).json({ error: data.error || 'Initiate session failed' });
            }

        } else if (step === 'verify') {
            if (!otp || !session_token) {
                return res.status(400).json({ error: 'Missing OTP or session token for verification' });
            }

            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, session_token, api_key, api_secret })
            });

            const data = await response.json();

            if (response.ok && data.access_token) {
                // Clean up stored session token
                for (const key in tempSessions) {
                    if (tempSessions[key] === session_token) {
                        delete tempSessions[key];
                        break;
                    }
                }
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info });
            } else {
                console.error('OTP verification failed:', data);
                return res.status(400).json({ error: data.error || 'OTP verification failed' });
            }

        } else {
            return res.status(400).json({ error: 'Invalid step parameter' });
        }
    } catch (err) {
        console.error('HDFC session API error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
