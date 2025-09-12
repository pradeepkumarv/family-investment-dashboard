// api/hdfc/holdings.js
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { access_token, api_key } = req.body || {};
    if (!access_token || !api_key) {
        return res.status(400).json({ error: 'Missing access_token or api_key' });
    }

    try {
        console.log('HDFC: Fetching holdings...');

        const response = await fetch('https://developer.hdfcsec.com/oapi/v1/holdings', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${access_token}`,
                'X-API-Key': api_key,
                'User-Agent': 'Mozilla/5.0 (compatible; FamilyDashboard/1.0)'
            }
        });

        const responseText = await response.text();
        console.log('HDFC Holdings Response Status:', response.status);
        console.log('HDFC Holdings Response:', responseText);

        let data = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error('Failed to parse HDFC holdings response:', responseText);
            return res.status(500).json({
                status: 'error',
                error: 'Invalid response from HDFC holdings API',
                details: responseText.substring(0, 500)
            });
        }

        if (response.ok) {
            // Handle different response formats
            const holdingsData = data.data || data.holdings || data;
            return res.status(200).json({
                status: 'success',
                data: holdingsData
            });
        } else {
            const errorMessage = data.error || data.message || 'Failed to fetch holdings';
            return res.status(response.status).json({
                status: 'error',
                error: errorMessage,
                details: data
            });
        }

    } catch (error) {
        console.error('HDFC Holdings Error:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Internal server error: ' + error.message
        });
    }
}
