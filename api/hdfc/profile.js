// profile.js - HDFC Securities User Profile API
// Backend endpoint for fetching user profile information

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

        const { access_token, api_key } = body;

        // Validate required parameters
        if (!access_token) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing access_token parameter'
            });
        }

        if (!api_key) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing api_key parameter'
            });
        }

        console.log('👤 Fetching HDFC Securities user profile...');
        console.log(`🔑 Access token: ${access_token.substring(0, 10)}...`);
        console.log(`🔐 API Key: ${api_key}`);

        // HDFC Securities User Profile endpoint
        const profileUrl = 'https://developer.hdfcsec.com/oapi/v1/user/profile';

        console.log('🚀 Making request to HDFC Securities profile endpoint...');

        // Make request to HDFC Securities API
        const response = await fetch(profileUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `${access_token}`,
                'X-API-Key': api_key,
                'User-Agent': 'FamilyWealthDashboard/1.0'
            },
            body: JSON.stringify({
                api_key: api_key
            }),
            timeout: 30000
        });

        console.log(`📊 HDFC Profile Response Status: ${response.status}`);

        // Get response text first
        const responseText = await response.text();
        console.log(`📝 Raw Profile Response: ${responseText.substring(0, 200)}...`);

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
            console.error('❌ HDFC Profile API Error:', data);
            return res.status(response.status).json({
                status: 'error',
                error: data.error || data.message || 'Failed to fetch profile',
                details: data
            });
        }

        // Check HDFC Securities specific success format
        if (data.status !== 'success') {
            console.error('❌ HDFC Profile Error:', data);
            return res.status(400).json({
                status: 'error',
                error: data.error || data.message || 'Profile fetch failed',
                details: data
            });
        }

        console.log('✅ HDFC Profile fetched successfully');

        // Normalize the profile data to match your application format
        const profileData = {
            status: 'success',
            data: {
                user_id: data.data.user_id || data.data.client_id,
                user_name: data.data.user_name || data.data.client_name || data.data.name,
                user_type: data.data.user_type || 'individual',
                email: data.data.email || data.data.email_id || '',
                phone: data.data.phone || data.data.mobile || data.data.phone_number || '',
                broker: 'hdfc_securities',
                
                // Account details
                account_id: data.data.account_id || data.data.client_id,
                client_code: data.data.client_code || data.data.user_id,
                
                // Trading permissions
                exchanges: data.data.exchanges || data.data.exchange_enabled || ['NSE', 'BSE'],
                products: data.data.products || data.data.product_enabled || ['CNC', 'MIS', 'NRML'],
                order_types: data.data.order_types || ['MARKET', 'LIMIT', 'SL', 'SL-M'],
                
                // Segment access
                equity_enabled: data.data.equity_enabled !== false,
                commodity_enabled: data.data.commodity_enabled || false,
                currency_enabled: data.data.currency_enabled || false,
                
                // Account status
                status: data.data.status || 'active',
                verified: data.data.verified !== false,
                
                // Additional profile information
                pan: data.data.pan || data.data.pan_number || '',
                branch: data.data.branch || data.data.branch_code || '',
                
                // Financial limits
                cash_limit: data.data.cash_limit || 0,
                margin_available: data.data.margin_available || 0,
                
                // Timestamp
                profile_fetched_at: new Date().toISOString(),
                
                // Raw data for debugging (optional)
                raw_data: data.data
            }
        };

        res.status(200).json(profileData);

    } catch (error) {
        console.error('💥 Profile fetch error:', error);
        
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

        if (error.message.includes('Invalid access token') || error.message.includes('Unauthorized')) {
            return res.status(401).json({
                status: 'error',
                error: 'Invalid or expired access token',
                details: error.message
            });
        }

        res.status(500).json({
            status: 'error',
            error: 'Internal server error during profile fetch',
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
