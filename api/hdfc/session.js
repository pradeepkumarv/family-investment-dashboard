// session.js - HDFC Securities Session Management API
// Backend endpoint for generating access token from request token

import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            status: 'error',
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        // Parse request body
        let body = req.body;
        if (!body) {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            body = JSON.parse(Buffer.concat(buffers).toString());
        }

        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { request_token, api_key, api_secret } = body;

        // Validate required parameters
        if (!request_token) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing request_token parameter'
            });
        }

        if (!api_key) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing api_key parameter'
            });
        }

        if (!api_secret) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing api_secret parameter'
            });
        }

        console.log('🔑 Generating HDFC Securities session...');
        console.log(`📋 Request token: ${request_token.substring(0, 10)}...`);
        console.log(`🔐 API Key: ${api_key}`);

        // HDFC Securities Access Token endpoint
        const tokenUrl = 'https://developer.hdfcsec.com/oapi/v1/access/token';

        // Prepare the request payload for HDFC Securities
        const tokenPayload = {
            request_token: request_token,
            api_key: api_key,
            api_secret: api_secret
        };

        console.log('🚀 Making request to HDFC Securities...');
        
        // Make request to HDFC Securities API
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'FamilyWealthDashboard/1.0'
            },
            body: JSON.stringify(tokenPayload),
            timeout: 30000
        });

        console.log(`📊 HDFC Response Status: ${response.status}`);

        // Get response text first
        const responseText = await response.text();
        console.log(`📝 Raw Response: ${responseText.substring(0, 200)}...`);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            return res.status(500).json({
                status: 'error',
                error: 'Invalid response from HDFC Securities',
                raw_response: responseText.substring(0, 500)
            });
        }

        // Check if the response was successful
        if (!response.ok) {
            console.error('❌ HDFC API Error:', data);
            return res.status(response.status).json({
                status: 'error',
                error: data.error || data.message || 'Failed to get access token',
                details: data
            });
        }

        // Check HDFC Securities specific success format
        if (data.status !== 'success') {
            console.error('❌ HDFC Session Error:', data);
            return res.status(400).json({
                status: 'error',
                error: data.error || data.message || 'Session creation failed',
                details: data
            });
        }

        console.log('✅ HDFC Session created successfully');

        // Return the session data in a format similar to Zerodha
        const sessionData = {
            status: 'success',
            data: {
                access_token: data.data.access_token,
                user_id: data.data.user_id || data.data.client_id,
                user_name: data.data.user_name || data.data.client_name,
                user_type: data.data.user_type || 'individual',
                email: data.data.email || '',
                broker: 'hdfc_securities',
                login_time: new Date().toISOString(),
                token_type: 'Bearer',
                expires_in: data.data.expires_in || 86400, // 24 hours default
                refresh_token: data.data.refresh_token || null,
                // Additional HDFC specific fields
                api_key: api_key,
                exchange_enabled: data.data.exchange_enabled || ['NSE', 'BSE'],
                product_enabled: data.data.product_enabled || ['CNC', 'MIS', 'NRML'],
                order_types: data.data.order_types || ['MARKET', 'LIMIT', 'SL', 'SL-M']
            }
        };

        res.status(200).json(sessionData);

    } catch (error) {
        console.error('💥 Session creation error:', error);
        
        // Check for specific error types
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return res.status(503).json({
                status: 'error',
                error: 'HDFC Securities API is currently unavailable',
                details: error.message
            });
        }
        
        if (error.name === 'AbortError') {
            return res.status(408).json({
                status: 'error',
                error: 'Request timeout. HDFC Securities API took too long to respond',
                details: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            error: 'Internal server error during session creation',
            details: error.message
        });
    }
}

// Export configuration for serverless deployment
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
}
