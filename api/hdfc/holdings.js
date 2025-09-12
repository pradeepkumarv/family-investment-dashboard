// api/hdfc/holdings.js - Backend proxy for HDFC Securities API
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;

        // Handle different request formats
        if (!body) {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            body = JSON.parse(Buffer.concat(buffers).toString());
        }

        if (typeof body === 'string') body = JSON.parse(body);

        const { access_token, api_key, type } = body;

        if (!access_token || !api_key) {
            return res.status(400).json({ 
                error: 'Missing required parameters', 
                required: ['access_token', 'api_key'] 
            });
        }

        // HDFC Securities API endpoints
        let apiUrl = '';
        let headers = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add API key to headers if required by HDFC
        if (api_key) {
            headers['x-api-key'] = api_key;
        }

        // Determine endpoint based on type
        if (type === 'equity') {
            // HDFC Securities Holdings API for Equity
            apiUrl = 'https://developer.hdfcsec.com/oapi/v1/holdings';
        } else if (type === 'mf' || type === 'mutualfunds') {
            // HDFC Securities Holdings API for Mutual Funds
            apiUrl = 'https://developer.hdfcsec.com/oapi/v1/holdings/mf';
        } else {
            return res.status(400).json({ 
                error: 'Invalid type parameter', 
                message: 'Type must be either "equity" or "mf"',
                provided: type 
            });
        }

        console.log(`Making request to HDFC API: ${apiUrl}`);
        
        // Make request to HDFC Securities API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers,
            timeout: 30000 // 30 second timeout
        });

        const responseBody = await response.text();
        console.log(`HDFC API Response Status: ${response.status}`);
        console.log(`HDFC API Response Body: ${responseBody.substring(0, 500)}...`);

        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (parseError) {
            console.error('Failed to parse HDFC API response:', parseError);
            data = { 
                error: 'Invalid JSON response from HDFC Securities', 
                raw: responseBody.substring(0, 1000),
                status: response.status
            };
        }

        // Return the response with the same status code
        res.status(response.status).json(data);

    } catch (error) {
        console.error('HDFC Proxy API Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
