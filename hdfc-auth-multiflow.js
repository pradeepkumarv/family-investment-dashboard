// HDFC Securities Integration - JavaScript Version
// Matches Zerodha pattern with delete-then-insert logic

const BROKER_MEMBER_MAPPING = {
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['Zerodha', 'HDFC Securities'],
        mutualFunds: ['FundsIndia']
    },
    '0221a8e7-fad8-42cd-bdf6-2f84b85dac31': {
        name: 'Smruthi Pradeep',
        demat: ['ICICI Securities'],
        mutualFunds: ['ICICI Securities']
    },
    'c2f4b3d8-bb69-4516-b107-dffbde92c77c': {
        name: 'Saanvi Pradeep',
        demat: [],
        mutualFunds: ['Zerodha']
    },
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities']
    }
};

const HDFC_CONFIG = {
    api_key: '', // Set from environment or configuration
    api_secret: '', // Set from environment or configuration
    base_url: 'https://developer.hdfcsec.com/oapi/v1',
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'], // Pradeep for Equity
    mf_members: ['d3a4fc84-a94b-494d-915f-60901f16d973'] // Sanchita for MF
};

let hdfcAccessToken = null;
let hdfcRequestToken = null;

function logHDFC(msg, type = 'info') {
    const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type];
    console.log(`${emoji} [${new Date().toISOString()}] HDFC: ${msg}`);
}

function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') showMessage(`HDFC: ${msg}`, type);
    else console.log(msg);
}

// Step 1: Get Token ID
async function hdfcGetTokenId() {
    try {
        logHDFC('Requesting token ID...');
        const response = await fetch(`${HDFC_CONFIG.base_url}/login/tokenid?api_key=${HDFC_CONFIG.api_key}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Family-Investment-Dashboard/1.0'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        const tokenId = data.tokenId || data.tokenid || data.token_id;
        
        if (!tokenId) throw new Error('No token ID in response');
        
        logHDFC(`Token ID received: ${tokenId.substring(0, 10)}...`, 'success');
        return tokenId;
    } catch (error) {
        logHDFC(`Failed to get token ID: ${error.message}`, 'error');
        throw error;
    }
}

// Step 2: Login Validate
async function hdfcLoginValidate(tokenId, username, password) {
    try {
        logHDFC('Validating login credentials...');
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(
            `${HDFC_CONFIG.base_url}/login/validate?api_key=${HDFC_CONFIG.api_key}&tokenid=${tokenId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData
            }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        logHDFC('Login validation successful', 'success');
        return data;
    } catch (error) {
        logHDFC(`Login validation failed: ${error.message}`, 'error');
        throw error;
    }
}

// Step 3: Validate OTP
async function hdfcValidateOTP(tokenId, otp) {
    try {
        logHDFC('Validating OTP...');
        const formData = new URLSearchParams();
        formData.append('answer', otp);

        const response = await fetch(
            `${HDFC_CONFIG.base_url}/twofa/validate?api_key=${HDFC_CONFIG.api_key}&tokenid=${tokenId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData
            }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        hdfcRequestToken = data.request_token;
        
        logHDFC('OTP validated successfully', 'success');
        return data;
    } catch (error) {
        logHDFC(`OTP validation failed: ${error.message}`, 'error');
        throw error;
    }
}

// Step 4: Get Access Token
async function hdfcGetAccessToken(requestToken) {
    try {
        logHDFC('Fetching access token...');
        const formData = new URLSearchParams();
        formData.append('apiSecret', HDFC_CONFIG.api_secret);

        const response = await fetch(
            `${HDFC_CONFIG.base_url}/access-token?api_key=${HDFC_CONFIG.api_key}&request_token=${requestToken}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData
            }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        hdfcAccessToken = data.accessToken;
        
        localStorage.setItem('hdfc_access_token', hdfcAccessToken);
        logHDFC('Access token received', 'success');
        return hdfcAccessToken;
    } catch (error) {
        logHDFC(`Failed to get access token: ${error.message}`, 'error');
        throw error;
    }
}

// Get Holdings
async function hdfcGetHoldings(accessToken) {
    try {
        logHDFC('Fetching holdings...');
        const response = await fetch(`${HDFC_CONFIG.base_url}/portfolio/holdings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        logHDFC(`Fetched ${data.data?.length || 0} holdings`, 'success');
        return data;
    } catch (error) {
        logHDFC(`Failed to fetch holdings: ${error.message}`, 'error');
        throw error;
    }
}

// **CRITICAL: Import All Holdings with Member Mapping**
async function hdfcImportAll() {
    try {
        const accessToken = localStorage.getItem('hdfc_access_token');
        if (!accessToken) {
            showHDFCMessage('Please authenticate with HDFC Securities first', 'warning');
            return;
        }

        if (!window.dbHelpers) {
            showHDFCMessage('Database helpers not initialized', 'error');
            return;
        }

        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showHDFCMessage('Please log in first', 'error');
            return;
        }

        showHDFCMessage('Importing holdings from HDFC Securities...', 'info');

        const holdingsResponse = await hdfcGetHoldings(accessToken);
        const holdings = holdingsResponse.data || [];

        let totalImported = 0;
        const importDate = new Date().toISOString().split('T')[0];

        // Separate equity and mutual funds based on HDFC response structure
        const equityHoldings = holdings.filter(h => h.product_type === 'equity' || !h.scheme_name);
        const mfHoldings = holdings.filter(h => h.scheme_name || h.product_type === 'mutual_fund');

        // **Import Equity for Pradeep**
        if (equityHoldings.length > 0) {
            for (const memberId of HDFC_CONFIG.equity_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                
                // DELETE existing HDFC equity holdings
                await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    memberId
                );

                // INSERT fresh equity data
                const equityRecords = equityHoldings.map(holding => ({
                    user_id: user.id,
                    member_id: memberId,
                    broker_platform: 'HDFC Securities',
                    symbol: holding.symbol || holding.tradingsymbol,
                    company_name: holding.company_name || holding.symbol,
                    quantity: holding.quantity || holding.net_quantity,
                    average_price: holding.average_price || holding.avg_price,
                    current_price: holding.last_price || holding.ltp,
                    invested_amount: (holding.quantity || holding.net_quantity) * (holding.average_price || holding.avg_price),
                    current_value: (holding.quantity || holding.net_quantity) * (holding.last_price || holding.ltp),
                    import_date: importDate
                }));

                await window.dbHelpers.insertEquityHoldings(equityRecords);
                totalImported += equityRecords.length;
                
                logHDFC(`Imported ${equityRecords.length} equity holdings for ${memberInfo.name}`, 'success');
            }
        }

        // **Import Mutual Funds for Sanchita**
        if (mfHoldings.length > 0) {
            for (const memberId of HDFC_CONFIG.mf_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                
                // DELETE existing HDFC MF holdings
                await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    memberId
                );

                // INSERT fresh MF data
                const mfRecords = mfHoldings.map(mf => ({
                    user_id: user.id,
                    member_id: memberId,
                    broker_platform: 'HDFC Securities',
                    scheme_name: mf.scheme_name || mf.fund,
                    scheme_code: mf.scheme_code || mf.isin || '',
                    folio_number: mf.folio_number || mf.folio || '',
                    fund_house: mf.fund_house || mf.amc || 'Unknown',
                    units: mf.units || mf.quantity,
                    average_nav: mf.average_nav || mf.avg_price,
                    current_nav: mf.current_nav || mf.last_price,
                    invested_amount: (mf.units || mf.quantity) * (mf.average_nav || mf.avg_price),
                    current_value: (mf.units || mf.quantity) * (mf.current_nav || mf.last_price),
                    import_date: importDate
                }));

                await window.dbHelpers.insertMutualFundHoldings(mfRecords);
                totalImported += mfRecords.length;
                
                logHDFC(`Imported ${mfRecords.length} mutual fund holdings for ${memberInfo.name}`, 'success');
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        showHDFCMessage(
            `Imported ${totalImported} holdings (Equity: ${equityHoldings.length} for Pradeep, MF: ${mfHoldings.length} for Sanchita)`,
            'success'
        );

        // Reload dashboard
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error importing HDFC holdings:', error);
        showHDFCMessage(`Failed to import: ${error.message}`, 'error');
    }
}

// ========== HELPER FUNCTIONS FOR UI ==========

// Authentication flow function
async function startHDFCAuth() {
    try {
        showHDFCMessage('Starting HDFC authentication...', 'info');
        
        // Step 1: Get token ID
        const tokenId = await hdfcGetTokenId();
        
        // Step 2: Prompt for credentials
        const username = prompt('Enter HDFC Username:');
        const password = prompt('Enter HDFC Password:');
        
        if (!username || !password) {
            showHDFCMessage('Authentication cancelled', 'warning');
            return null;
        }
        
        // Step 3: Validate login
        await hdfcLoginValidate(tokenId, username, password);
        
        // Step 4: Prompt for OTP
        const otp = prompt('Enter OTP (check your mobile/email):');
        
        if (!otp) {
            showHDFCMessage('OTP required', 'warning');
            return null;
        }
        
        // Step 5: Validate OTP and get request token
        const otpResult = await hdfcValidateOTP(tokenId, otp);
        
        // Step 6: Get access token
        await hdfcGetAccessToken(otpResult.request_token);
        
        // Update UI status
        document.getElementById('hdfc-connection-status').textContent = '✅ Connected';
        showHDFCMessage('HDFC Securities authenticated!', 'success');
        
        return true;
        
    } catch (error) {
        console.error('HDFC authentication failed:', error);
        showHDFCMessage(`Authentication failed: ${error.message}`, 'error');
        return null;
    }
}

// Combined function: auth + import in one click
async function hdfcImportWithAuth() {
    try {
        // Check if already authenticated
        const token = localStorage.getItem('hdfc_access_token');
        
        if (!token) {
            logHDFC('Not authenticated, starting auth flow...', 'info');
            const authSuccess = await startHDFCAuth();
            
            if (!authSuccess) {
                showHDFCMessage('Authentication required to import', 'warning');
                return;
            }
        } else {
            logHDFC('Already authenticated, proceeding with import', 'success');
        }
        
        // Now import holdings
        await hdfcImportAll();
        
    } catch (error) {
        console.error('HDFC import failed:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

// Export functions for use in dashboard
window.hdfcIntegration = {
    getTokenId: hdfcGetTokenId,
    loginValidate: hdfcLoginValidate,
    validateOTP: hdfcValidateOTP,
    getAccessToken: hdfcGetAccessToken,
    getHoldings: hdfcGetHoldings,
    importAll: hdfcImportAll
};

// Make helper functions globally accessible from HTML onclick
window.startHDFCAuth = startHDFCAuth;
window.hdfcImportWithAuth = hdfcImportWithAuth;

logHDFC('HDFC Securities integration initialized', 'success');
