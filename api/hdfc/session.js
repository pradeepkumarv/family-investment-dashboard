export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { step, username, password, otp, api_key, api_secret, request_token } = req.body;
    if (!api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing API key or secret' });
    }

    try {
        if (step === 'initiate') {
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            // STEP 1: Login/post credentials
            const response = await fetch('https://developer.hdfcsec.com/ir-api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key,
                    api_secret,
                    username,
                    password
                })
            });
            const data = await response.json();

            // Check status for 2FA required
            if (
                response.ok &&
                data.status &&
                data.status === 'TO_BE_AUTHENTICATED' &&
                data.request_token
            ) {
                return res.status(200).json({ otpRequired: true, request_token: data.request_token });
            } else if (response.ok && data.access_token) {
                // Direct login (no OTP required, rare)
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info || {} });
            } else {
                return res.status(400).json({ error: data.message || data.error || 'Login failed.' });
            }
        } else if (step === 'verify') {
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }
            // STEP 2: Validate OTP
            const response = await fetch('https://developer.hdfcsec.com/ir-api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_token, otp })
            });
            const data = await response.json();

            if (response.ok && data.access_token) {
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info || {} });
            } else {
                return res.status(400).json({ error: data.message || data.error || 'OTP validation failed.' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid step parameter' });
        }
    } catch (error) {
        console.error('HDFC session API error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
