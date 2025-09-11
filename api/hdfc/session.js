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

            const text = await response.text();
            let data = {};
            try { data = JSON.parse(text); } catch (e) { /* fallback */ }

            // Debug logging to capture raw responses
            console.log('HDFC LOGIN RESPONSE:', data);

            if (
                response.ok &&
                data.status &&
                data.status === 'TO_BE_AUTHENTICATED' &&
                data.request_token
            ) {
                // OTP step required
                return res.status(200).json({ otpRequired: true, request_token: data.request_token });
            } else if (response.ok && data.access_token) {
                // Some accounts may grant access directly
                return res.status(200).json({ access_token: data.access_token, user_info: data.user_info || {} });
            } else {
                return res.status(400).json({ error: data.message || data.error || 'Login failed.' });
            }
        } else if (step === 'verify') {
            // Step 2: Submit OTP with request_token
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }
            const response = await fetch('https://developer.hdfcsec.com/ir-api/auth/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_token, otp })
            });

            const text = await response.text();
            let data = {};
            try { data = JSON.parse(text); } catch (e) {}

            console.log('HDFC OTP VALIDATE RESPONSE:', data);

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
