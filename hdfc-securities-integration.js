// hdfc-securities-integration.js - Complete HDFC Securities Integration
// Version 1.0.0 - Following Zerodha integration pattern

// Account mapping from your existing configuration
const BROKER_MEMBER_MAPPING = {
    // Pradeep Kumar V - has Zerodha & HDFC Securities for Demat, FundsIndia for MF
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['Zerodha', 'HDFC Securities'],
        mutualFunds: ['FundsIndia']
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
        mutualFunds: ['Zerodha']
    },
    // Sanchita Pradeep - has HDFC Securities for MF only
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities']
    }
};

    const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    base_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    session_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/session',
    profile_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/profile',
    // ... rest of your config
};

    
    // HDFC members mapping based on account mapping
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'], // Only Pradeep has HDFC Demat
    mf_members: ['d3a4fc84-a94b-494d-915f-60901f16d973'] // Only Sanchita has HDFC MF
};

// State variables
let hdfcAccessToken = null;
let hdfcRefreshInterval = null;
let hdfcApiCallCount = 0;
let hdfcApiCallResetTime = Date.now() + 60000;
const MAX_HDFC_API_CALLS_PER_MINUTE = 100;

// ===== UTILITY FUNCTIONS =====
function hdfcLog(msg, type='info') {
    const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] HDFC: ${msg}`);
}

function showHdfcMessage(msg, type='info') {
    if (typeof showMessage === 'function') showMessage(`HDFC Securities: ${msg}`, type);
    else console.log(msg);
}

function canMakeHdfcAPICall() {
    const now = Date.now();
    if (now > hdfcApiCallResetTime) {
        hdfcApiCallCount = 0;
        hdfcApiCallResetTime = now + 60000;
    }
    if (hdfcApiCallCount >= MAX_HDFC_API_CALLS_PER_MINUTE) {
        hdfcLog('Rate limit exceeded', 'warning');
        return false;
    }
    hdfcApiCallCount++;
    return true;
}

// ===== AUTHENTICATION FUNCTIONS =====
function generateHdfcLoginURL() {
    // HDFC Securities login URL format based on documentation
    return `https://developer.hdfcsec.com/auth/login?api_key=${HDFC_CONFIG.api_key}&redirect_uri=${encodeURIComponent(window.location.origin)}`;
}

async function initHdfcFromStorage() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) return false;
    hdfcAccessToken = token;
    return verifyHdfcToken();
}

async function verifyHdfcToken() {
    if (!hdfcAccessToken || !canMakeHdfcAPICall()) return false;
    try {
        const response = await fetch(`${HDFC_CONFIG.proxy_url}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: hdfcAccessToken,
                api_key: HDFC_CONFIG.api_key
            })
        });
        const data = await response.json();
        return data.status === 'success';
    } catch {
        return false;
    }
}

function clearHdfcStorage() {
    localStorage.removeItem('hdfc_access_token');
    localStorage.removeItem('hdfc_user_data');
    localStorage.removeItem('hdfc_last_sync');
    clearInterval(hdfcRefreshInterval);
    hdfcAccessToken = null;
}

// ===== API REQUEST FUNCTIONS =====
async function getHdfcHoldings() {
    try {
        const response = await fetch(`${HDFC_CONFIG.proxy_url}/holdings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: hdfcAccessToken,
                api_key: HDFC_CONFIG.api_key,
                type: 'equity'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        hdfcLog(`Error fetching equity holdings: ${error.message}`, 'error');
        throw error;
    }
}

async function getHdfcMutualFunds() {
    try {
        const response = await fetch(`${HDFC_CONFIG.proxy_url}/holdings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: hdfcAccessToken,
                api_key: HDFC_CONFIG.api_key,
                type: 'mf'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        hdfcLog(`Error fetching MF holdings: ${error.message}`, 'error');
        throw error;
    }
}

// ===== MAIN IMPORT FUNCTIONS =====

// Import all holdings (Equity for Pradeep, MF for Sanchita)
async function hdfcImportAll() {
    try {
        if (!hdfcAccessToken) {
            showHdfcMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHdfcMessage('Importing all holdings from HDFC Securities...', 'info');
        let totalImported = 0;

        // Import Equity for Pradeep Kumar V only
        try {
            const holdingsResponse = await getHdfcHoldings();
            const holdings = Array.isArray(holdingsResponse.data) ? holdingsResponse.data : [];
            
            if (holdings.length > 0) {
                for (const memberId of HDFC_CONFIG.equity_members) {
                    const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                    for (const holding of holdings) {
                        // Check if investment already exists
                        if (!investments.some(inv => 
                            inv.member_id === memberId && 
                            inv.symbol_or_name === holding.symbol &&
                            inv.broker_platform.includes('HDFC Securities') &&
                            inv.investment_type === 'equity'
                        )) {
                            await addInvestmentData({
                                member_id: memberId,
                                investment_type: 'equity',
                                symbol_or_name: holding.symbol || holding.tradingsymbol,
                                invested_amount: holding.quantity * holding.avg_price,
                                current_value: holding.quantity * holding.last_price,
                                broker_platform: `HDFC Securities Equity (${memberInfo.name})`,
                                hdfc_data: holding,
                                equity_quantity: holding.quantity,
                                equity_avg_price: holding.avg_price,
                                equity_symbol: holding.symbol,
                                created_at: new Date().toISOString(),
                                last_updated: new Date().toISOString()
                            });
                            totalImported++;
                        }
                    }
                }
            }
        } catch (error) {
            hdfcLog(`Error importing equity: ${error.message}`, 'error');
        }

        // Import Mutual Funds for Sanchita Pradeep only
        try {
            const mfResponse = await getHdfcMutualFunds();
            const mfHoldings = Array.isArray(mfResponse.data) ? mfResponse.data : [];
            
            if (mfHoldings.length > 0) {
                for (const memberId of HDFC_CONFIG.mf_members) {
                    const memberInfo = BROKER_MEMBER_MAPPING[memberId];
                    for (const mf of mfHoldings) {
                        // Check if investment already exists
                        if (!investments.some(inv => 
                            inv.member_id === memberId && 
                            inv.folio_number === mf.folio_number &&
                            inv.broker_platform.includes('HDFC Securities') &&
                            inv.investment_type === 'mutualFunds'
                        )) {
                            await addInvestmentData({
                                member_id: memberId,
                                investment_type: 'mutualFunds',
                                symbol_or_name: mf.fund_name || mf.scheme_name,
                                invested_amount: mf.units * mf.avg_nav,
                                current_value: mf.units * mf.current_nav,
                                broker_platform: `HDFC Securities MF (${memberInfo.name})`,
                                hdfc_data: mf,
                                fund_name: mf.fund_name || mf.scheme_name,
                                folio_number: mf.folio_number,
                                scheme_code: mf.scheme_code,
                                fund_house: mf.fund_house || 'Unknown',
                                mf_quantity: mf.units,
                                mf_nav: mf.current_nav,
                                mf_average_price: mf.avg_nav,
                                created_at: new Date().toISOString(),
                                last_updated: new Date().toISOString()
                            });
                            totalImported++;
                        }
                    }
                }
            }
        } catch (error) {
            hdfcLog(`Error importing MF: ${error.message}`, 'error');
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        const equityMember = BROKER_MEMBER_MAPPING[HDFC_CONFIG.equity_members[0]].name;
        const mfMember = BROKER_MEMBER_MAPPING[HDFC_CONFIG.mf_members[0]].name;
        
        showHdfcMessage(`Imported ${totalImported} total holdings (Equity: ${equityMember}, MF: ${mfMember})`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
    } catch (error) {
        console.error('Error importing HDFC holdings:', error);
        showHdfcMessage(`Failed to import holdings: ${error.message}`, 'error');
    }
}

// Import equity for Pradeep Kumar V only
async function hdfcImportEquity() {
    try {
        if (!hdfcAccessToken) {
            showHdfcMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHdfcMessage('Importing equity holdings from HDFC Securities...', 'info');
        
        const holdingsResponse = await getHdfcHoldings();
        const holdings = Array.isArray(holdingsResponse.data) ? holdingsResponse.data : [];
        
        if (holdings.length === 0) {
            showHdfcMessage('No equity holdings found', 'warning');
            return;
        }

        let count = 0;
        
        // Import equity for Pradeep Kumar V only
        for (const memberId of HDFC_CONFIG.equity_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];
            for (const holding of holdings) {
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.symbol_or_name === holding.symbol &&
                    inv.broker_platform.includes('HDFC Securities') &&
                    inv.investment_type === 'equity'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'equity',
                        symbol_or_name: holding.symbol || holding.tradingsymbol,
                        invested_amount: holding.quantity * holding.avg_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: `HDFC Securities Equity (${memberInfo.name})`,
                        hdfc_data: holding,
                        equity_quantity: holding.quantity,
                        equity_avg_price: holding.avg_price,
                        equity_symbol: holding.symbol,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHdfcMessage(`Imported ${count} equity holdings for ${BROKER_MEMBER_MAPPING[HDFC_CONFIG.equity_members[0]].name}`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('equity');
        }
    } catch (error) {
        console.error('Error importing HDFC equity:', error);
        showHdfcMessage(`Failed to import equity: ${error.message}`, 'error');
    }
}

// Import MF for Sanchita Pradeep only
async function hdfcImportMF() {
    try {
        if (!hdfcAccessToken) {
            showHdfcMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHdfcMessage('Importing mutual fund holdings from HDFC Securities...', 'info');
        
        const mfResponse = await getHdfcMutualFunds();
        const mfHoldings = Array.isArray(mfResponse.data) ? mfResponse.data : [];
        
        if (mfHoldings.length === 0) {
            showHdfcMessage('No mutual fund holdings found', 'warning');
            return;
        }

        let count = 0;
        
        // Import MF for Sanchita Pradeep only
        for (const memberId of HDFC_CONFIG.mf_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];
            for (const mf of mfHoldings) {
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.folio_number === mf.folio_number &&
                    inv.broker_platform.includes('HDFC Securities') &&
                    inv.investment_type === 'mutualFunds'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name || mf.scheme_name,
                        invested_amount: mf.units * mf.avg_nav,
                        current_value: mf.units * mf.current_nav,
                        broker_platform: `HDFC Securities MF (${memberInfo.name})`,
                        hdfc_data: mf,
                        fund_name: mf.fund_name || mf.scheme_name,
                        folio_number: mf.folio_number,
                        scheme_code: mf.scheme_code,
                        fund_house: mf.fund_house || 'Unknown',
                        mf_quantity: mf.units,
                        mf_nav: mf.current_nav,
                        mf_average_price: mf.avg_nav,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        const memberName = BROKER_MEMBER_MAPPING[HDFC_CONFIG.mf_members[0]].name;
        showHdfcMessage(`Imported ${count} mutual fund holdings for ${memberName}`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('mutualFunds');
        }
    } catch (error) {
        console.error('Error importing HDFC MF:', error);
        showHdfcMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

// Update prices for HDFC holdings
async function hdfcUpdatePrices() {
    try {
        if (!hdfcAccessToken) {
            showHdfcMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHdfcMessage('Updating HDFC Securities prices...', 'info');
        let updatedCount = 0;

        // Update equity prices for Pradeep Kumar V
        try {
            const holdings = await getHdfcHoldings();
            const equityHoldings = Array.isArray(holdings.data) ? holdings.data : [];
            
            for (const inv of investments.filter(i => 
                i.broker_platform.includes('HDFC Securities') && 
                i.investment_type === 'equity' &&
                HDFC_CONFIG.equity_members.includes(i.member_id)
            )) {
                const matchingHolding = equityHoldings.find(h => h.symbol === inv.symbol_or_name);
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

        // Update MF prices for Sanchita Pradeep
        try {
            const mfHoldings = await getHdfcMutualFunds();
            const mfData = Array.isArray(mfHoldings.data) ? mfHoldings.data : [];
            
            for (const inv of investments.filter(i => 
                i.broker_platform.includes('HDFC Securities') && 
                i.investment_type === 'mutualFunds' &&
                HDFC_CONFIG.mf_members.includes(i.member_id)
            )) {
                const matchingMF = mfData.find(mf => mf.folio_number === inv.folio_number);
                if (matchingMF) {
                    const invIndex = investments.findIndex(i => i.id === inv.id);
                    if (invIndex !== -1) {
                        investments[invIndex].current_value = matchingMF.units * matchingMF.current_nav;
                        investments[invIndex].mf_quantity = matchingMF.units;
                        investments[invIndex].mf_nav = matchingMF.current_nav;
                        investments[invIndex].last_updated = new Date().toISOString();
                    }
                    
                    if (typeof updateInvestmentData === 'function') {
                        await updateInvestmentData(inv.id, {
                            current_value: matchingMF.units * matchingMF.current_nav,
                            mf_quantity: matchingMF.units,
                            mf_nav: matchingMF.current_nav,
                            last_updated: new Date().toISOString()
                        });
                    }
                    updatedCount++;
                }
            }
        } catch (error) {
            console.error('Error updating MF prices:', error);
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHdfcMessage(`Updated ${updatedCount} HDFC Holdings`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
    } catch (error) {
        console.error('Error updating HDFC prices:', error);
        showHdfcMessage(`Failed to update prices: ${error.message}`, 'error');
    }
}

// ===== CONNECTION MANAGEMENT FUNCTIONS =====
async function connectHDFC() {
    try {
        const loginUrl = generateHdfcLoginURL();
        showHdfcMessage('Redirecting to HDFC Securities login...', 'info');
        window.open(loginUrl, '_blank');
    } catch (error) {
        showHdfcMessage(`Connection failed: ${error.message}`, 'error');
    }
}

function updateHdfcConnectionStatus() {
    try {
        const statusEl = document.getElementById('hdfc-connection-status');
        if (statusEl) {
            const connected = localStorage.getItem('hdfc_access_token');
            const userData = JSON.parse(localStorage.getItem('hdfc_user_data') || '{}');
            
            if (connected) {
                statusEl.textContent = `✅ Connected ${userData.user_name ? '(' + userData.user_name + ')' : ''}`;
                statusEl.style.color = '#28a745';
            } else {
                statusEl.textContent = '❌ Not Connected';
                statusEl.style.color = '#dc3545';
            }
        }
        
        const syncEl = document.getElementById('hdfc-last-sync');
        if (syncEl) {
            const lastSync = localStorage.getItem('hdfc_last_sync');
            if (lastSync) {
                const syncDate = new Date(lastSync);
                syncEl.textContent = `Last sync: ${syncDate.toLocaleString()}`;
            } else {
                syncEl.textContent = 'Last sync: Never';
            }
        }
    } catch (error) {
        console.error('Error updating HDFC connection status:', error);
    }
}

function disconnectHDFC() {
    clearHdfcStorage();
    showHdfcMessage('Disconnected from HDFC Securities', 'info');
    updateHdfcConnectionStatus();
}

// ===== SETTINGS MODAL =====
function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc_settings_modal');
    if (oldModal) oldModal.remove();

    const equityMembersList = HDFC_CONFIG.equity_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');
    const mfMembersList = HDFC_CONFIG.mf_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="hdfc_settings_modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🏦 HDFC Securities Settings</h3>
                    <button class="btn-close" onclick="document.getElementById('hdfc_settings_modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="connection-status">
                        <h4>Connection Status</h4>
                        <p id="hdfc-modal-connection">Checking...</p>
                        <p id="hdfc-modal-sync">Last sync: Never</p>
                    </div>
                    
                    <div class="account-mapping" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h4>📋 Account Mapping</h4>
                        <p><strong>Equity Holdings:</strong> ${equityMembersList}</p>
                        <p><strong>Mutual Funds:</strong> ${mfMembersList}</p>
                    </div>
                    
                    <div class="actions">
                        <button onclick="connectHDFC()" class="btn btn-primary">🔗 Connect to HDFC Securities</button>
                        <button onclick="disconnectHDFC()" class="btn btn-secondary">❌ Disconnect</button>
                    </div>
                    
                    <div class="help-text">
                        <p><strong>Steps to connect:</strong></p>
                        <ol>
                            <li>Click "Connect to HDFC Securities" above</li>
                            <li>Login with your InvestRight credentials</li>
                            <li>Authorize the application</li>
                            <li>Return to this dashboard to import holdings</li>
                        </ol>
                        <p class="help-text">
                            <strong>Note:</strong> You need an active HDFC Securities account and API access enabled.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateHdfcModalStatus();
}

function updateHdfcModalStatus() {
    const connectionSpan = document.getElementById('hdfc-modal-connection');
    const syncSpan = document.getElementById('hdfc-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('hdfc_access_token');
        connectionSpan.textContent = connected ? '✅ Connected' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('hdfc_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = `Last sync: ${syncDate.toLocaleString()}`;
        } else {
            syncSpan.textContent = 'Last sync: Never';
        }
    }
}

// ===== INITIALIZATION =====
// Initialize HDFC integration when the script loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize from storage on page load
    initHdfcFromStorage();
    
    // Update connection status
    updateHdfcConnectionStatus();
    
    // Update connection status every 30 seconds
    setInterval(updateHdfcConnectionStatus, 30000);
});

// Make functions globally available
window.hdfcImportAll = hdfcImportAll;
window.hdfcImportEquity = hdfcImportEquity;
window.hdfcImportMF = hdfcImportMF;
window.hdfcUpdatePrices = hdfcUpdatePrices;
window.connectHDFC = connectHDFC;
window.disconnectHDFC = disconnectHDFC;
window.showHDFCSettings = showHDFCSettings;

console.log('✅ HDFC Securities integration loaded successfully');
