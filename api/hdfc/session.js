export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { step, username, password, otp, api_key, api_secret, request_token } = req.body || {};
        
        // Validate inputs
        if (!api_key || !api_secret) {
            return res.status(400).json({ error: 'Missing API key or secret' });
        }

        console.log('Request step:', step);
        console.log('Has username:', !!username);
        console.log('Has password:', !!password);
        console.log('Has OTP:', !!otp);
        console.log('Has request_token:', !!request_token);

        if (step === 'initiate') {
            if (!username || !password) {
                return res.status(400).json({ error: 'Missing username or password' });
            }

            console.log('Making HDFC login request...');
            
            let response;
            let responseText;
            
            try {
                // Try the main HDFC API endpoint
                response = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        api_key: api_key,
                        api_secret: api_secret,
                        username: username,
                        password: password
                    })
                });

                responseText = await response.text();
                console.log('HDFC Response Status:', response.status);
                console.log('HDFC Response Headers:', Object.fromEntries(response.headers.entries()));
                console.log('HDFC Response Text:', responseText);

            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                return res.status(500).json({ error: 'Failed to connect to HDFC API: ' + fetchError.message });
            }

            // Try to parse response
            let data = {};
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                    console.log('Parsed HDFC Response:', data);
                } catch (parseError) {
                    console.error('JSON Parse Error:', parseError);
                    console.log('Response was not JSON:', responseText);
                    return res.status(500).json({ 
                        error: 'HDFC API returned invalid response',
                        details: responseText.substring(0, 200) // First 200 chars for debugging
                    });
                }
            }

            // Handle different response scenarios
            if (response.status === 200 && data) {
                // Check for OTP requirement
                if (data.request_token || (data.data && data.data.request_token)) {
                    const token = data.request_token || data.data.request_token;
                    return res.status(200).json({ 
                        otpRequired: true, 
                        request_token: token 
                    });
                }
                // Check for direct access token
                else if (data.access_token || (data.data && data.data.access_token)) {
                    const token = data.access_token || data.data.access_token;
                    return res.status(200).json({ 
                        access_token: token, 
                        user_info: data.user_info || data.data?.user_info || {} 
                    });
                }
                // Success but unexpected format
                else {
                    return res.status(400).json({ 
                        error: 'Unexpected response format from HDFC',
                        response: data
                    });
                }
            } else {
                // Non-200 response
                return res.status(400).json({ 
                    error: data.error || data.message || 'HDFC login failed',
                    status: response.status,
                    response: data
                });
            }

        } else if (step === 'verify') {
            if (!otp || !request_token) {
                return res.status(400).json({ error: 'Missing OTP or request token' });
            }

            console.log('Making HDFC OTP validation request...');

            let response;
            let responseText;

            try {
                response = await fetch('https://developer.hdfcsec.com/oapi/v1/validate', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        request_token: request_token, 
                        otp: otp 
                    })
                });

                responseText = await response.text();
                console.log('HDFC OTP Response Status:', response.status);
                console.log('HDFC OTP Response Text:', responseText);

            } catch (fetchError) {
                console.error('OTP Fetch error:', fetchError);
                return res.status(500).json({ error: 'Failed to connect to HDFC OTP API: ' + fetchError.message });
            }

            let data = {};
            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                    console.log('Parsed HDFC OTP Response:', data);
                } catch (parseError) {
                    console.error('OTP JSON Parse Error:', parseError);
                    return res.status(500).json({ 
                        error: 'HDFC OTP API returned invalid response',
                        details: responseText.substring(0, 200)
                    });
                }
            }

            if (response.status === 200 && data && (data.access_token || (data.data && data.data.access_token))) {
                const token = data.access_token || data.data.access_token;
                return res.status(200).json({ 
                    access_token: token, 
                    user_info: data.user_info || data.data?.user_info || {} 
                });
            } else {
                return res.status(400).json({ 
                    error: data.error || data.message || 'OTP validation failed',
                    response: data
                });
            }

        } else {
            return res.status(400).json({ error: 'Invalid step parameter. Use "initiate" or "verify".' });
        }

    } catch (error) {
        console.error('Handler Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error: ' + error.message,
            stack: error.stack
        });
    }
}
