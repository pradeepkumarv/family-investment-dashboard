// api/hdfc/holdings.js - Vercel API endpoint for HDFC holdings data

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
        
        // Make request to HDFC Securities Holdings API
        const response = await fetch('https://developer.hdfcsec.com/oapi/v1/holdings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': access_token,
                'X-API-Key': api_key
            },
            body: JSON.stringify({
                api_key: api_key
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Process and normalize the data
            const normalizedData = normalizeHoldingsData(data);
            
            return res.status(200).json({
                status: 'success',
                data: normalizedData
            });
        } else {
            return res.status(400).json({
                status: 'error',
                error: data.error || 'Failed to fetch holdings'
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

// Normalize HDFC holdings data to a consistent format
function normalizeHoldingsData(rawData) {
    if (!rawData || !Array.isArray(rawData.data)) {
        return [];
    }
    
    return rawData.data.map(holding => ({
        // Common fields
        symbol: holding.symbol || holding.trading_symbol || holding.instrument_name,
        instrument_type: determineInstrumentType(holding),
        segment: holding.segment || holding.exchange,
        
        // Equity specific
        quantity: holding.quantity || holding.units || 0,
        average_price: holding.average_price || holding.avg_price || holding.average_nav || 0,
        ltp: holding.ltp || holding.last_price || holding.nav || 0,
        last_price: holding.ltp || holding.last_price || holding.nav || 0,
        
        // MF specific
        units: holding.units || holding.quantity || 0,
        nav: holding.nav || holding.ltp || holding.last_price || 0,
        average_nav: holding.average_nav || holding.average_price || holding.avg_price || 0,
        fund_name: holding.fund_name || holding.instrument_name || holding.symbol,
        folio: holding.folio || holding.folio_number || '',
        scheme_code: holding.scheme_code || '',
        fund_house: holding.fund_house || extractFundHouse(holding.fund_name || holding.symbol),
        
        // Additional fields
        product_type: holding.product_type || '',
        isin: holding.isin || '',
        
        // Raw data for reference
        raw_data: holding
    }));
}

// Determine if holding is equity or mutual fund
function determineInstrumentType(holding) {
    if (holding.instrument_type === 'EQUITY' || 
        holding.segment === 'NSE' || 
        holding.segment === 'BSE' ||
        holding.product_type === 'CNC' ||
        holding.product_type === 'EQ') {
        return 'EQUITY';
    } else if (holding.instrument_type === 'MF' || 
               holding.product_type === 'MF' ||
               holding.fund_name ||
               holding.nav ||
               holding.units) {
        return 'MF';
    } else {
        // Default based on available fields
        return holding.quantity ? 'EQUITY' : 'MF';
    }
}

// Extract fund house from fund name
function extractFundHouse(fundName) {
    if (!fundName) return 'Unknown';
    
    const commonFundHouses = [
        'HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Reliance', 'UTI', 'DSP',
        'Franklin', 'Aditya Birla', 'Nippon', 'Mirae', 'L&T', 'PGIM'
    ];
    
    for (const house of commonFundHouses) {
        if (fundName.toUpperCase().includes(house.toUpperCase())) {
            return house;
        }
    }
    
    // Extract first word as fund house
    return fundName.split(' ')[0] || 'Unknown';
}
