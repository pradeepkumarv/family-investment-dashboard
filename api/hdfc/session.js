// api/hdfc/session.js - Vercel API endpoint for HDFC access token generation

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
        const { request_token, api_key, api_secret } = req.body;
        
        if (!request_token || !api_key || !api_secret) {
            return res.status(400).json({ 
                status: 'error', 
                error: 'Missing required parameters: request_token, api_key, api_secret' 
            });
        }
        
        // Make request to HDFC Securities API
        const response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                request_token,
                api_key,
                api_secret
            })
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
                error: data.error || 'Failed to generate access token'
            });
        }
        
    } catch (error) {
        console.error('HDFC Session Error:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Internal server error: ' + error.message
        });
    }
}
