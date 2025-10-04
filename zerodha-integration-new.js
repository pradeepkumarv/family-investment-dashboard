// Zerodha Integration - Updated for New Database Structure
// Uses separate tables for equity and mutual funds with delete-then-insert logic

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

const ZERODHA_CONFIG = {
    api_key: 'ci3r8v1cbqb6e73p',
    base_url: 'https://api.kite.trade',
    login_url: 'https://kite.zerodha.com/connect/login',
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'],
    mf_members: ['c2f4b3d8-bb69-4516-b107-dffbde92c77c']
};

let zerodhaAccessToken = null;
let autoRefreshInterval = null;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000;
const MAX_API_CALLS_PER_MINUTE = 100;

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

// NEW: Import all holdings with delete-then-insert logic
async function zerodhaImportAll() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        if (!window.dbHelpers) {
            showZerodhaMessage('Database helpers not initialized', 'error');
            return;
        }

        // Get current user from Supabase
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
            for (const memberId of ZERODHA_CONFIG.equity_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];

                // DELETE existing Zerodha equity holdings for this member
                await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                    user.id,
                    'Zerodha',
                    memberId
                );

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

                await window.dbHelpers.insertEquityHoldings(equityRecords);
                totalImported += equityRecords.length;
            }
        }

        // Import Mutual Funds for Saanvi Pradeep ONLY
        const mfResponse = await getMutualFunds();
        const mfHoldings = Array.isArray(mfResponse.data) ? mfResponse.data : [];

        if (mfHoldings.length > 0) {
            for (const memberId of ZERODHA_CONFIG.mf_members) {
                const memberInfo = BROKER_MEMBER_MAPPING[memberId];

                // DELETE existing Zerodha MF holdings for this member
                await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                    user.id,
                    'Zerodha',
                    memberId
                );

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

                await window.dbHelpers.insertMutualFundHoldings(mfRecords);
                totalImported += mfRecords.length;
            }
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        const equityMember = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.equity_members[0]].name;
        const mfMember = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.mf_members[0]].name;
        showZerodhaMessage(`Imported ${totalImported} holdings (Equity: ${holdings.length} for ${equityMember}, MF: ${mfHoldings.length} for ${mfMember})`, 'success');

        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error importing all holdings:', error);
        showZerodhaMessage(`Failed to import holdings: ${error.message}`, 'error');
    }
}

// Import equity only
async function zerodhaImportEquity() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        if (!window.dbHelpers) {
            showZerodhaMessage('Database helpers not initialized', 'error');
            return;
        }

        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showZerodhaMessage('Please log in first', 'error');
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
        const importDate = new Date().toISOString().split('T')[0];

        for (const memberId of ZERODHA_CONFIG.equity_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];

            // DELETE existing Zerodha equity holdings for this member
            await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                user.id,
                'Zerodha',
                memberId
            );

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

            await window.dbHelpers.insertEquityHoldings(equityRecords);
            count += equityRecords.length;
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        showZerodhaMessage(`Imported ${count} equity holdings for ${BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.equity_members[0]].name}`, 'success');

        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error importing equity:', error);
        showZerodhaMessage(`Failed to import equity: ${error.message}`, 'error');
    }
}

// Import MF only
async function zerodhaImportMF() {
    try {
        if (!localStorage.getItem('zerodha_access_token')) {
            showZerodhaMessage('Please connect to Zerodha first', 'warning');
            return;
        }

        if (!window.dbHelpers) {
            showZerodhaMessage('Database helpers not initialized', 'error');
            return;
        }

        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showZerodhaMessage('Please log in first', 'error');
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
        const importDate = new Date().toISOString().split('T')[0];

        for (const memberId of ZERODHA_CONFIG.mf_members) {
            const memberInfo = BROKER_MEMBER_MAPPING[memberId];

            // DELETE existing Zerodha MF holdings for this member
            await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                user.id,
                'Zerodha',
                memberId
            );

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

            await window.dbHelpers.insertMutualFundHoldings(mfRecords);
            count += mfRecords.length;
        }

        localStorage.setItem('zerodha_last_sync', new Date().toISOString());

        const memberName = BROKER_MEMBER_MAPPING[ZERODHA_CONFIG.mf_members[0]].name;
        showZerodhaMessage(`Imported ${count} mutual fund holdings for ${memberName}`, 'success');

        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error importing MF:', error);
        showZerodhaMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

async function connectZerodha() {
    try {
        const loginUrl = generateLoginURL();
        showZerodhaMessage('Redirecting to Zerodha login...', 'info');
        window.open(loginUrl, '_blank');
    } catch (error) {
        showZerodhaMessage(`Connection failed: ${error.message}`, 'error');
    }
}

function updateConnectionStatus() {
    try {
        const statusEl = document.getElementById('zerodha-connection-status');
        if (statusEl) {
            const connected = localStorage.getItem('zerodha_access_token');
            const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');

            if (connected) {
                statusEl.textContent = `Connected ${userData.user_name ? '(' + userData.user_name + ')' : ''}`;
                statusEl.style.color = '#28a745';
            } else {
                statusEl.textContent = 'Not Connected';
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
        connectionSpan.textContent = connected ? 'Connected' : 'Disconnected';
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
        statusEl.textContent = 'Not Connected';
        statusEl.style.color = '#dc3545';
    }
}

function setZerodhaAutoUpdate() {
    const intervalSelect = document.getElementById('zerodha_update_interval');
    if (!intervalSelect) return;

    const minutes = parseInt(intervalSelect.value);

    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }

    if (minutes > 0) {
        autoRefreshInterval = setInterval(zerodhaImportAll, minutes * 60 * 1000);
        localStorage.setItem('zerodha_refresh_interval', minutes.toString());
        showZerodhaMessage(`Auto-update set to ${minutes} minutes`, 'success');
    } else {
        localStorage.removeItem('zerodha_refresh_interval');
        showZerodhaMessage('Auto-update disabled', 'info');
    }
}

function showZerodhaSettings() {
    const oldModal = document.getElementById('zerodha_settings_modal');
    if (oldModal) oldModal.remove();

    const equityMembersList = ZERODHA_CONFIG.equity_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');
    const mfMembersList = ZERODHA_CONFIG.mf_members.map(id => BROKER_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="zerodha_settings_modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Zerodha Settings</h3>
                    <button class="btn-close" onclick="closeZerodhaModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>Connection</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="connectZerodha()" class="btn btn-primary">Connect to Zerodha</button>
                            <button onclick="disconnectZerodha()" class="btn btn-secondary">Disconnect</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Click Connect to authenticate with your Zerodha account</p>
                    </div>

                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>Account Mapping</h4>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Equity Holdings:</strong> ${equityMembersList}</p>
                            <p><strong>Mutual Fund Holdings:</strong> ${mfMembersList}</p>
                        </div>
                        <div style="background: #fef5e7; border: 1px solid #f6ad55; border-radius: 6px; padding: 10px; margin-top: 10px;">
                            <p style="font-size: 12px; color: #744210; margin: 0;"><strong>Note:</strong> Data is deleted and re-imported fresh on each import.</p>
                        </div>
                    </div>

                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>Import Options</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="zerodhaImportAll()" class="btn btn-success" style="background: #805ad5;">Import All (Recommended)</button>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="zerodhaImportEquity()" class="btn btn-success">Import Equity Only</button>
                            <button onclick="zerodhaImportMF()" class="btn btn-info">Import MF Only</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Import All will fetch equity for Pradeep and MF for Saanvi</p>
                    </div>

                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>Auto Update</h4>
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
                        <h4>Status</h4>
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

function closeZerodhaModal() {
    const modal = document.getElementById('zerodha_settings_modal');
    if (modal) modal.remove();
}

// Make functions globally available
window.zerodhaImportAll = zerodhaImportAll;
window.zerodhaImportEquity = zerodhaImportEquity;
window.zerodhaImportMF = zerodhaImportMF;
window.connectZerodha = connectZerodha;
window.disconnectZerodha = disconnectZerodha;
window.setZerodhaAutoUpdate = setZerodhaAutoUpdate;
window.showZerodhaSettings = showZerodhaSettings;
window.closeZerodhaModal = closeZerodhaModal;

console.log('Zerodha integration with new database structure loaded');

window.addEventListener('load', async () => {
    console.log('Zerodha integration initializing...');

    const tokenExists = await initFromStorage();
    updateConnectionStatus();

    const requestToken = extractRequestToken();
    if (requestToken) {
        console.log('Processing OAuth callback...');
        try {
            await generateSession(requestToken);
            showZerodhaMessage('Successfully connected to Zerodha!', 'success');

            const url = new URL(window.location);
            url.searchParams.delete('request_token');
            url.searchParams.delete('action');
            url.searchParams.delete('status');
            window.history.replaceState({}, document.title, url);

        } catch (error) {
            console.error('OAuth callback failed:', error);
            showZerodhaMessage('Failed to complete Zerodha connection', 'error');
        }
    }

    const savedInterval = localStorage.getItem('zerodha_refresh_interval');
    if (savedInterval && parseInt(savedInterval) > 0) {
        const minutes = parseInt(savedInterval);
        autoRefreshInterval = setInterval(zerodhaImportAll, minutes * 60 * 1000);
        log(`Auto-update resumed: ${minutes} minutes`, 'info');
    }

    console.log('Zerodha integration ready');
});

window.addEventListener('storage', (e) => {
    if (e.key === 'zerodha_access_token') {
        updateConnectionStatus();
    }
});

setInterval(() => {
    updateConnectionStatus();
}, 30000);
