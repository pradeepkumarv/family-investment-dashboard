// api/hdfc/profile.js - Vercel API endpoint for HDFC user profile

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { access_token, api_key } = req.body;
        
        if (!access_token || !api_key) {
            return res.status(400).json({ 
                status: 'error', 
                error: 'Missing required parameters: access_token, api_key' 
            });
        }
        
        // Make request to HDFC Securities Profile API
        const response = await fetch('https://developer.hdfcsec.com/oapi/v1/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': access_token,
                'X-API-Key': api_key
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return res.status(200).json({
                status: 'success',
                data: data
            });
        } else {
            return res.status(400).json({
                status: 'error',
                error: data.error || 'Failed to fetch profile'
            });
        }
        
    } catch (error) {
        console.error('HDFC Profile Error:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Internal server error: ' + error.message
        });
    }
}
