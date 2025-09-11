// api/hdfc/session.js - Multi-step login with OTP flow for HDFC Securities

let tempSessions = {}; // Simple in-memory to hold session tokens keyed by username (use DB for production)

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { step, username, password, otp, api_key, api_secret, session_token } = req.body;

    if (!api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing API key or secret' });
    }

    try {
        if (step === 'initiate') {
            // Validate required params
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password for initiation' });
            }

            // Call HDFC initiate session endpoint (example URL, check doc)
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/initiate_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, api_key, api_secret })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.otp_required) {
                    // Store session token temporarily
                    tempSessions[username] = data.session_token || null;
                    return res.status(200).json({ otpRequired: true, session_token: data.session_token });
                } else if (data.access_token) {
                    // Login completed without OTP
                    return res.status(200).json({ access_token: data.access_token, user_info: data.user_info });
                } else {
                    return res.status(400).json({ error: 'Unexpected response from initiate session' });
                }
            } else {
                return res.status(400).json({ error: data.error || 'Initiate session failed' });
            }

        } else if (step === 'verify') {
            // Validate OTP params
            if (!otp || !session_token) {
                return res.status(400).json({ error: 'Missing OTP or session token for verification' });
            }

            // Call HDFC OTP verification endpoint (example URL, check doc)
            const response = await fetch('https://developer.hdfcsec.com/oapi/v1/verify_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, session_token, api_key, api_secret })
            });

            const data = await response.json();

            if (response.ok && data.access_token) {
                // Remove stored session token after successful verification
                for (const key in tempSessions) {
                    if (tempSessions[key] === session_token) {
                        delete tempSessions[key];
                        break;
                    }
                }
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info });
            } else {
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
