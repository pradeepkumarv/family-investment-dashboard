// ============================================================================
// HDFC SECURITIES INTEGRATION - JAVASCRIPT VERSION
// ============================================================================
// Pure JavaScript - No dependencies needed
// ============================================================================

console.log('🔄 HDFC Integration script loading...');

const BROKER_MEMBER_MAPPING = {
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['Zerodha', 'HDFC Securities'],
        mutualFunds: ['FundsIndia']
    },
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities']
    }
};

const HDFC_CONFIG = {
    api_key: 'YOUR_API_KEY_HERE',
    api_secret: 'YOUR_API_SECRET_HERE',
    base_url: 'https://developer.hdfcsec.com/oapi/v1',
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'],
    mf_members: ['d3a4fc84-a94b-494d-915f-60901f16d973']
};

let hdfcAccessToken = null;
let hdfcRequestToken = null;

function logHDFC(msg, type = 'info') {
    const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type];
    console.log(`${emoji} [HDFC] ${msg}`);
}

function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC: ${msg}`, type);
    } else {
        console.log(msg);
    }
}

async function hdfcGetTokenId() {
    try {
        logHDFC('Requesting token ID...', 'info');
        const url = `${HDFC_CONFIG.base_url}/login/tokenid?api_key=${HDFC_CONFIG.api_key}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Family-Investment-Dashboard/1.0'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

async function hdfcLoginValidate(tokenId, username, password) {
    try {
        logHDFC('Validating login credentials...', 'info');
        const url = `${HDFC_CONFIG.base_url}/login/validate?api_key=${HDFC_CONFIG.api_key}&tokenid=${tokenId}`;
        
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        logHDFC('Login validation successful', 'success');
        return data;
    } catch (error) {
        logHDFC(`Login validation failed: ${error.message}`, 'error');
        throw error;
    }
}

async function hdfcValidateOTP(tokenId, otp) {
    try {
        logHDFC('Validating OTP...', 'info');
        const url = `${HDFC_CONFIG.base_url}/twofa/validate?api_key=${HDFC_CONFIG.api_key}&tokenid=${tokenId}`;
        
        const formData = new URLSearchParams();
        formData.append('answer', otp);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData
        });

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

async function hdfcGetAccessToken(requestToken) {
    try {
        logHDFC('Fetching access token...', 'info');
        const url = `${HDFC_CONFIG.base_url}/access-token?api_key=${HDFC_CONFIG.api_key}&request_token=${requestToken}`;
        
        const formData = new URLSearchParams();
        formData.append('apiSecret', HDFC_CONFIG.api_secret);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData
        });

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

async function hdfcGetHoldings(accessToken) {
    try {
        logHDFC('Fetching holdings...', 'info');
        const url = `${HDFC_CONFIG.base_url}/portfolio/holdings`;
        
        const response = await fetch(url, {
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

        const equityHoldings = holdings.filter(h => h.product_type === 'equity' || !h.scheme_name);
        const mfHoldings = holdings.filter(h => h.scheme_name || h.product_type === 'mutual_fund');

        if (equityHoldings.length > 0) {
            for (const memberId of HDFC_CONFIG.equity_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                
                await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    memberId
                );

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
                logHDFC(`Imported ${equityRecords.length} equity for ${memberInfo.name}`, 'success');
            }
        }

        if (mfHoldings.length > 0) {
            for (const memberId of HDFC_CONFIG.mf_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                
                await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    memberId
                );

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
                logHDFC(`Imported ${mfRecords.length} MF for ${memberInfo.name}`, 'success');
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`✅ Imported ${totalImported} holdings`, 'success');

        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
    } catch (error) {
        console.error('Error importing HDFC holdings:', error);
        showHDFCMessage(`Failed to import: ${error.message}`, 'error');
    }
}

async function startHDFCAuth() {
    try {
        logHDFC('Starting authentication...', 'info');
        
        const tokenId = await hdfcGetTokenId();
        const username = prompt('Enter HDFC Username:');
        const password = prompt('Enter HDFC Password:');
        
        if (!username || !password) {
            logHDFC('Authentication cancelled', 'warning');
            return null;
        }
        
        await hdfcLoginValidate(tokenId, username, password);
        
        const otp = prompt('Enter OTP (check your mobile/email):');
        if (!otp) {
            logHDFC('OTP required', 'warning');
            return null;
        }
        
        const otpResult = await hdfcValidateOTP(tokenId, otp);
        await hdfcGetAccessToken(otpResult.request_token);
        
        const statusEl = document.getElementById('hdfc-connection-status');
        if (statusEl) statusEl.textContent = '✅ Connected';
        
        logHDFC('Authentication successful', 'success');
        return true;
        
    } catch (error) {
        console.error('Authentication failed:', error);
        logHDFC(`Authentication failed: ${error.message}`, 'error');
        return null;
    }
}

async function hdfcImportWithAuth() {
    try {
        logHDFC('Starting import workflow...', 'info');
        const token = localStorage.getItem('hdfc_access_token');
        
        if (!token) {
            logHDFC('Not authenticated, starting auth...', 'info');
            const authSuccess = await startHDFCAuth();
            if (!authSuccess) {
                logHDFC('Authentication required', 'warning');
                return;
            }
        }
        
        await hdfcImportAll();
    } catch (error) {
        console.error('Import failed:', error);
        logHDFC(`Import failed: ${error.message}`, 'error');
    }
}

// Export to window IMMEDIATELY
window.hdfcIntegration = {
    getTokenId: hdfcGetTokenId,
    loginValidate: hdfcLoginValidate,
    validateOTP: hdfcValidateOTP,
    getAccessToken: hdfcGetAccessToken,
    getHoldings: hdfcGetHoldings,
    importAll: hdfcImportAll
};

window.startHDFCAuth = startHDFCAuth;
window.hdfcImportWithAuth = hdfcImportWithAuth;

logHDFC('✅ Integration loaded - hdfcImportWithAuth is ready!', 'success');
