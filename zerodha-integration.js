// zerodha-integration-updated-v2.js - Updated with MF only for Saanvi Pradeep

// Version 2.1.0

// Account mapping from accounts.xlsx - UPDATED
const BROKER_MEMBER_MAPPING = {
    // Pradeep Kumar V - has Zerodha & HDFC Securities for Demat, FundsIndia for MF
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['Zerodha', 'HDFC Securities'],
        mutualFunds: ['FundsIndia'] // Pradeep uses FundsIndia for MF, not Zerodha
    },
    // Smruthi Pradeep - has ICICI securities for both Demat and MF
    '0221a8e7-fad8-42cd-bdf6-2f84b85dac31': {
        name: 'Smruthi Pradeep', 
        demat: ['ICICI Securities'],
        mutualFunds: ['ICICI Securities']
    },
    // Saanvi Pradeep - has Zerodha for MF only
    'c2f4b3d8-bb69-4516-b107-dffbde92c77c': {
        name: 'Saanvi Pradeep',
        demat: [],
        mutualFunds: ['Zerodha'] // Only Saanvi uses Zerodha for MF
    },
    // Sanchita Pradeep - has HDFC Securities for MF only
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities']
    }
};

const ZERODHA_CONFIG = {
    api_key: 'ci3r8v1cbqb6e73p',
    base_url: 'https://api.kite.trade',
    login_url: 'https://kite.zerodha.com/connect/login',
    // Zerodha members mapping - UPDATED
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'], // Only Pradeep has Zerodha Demat
    mf_members: ['c2f4b3d8-bb69-4516-b107-dffbde92c77c'] // ONLY Saanvi has Zerodha MF
};

// State variables
let zerodhaAccessToken = null;
let autoRefreshInterval = null;
let refreshIntervalMinutes = 0;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000;
const MAX_API_CALLS_PER_MINUTE = 100;

// Utilities
function log(msg, type='info') {
    const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] ZERODHA: ${msg}`);
}

function showZerodhaMessage(msg, type='info') {
    if (typeof showMessage === 'function') showMessage(`Zerodha: ${msg}`, type);
    else console.log(msg);
}

function canMakeAPICall() {
    const now = Date.now();
    if (now > apiCallResetTime) {
        apiCallCount = 0;
        apiCallResetTime = now + 60000;
    }
    if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
        log('Rate limit exceeded', 'warning');
        return false;
    }
    apiCallCount++;
    return true;
}

// Authentication functions
function generateLoginURL() {
    return `${ZERODHA_CONFIG.login_url}?api_key=${ZERODHA_CONFIG.api_key}`;
}

function extractRequestToken() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success' && params.get('action') === 'login') {
        return params.get('request_token');
    }
    return null;
}

async function generateSession(request_token) {
    try {
        log('Requesting session from backend...');
        const response = await fetch('https://family-investment-dashboard-4hli.vercel.app/api/zerodha/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_token }),
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.error || data.message || 'Session creation failed');

        zerodhaAccessToken = data.data.access_token;
        localStorage.setItem('zerodha_access_token', zerodhaAccessToken);
        localStorage.setItem('zerodha_user_data', JSON.stringify(data.data));
        // Immediately refresh the UI status
        updateConnectionStatus();
        updateModalStatus();

        log('Session created successfully', 'success');
        return data.data;
    } catch (error) {
        log(error.message, 'error');
        throw error;
    }
}

async function initFromStorage() {
    const token = localStorage.getItem('zerodha_access_token');
    if (!token) return false;
    zerodhaAccessToken = token;
    return verifyToken();
}

async function verifyToken() {
    if (!zerodhaAccessToken || !canMakeAPICall()) return false;
    try {
        const response = await fetch(`${ZERODHA_CONFIG.base_url}/user/profile`, {
            headers: {
                'Authorization': `token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
                'X-Kite-Version': '3',
            }
        });
        const data = await response.json();
        return data.status === 'success';
    } catch {
        return false;
    }
}

function clearStorage() {
    localStorage.removeItem('zerodha_access_token');
    localStorage.removeItem('zerodha_user_data');
    clearInterval(autoRefreshInterval);
    zerodhaAccessToken = null;
}

// API request functions
async function getHoldings() {
    const proxyUrl = 'https://family-investment-dashboard-4hli.vercel.app/api/zerodha/holdings';
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: localStorage.getItem('zerodha_access_token'),
                api_key: ZERODHA_CONFIG.api_key
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching holdings:', error);
        throw error;
    }
}

async function getMutualFunds() {
    const proxyUrl = 'https://family-investment-dashboard-4hli.vercel.app/api/zerodha/mf-holdings';
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: localStorage.getItem('zerodha_access_token'),
                api_key: ZERODHA_CONFIG.api_key
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching MF holdings:', error);
        throw error;
    }
}

// OPTION 1: Single connect for equity (Pradeep) and MF (Saanvi) - UPDATED WITH NEW DB STRUCTURE
async function zerodhaImportAll() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        // Get current user from Supabase
        if (!supabase) {
            showZerodhaMessage('Database not initialized', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showZerodhaMessage('Please log in first', 'error');
            return;
        }

        showZerodhaMessage('Importing all holdings from Zerodha...', 'info');

        let totalImported = 0;
        const importDate = new Date().toISOString().split('T')[0];

        // Import Equity for Pradeep Kumar V only
        const holdingsResponse = await getHoldings();
        const holdings = Array.isArray(holdingsResponse.data) ? holdingsResponse.data : [];

        if (holdings.length > 0) {
            // Import equity for Pradeep Kumar V only
            for (const memberId of ZERODHA_CONFIG.equity_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];

                // DELETE existing Zerodha equity holdings for this member
                const { error: deleteError } = await supabase
                    .from('equity_holdings')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('broker_platform', 'Zerodha')
                    .eq('member_id', memberId);

                if (deleteError) {
                    console.error('Delete error:', deleteError);
                }

                // INSERT fresh data
                const equityRecords = holdings.map(holding => ({
                    user_id: user.id,
                    member_id: memberId,
                    broker_platform: 'Zerodha',
                    symbol: holding.tradingsymbol,
                    company_name: holding.tradingsymbol,
                    quantity: holding.quantity,
                    average_price: holding.average_price,
                    current_price: holding.last_price,
                    invested_amount: holding.quantity * holding.average_price,
                    current_value: holding.quantity * holding.last_price,
                    import_date: importDate
                }));

                const { error: insertError } = await supabase
                    .from('equity_holdings')
                    .insert(equityRecords);

                if (insertError) {
                    throw insertError;
                }

                totalImported += equityRecords.length;
            }
        }

        // Import Mutual Funds for Saanvi Pradeep ONLY - UPDATED
        const mfResponse = await getMutualFunds();
        const mfHoldings = Array.isArray(mfResponse.data) ? mfResponse.data : [];

        if (mfHoldings.length > 0) {
            // Import MF for Saanvi Pradeep ONLY
            for (const memberId of ZERODHA_CONFIG.mf_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];

                // DELETE existing Zerodha MF holdings for this member
                const { error: deleteError } = await supabase
                    .from('mutual_fund_holdings')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('broker_platform', 'Zerodha')
                    .eq('member_id', memberId);

                if (deleteError) {
                    console.error('Delete error:', deleteError);
                }

                // INSERT fresh data
                const mfRecords = mfHoldings.map(mf => ({
                    user_id: user.id,
                    member_id: memberId,
                    broker_platform: 'Zerodha',
                    scheme_name: mf.fund || mf.tradingsymbol,
                    scheme_code: mf.instrument_token ? mf.instrument_token.toString() : '',
                    folio_number: mf.folio,
                    fund_house: mf.fund_house || 'Unknown',
                    units: mf.quantity,
                    average_nav: mf.average_price,
                    current_nav: mf.last_price,
                    invested_amount: mf.quantity * mf.average_price,
                    current_value: mf.quantity * mf.last_price,
                    import_date: importDate
                }));

                const { error: insertError } = await supabase
                    .from('mutual_fund_holdings')
                    .insert(mfRecords);

                if (insertError) {
                    throw insertError;
                }

                totalImported += mfRecords.length;
            }
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        const equityMember = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.equity_members[0]].name;
        const mfMember = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.mf_members[0]].name;
        showZerodhaMessage(`Imported ${totalImported} total holdings (Equity: ${holdings.length} for ${equityMember}, MF: ${mfHoldings.length} for ${mfMember})`, 'success');

        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error importing all holdings:', error);
        showZerodhaMessage(`Failed to import holdings: ${error.message}`, 'error');
    }
}

// OPTION 2: Import equity for Pradeep Kumar V only
async function zerodhaImportEquity() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        showZerodhaMessage('Importing equity holdings from Zerodha...', 'info');
        
        const holdingsResponse = await getHoldings();
        const holdings = Array.isArray(holdingsResponse.data) ? holdingsResponse.data : [];

        if (holdings.length === 0) {
            showZerodhaMessage('No equity holdings found', 'warning');
            return;
        }

        let count = 0;
        
        // Import equity for Pradeep Kumar V only
        for (const memberId of ZERODHA_CONFIG.equity_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];
            
            for (const holding of holdings) {
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.symbol_or_name === holding.tradingsymbol && 
                    inv.broker_platform.includes('Zerodha') &&
                    inv.investment_type === 'equity'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'equity',
                        symbol_or_name: holding.tradingsymbol,
                        invested_amount: holding.quantity * holding.average_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: `Zerodha Equity (${memberInfo.name})`,
                        zerodha_data: holding,
                        equity_quantity: holding.quantity,
                        equity_avg_price: holding.average_price,
                        equity_symbol: holding.tradingsymbol,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        showZerodhaMessage(`Imported ${count} equity holdings for ${BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.equity_members[0]].name}`, 'success');

        // Refresh data from new tables
        if (typeof refreshHoldingsFromNewTables === 'function') {
            await refreshHoldingsFromNewTables();
        }

        renderInvestmentTabContent('equity');

    } catch (error) {
        console.error('Error importing equity:', error);
        showZerodhaMessage(`Failed to import equity: ${error.message}`, 'error');
    }
}

// OPTION 2: Import MF for Saanvi Pradeep ONLY - UPDATED
async function zerodhaImportMF() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        showZerodhaMessage('Importing mutual fund holdings from Zerodha...', 'info');
        
        const mfResponse = await getMutualFunds();
        const mfHoldings = Array.isArray(mfResponse.data) ? mfResponse.data : [];

        if (mfHoldings.length === 0) {
            showZerodhaMessage('No mutual fund holdings found', 'warning');
            return;
        }

        let count = 0;
        
        // Import MF for Saanvi Pradeep ONLY - UPDATED
        for (const memberId of ZERODHA_CONFIG.mf_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];
            
            for (const mf of mfHoldings) {
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.folio_number === mf.folio && 
                    inv.broker_platform.includes('Zerodha') &&
                    inv.investment_type === 'mutualFunds'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund || mf.tradingsymbol,
                        invested_amount: mf.quantity * mf.average_price,
                        current_value: mf.quantity * mf.last_price,
                        broker_platform: `Zerodha MF (${memberInfo.name})`,
                        zerodha_data: mf,
                        fund_name: mf.fund,
                        folio_number: mf.folio,
                        scheme_code: mf.instrument_token ? mf.instrument_token.toString() : '',
                        fund_house: mf.fund_house || 'Unknown',
                        mf_quantity: mf.quantity,
                        mf_nav: mf.last_price,
                        mf_average_price: mf.average_price,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        // Now only shows Saanvi Pradeep
        const memberName = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.mf_members[0]].name;
        showZerodhaMessage(`Imported ${count} mutual fund holdings for ${memberName}`, 'success');

        // Refresh data from new tables
        if (typeof refreshHoldingsFromNewTables === 'function') {
            await refreshHoldingsFromNewTables();
        }

        renderInvestmentTabContent('mutualFunds');

    } catch (error) {
        console.error('Error importing MF:', error);
        showZerodhaMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

// Enhanced price update function - UPDATED
async function zerodhaUpdatePrices() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        showZerodhaMessage('Updating prices...', 'info');
        
        let updatedCount = 0;

        // Update equity prices for Pradeep Kumar V only
        try {
            const holdings = await getHoldings();
            const equityHoldings = Array.isArray(holdings.data) ? holdings.data : [];
            
            for (const inv of investments.filter(i => 
                i.broker_platform.includes('Zerodha') && 
                i.investment_type === 'equity' &&
                ZERODHA_CONFIG.equity_members.includes(i.member_id)
            )) {
                const matchingHolding = equityHoldings.find(h => h.tradingsymbol === inv.symbol_or_name);
                if (matchingHolding) {
                    const invIndex = investments.findIndex(i => i.id === inv.id);
                    if (invIndex !== -1) {
                        investments[invIndex].current_value = matchingHolding.quantity * matchingHolding.last_price;
                        investments[invIndex].equity_quantity = matchingHolding.quantity;
                        investments[invIndex].last_updated = new Date().toISOString();
                    }

                    if (typeof updateInvestmentData === 'function') {
                        await updateInvestmentData(inv.id, {
                            current_value: matchingHolding.quantity * matchingHolding.last_price,
                            equity_quantity: matchingHolding.quantity,
                            last_updated: new Date().toISOString()
                        });
                    }
                    updatedCount++;
                }
            }
        } catch (error) {
            console.error('Error updating equity prices:', error);
        }

        // Update MF prices for Saanvi Pradeep ONLY - UPDATED
        try {
            const mfHoldings = await getMutualFunds();
            const mfData = Array.isArray(mfHoldings.data) ? mfHoldings.data : [];
            
            for (const inv of investments.filter(i => 
                i.broker_platform.includes('Zerodha') && 
                i.investment_type === 'mutualFunds' &&
                ZERODHA_CONFIG.mf_members.includes(i.member_id)
            )) {
                const matchingMF = mfData.find(mf => mf.folio === inv.folio_number);
                if (matchingMF) {
                    const invIndex = investments.findIndex(i => i.id === inv.id);
                    if (invIndex !== -1) {
                        investments[invIndex].current_value = matchingMF.quantity * matchingMF.last_price;
                        investments[invIndex].mf_quantity = matchingMF.quantity;
                        investments[invIndex].mf_nav = matchingMF.last_price;
                        investments[invIndex].last_updated = new Date().toISOString();
                    }

                    if (typeof updateInvestmentData === 'function') {
                        await updateInvestmentData(inv.id, {
                            current_value: matchingMF.quantity * matchingMF.last_price,
                            mf_quantity: matchingMF.quantity,
                            mf_nav: matchingMF.last_price,
                            last_updated: new Date().toISOString()
                        });
                    }
                    updatedCount++;
                }
            }
        } catch (error) {
            console.error('Error updating MF prices:', error);
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());
        
        showZerodhaMessage(`Updated ${updatedCount} holdings`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error updating prices:', error);
        showZerodhaMessage(`Failed to update prices: ${error.message}`, 'error');
    }
}

// Connection management
async function connectZerodha() {
    try {
        const loginUrl = generateLoginURL();
        showZerodhaMessage('Redirecting to Zerodha login...', 'info');
        window.open(loginUrl, '_blank');
    } catch (error) {
        showZerodhaMessage(`Connection failed: ${error.message}`, 'error');
    }
}
// Add these functions to v2
function updateConnectionStatus() {
    try {
        const statusEl = document.getElementById('zerodha-connection-status');
        if (statusEl) {
            const connected = localStorage.getItem('zerodha_access_token');
            const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');
            
            if (connected) {
                statusEl.textContent = `✅ Connected ${userData.user_name ? '(' + userData.user_name + ')' : ''}`;
                statusEl.style.color = '#28a745';
            } else {
                statusEl.textContent = '❌ Not Connected';
                statusEl.style.color = '#dc3545';
            }
        }
    } catch (error) {
        console.error('Error updating connection status:', error);
    }
}

function updateModalStatus() {
    const connectionSpan = document.getElementById('zerodha-modal-connection');
    const syncSpan = document.getElementById('zerodha-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('zerodha_access_token');
        connectionSpan.textContent = connected ? '✅ Connected' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('zerodha_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = syncDate.toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

function disconnectZerodha() {
    clearStorage();
    showZerodhaMessage('Disconnected from Zerodha', 'info');
    
    const statusEl = document.getElementById('zerodha-connection-status');
    if (statusEl) {
        statusEl.textContent = '❌ Not Connected';
        statusEl.style.color = '#dc3545';
    }
}

// Auto-update functionality
function setZerodhaAutoUpdate() {
    const intervalSelect = document.getElementById('zerodha_update_interval');
    if (!intervalSelect) return;

    const minutes = parseInt(intervalSelect.value);
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }

    if (minutes > 0) {
        autoRefreshInterval = setInterval(zerodhaUpdatePrices, minutes * 60 * 1000);
        localStorage.setItem('zerodha_refresh_interval', minutes.toString());
        showZerodhaMessage(`Auto-update set to ${minutes} minutes`, 'success');
    } else {
        localStorage.removeItem('zerodha_refresh_interval');
        showZerodhaMessage('Auto-update disabled', 'info');
    }
}

// Enhanced settings modal - UPDATED
function showZerodhaSettings() {
    const oldModal = document.getElementById('zerodha_settings_modal');
    if (oldModal) oldModal.remove();

    const equityMembersList = ZERODHA_CONFIG.equity_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');
    const mfMembersList = ZERODHA_CONFIG.mf_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="zerodha_settings_modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>⚙️ Zerodha Settings</h3>
                    <button class="btn-close" onclick="closeZerodhaModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🔗 Connection</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="connectZerodha()" class="btn btn-primary">Connect to Zerodha</button>
                            <button onclick="disconnectZerodha()" class="btn btn-secondary">Disconnect</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Click Connect to authenticate with your Zerodha account</p>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📊 Account Mapping (from accounts.xlsx) - UPDATED</h4>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Equity Holdings:</strong> ${equityMembersList}</p>
                            <p><strong>Mutual Fund Holdings:</strong> ${mfMembersList} <span style="color: #e53e3e; font-size: 12px;">(UPDATED: Only Saanvi)</span></p>
                        </div>
                        <div style="background: #fef5e7; border: 1px solid #f6ad55; border-radius: 6px; padding: 10px; margin-top: 10px;">
                            <p style="font-size: 12px; color: #744210; margin: 0;"><strong>Note:</strong> Pradeep Kumar V uses FundsIndia for mutual funds, not Zerodha.</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📥 Import Options</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="zerodhaImportAll()" class="btn btn-success" style="background: #805ad5;">📥 Import All (Recommended)</button>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="zerodhaImportEquity()" class="btn btn-success">📈 Import Equity Only</button>
                            <button onclick="zerodhaImportMF()" class="btn btn-info">📊 Import MF Only</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Import All will fetch equity for Pradeep and MF for Saanvi</p>
                    </div>

                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🔄 Auto Update</h4>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <label>Update Interval:</label>
                            <select id="zerodha_update_interval" style="padding: 5px;">
                                <option value="0">Manual Only</option>
                                <option value="15">Every 15 minutes</option>
                                <option value="30">Every 30 minutes</option>
                                <option value="60">Every hour</option>
                            </select>
                            <button onclick="setZerodhaAutoUpdate()" class="btn btn-info">Set</button>
                        </div>
                    </div>

                    <div class="setting-group">
                        <h4>ℹ️ Status</h4>
                        <div id="zerodha-modal-status">
                            <p>Status: <span id="zerodha-modal-connection">Checking...</span></p>
                            <p>Last Sync: <span id="zerodha-modal-sync">Never</span></p>
                            <p>API Key: <code>${ZERODHA_CONFIG.api_key}</code></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateModalStatus();
}

function updateModalStatus() {
    const connectionSpan = document.getElementById('zerodha-modal-connection');
    const syncSpan = document.getElementById('zerodha-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('zerodha_access_token');
        connectionSpan.textContent = connected ? '✅ Connected' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('zerodha_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = syncDate.toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

function closeZerodhaModal() {
    const modal = document.getElementById('zerodha_settings_modal');
    if (modal) modal.remove();
}

// Make functions globally available
window.zerodhaImportAll = zerodhaImportAll;
window.zerodhaImportEquity = zerodhaImportEquity;
window.zerodhaImportMF = zerodhaImportMF;
window.zerodhaUpdatePrices = zerodhaUpdatePrices;
window.connectZerodha = connectZerodha;
window.disconnectZerodha = disconnectZerodha;
window.setZerodhaAutoUpdate = setZerodhaAutoUpdate;
window.showZerodhaSettings = showZerodhaSettings;



console.log('✅ Zerodha integration with proper member mapping loaded - MF only for Saanvi Pradeep');

// ===== INITIALIZATION AND STATUS UPDATES =====
// Initialize on page load and set up status monitoring
window.addEventListener('load', async () => {
    console.log('🚀 Zerodha integration initializing...');
    
    // Initialize from storage
    const tokenExists = await initFromStorage();
    
    // Always update status on load
    updateConnectionStatus();
    
    // Check for OAuth callback
    const requestToken = extractRequestToken();
    if (requestToken) {
        console.log('📋 Processing OAuth callback...');
        try {
            await generateSession(requestToken);
            showZerodhaMessage('Successfully connected to Zerodha!', 'success');
            
            // Clean up URL
            const url = new URL(window.location);
            url.searchParams.delete('request_token');
            url.searchParams.delete('action');
            url.searchParams.delete('status');
            window.history.replaceState({}, document.title, url);
            
        } catch (error) {
            console.error('❌ OAuth callback failed:', error);
            showZerodhaMessage('Failed to complete Zerodha connection', 'error');
        }
    }
    
    // Resume auto-refresh if configured
    const savedInterval = localStorage.getItem('zerodha_refresh_interval');
    if (savedInterval && parseInt(savedInterval) > 0) {
        const minutes = parseInt(savedInterval);
        autoRefreshInterval = setInterval(zerodhaUpdatePrices, minutes * 60 * 1000);
        log(`Auto-update resumed: ${minutes} minutes`, 'info');
    }
    
    console.log('✅ Zerodha integration ready');
});

// Monitor storage changes (for multi-tab sync)
window.addEventListener('storage', (e) => {
    if (e.key === 'zerodha_access_token') {
        updateConnectionStatus();
    }
});

// Periodic status check every 30 seconds
setInterval(() => {
    updateConnectionStatus();
}, 30000);
