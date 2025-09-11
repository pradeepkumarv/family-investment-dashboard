export default async function handler(req, res) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // --- Main Logic ---
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, otp, api_key, api_secret } = req.body;
    if (!username || !password || !otp || !api_key || !api_secret) {
        return res.status(400).json({ error: 'Missing credentials or API parameters' });
    }

    try {
        const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, otp, api_key, api_secret })
        });
        const data = await response.json();

        if (response.ok) {
            // Return the access_token for dashboard storage
            return res.status(200).json({
                access_token: data.access_token,
                user_info: data.user_info
            });
        } else {
            return res.status(400).json({ error: data.error || 'Failed to authenticate' });
        }
    } catch (error) {
        console.error('HDFC Session Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
