// zerodha-integration-fixed.js — Corrected full version with modal and member mapping

const ZERODHA_CONFIG = {
    api_key: 'ci3r8v1cbqb6e73p', // Your actual API key here
    base_url: 'https://api.kite.trade',
    login_url: 'https://kite.zerodha.com/connect/login'
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
    if (typeof showMessage === 'function') {
        showMessage(`Zerodha: ${msg}`, type);
    } else {
        console.log(msg);
    }
}

function safeHTML(el, html) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    el.innerHTML = '';
    while (tmp.firstChild) el.appendChild(tmp.firstChild);
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

// Authentication
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

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(data.error || data.message || 'Session creation failed');
        }

        zerodhaAccessToken = data.data.access_token;
        localStorage.setItem('zerodha_access_token', zerodhaAccessToken);
        localStorage.setItem('zerodha_user_data', JSON.stringify(data.data));
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

// API requests
async function apiRequest(endpoint, method = 'GET', params = {}) {
    if (!zerodhaAccessToken) throw new Error('Not connected');
    if (!canMakeAPICall()) throw new Error('API rate limited');

    const url = new URL(`${ZERODHA_CONFIG.base_url}${endpoint}`);
    const options = {
        method,
        headers: {
            'Authorization': `token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
            'X-Kite-Version': '3',
            'Content-Type': 'application/json'
        }
    };

    if (method === 'GET') {
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    } else {
        options.body = JSON.stringify(params);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message || 'API error');
    return data.data;
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

// Import and update
async function importHoldings() {
    try {
        const pradeepId = 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49';
        const holdingsResponse = await getHoldings();
        
        // Defensive: log and check that response is as expected
        console.log('Holdings response:', holdingsResponse);
        if (!holdingsResponse || holdingsResponse.status !== 'success' || !Array.isArray(holdingsResponse.data)) {
            throw new Error('Import failed: holdings is not an array or fetch errored');
        }

        const holdings = holdingsResponse.data;
        const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');
        let count = 0;

        for (const holding of holdings) {
            if (!investments.some(inv => 
                inv.member_id === pradeepId && 
                inv.symbol_or_name === holding.tradingsymbol && 
                inv.broker_platform.includes('Zerodha')
            )) {
                await addInvestmentData({
                    member_id: pradeepId,
                    investment_type: 'equity',
                    symbol_or_name: holding.tradingsymbol,
                    invested_amount: holding.quantity * holding.average_price,
                    current_value: holding.quantity * holding.last_price,
                    broker_platform: `Zerodha (${userData.user_id})`,
                    zerodha_data: holding,
                    created_at: new Date().toISOString(),
                    last_updated: new Date().toISOString()
                });
                count++;
            }
        }

        showZerodhaMessage(`Imported ${count} holdings`, 'success');
        await loadDashboardData();
    } catch (error) {
        log(error.message, 'error');
        showZerodhaMessage(`Import failed: ${error.message}`, 'error');
        throw error;
    }
}

// FIXED: updatePrices function with corrected syntax and error handling
async function updatePrices() {
    try {
        if (!zerodhaAccessToken) {
            throw new Error('Not connected to Zerodha');
        }

        log('Starting price update...', 'info');
        const holdingsResponse = await getHoldings();
        
        // Check if holdings response is valid
        if (!holdingsResponse || holdingsResponse.status !== 'success' || !Array.isArray(holdingsResponse.data)) {
            throw new Error('Failed to fetch holdings data');
        }

        const holdings = holdingsResponse.data; // Fixed: consistent variable naming
        let updatedCount = 0;

        // Update prices for existing Zerodha investments
        for (const inv of investments.filter(i => i.broker_platform && i.broker_platform.includes('Zerodha'))) {
            const matchingHolding = holdings.find(h => h.tradingsymbol === inv.symbol_or_name);
            if (matchingHolding) {
                try {
                    await updateInvestmentInDashboard(inv.id, {
                        current_value: matchingHolding.quantity * matchingHolding.last_price,
                        last_updated: new Date().toISOString()
                    });
                    updatedCount++;
                } catch (updateError) {
                    log(`Failed to update ${inv.symbol_or_name}: ${updateError.message}`, 'warning');
                }
            }
        }

        showZerodhaMessage(`Updated ${updatedCount} prices successfully`, 'success');
        log(`Price update completed: ${updatedCount} investments updated`, 'success');
        
        // Refresh the dashboard to show updated values
        await loadDashboardData();
        
    } catch (error) {
        log(`Price update failed: ${error.message}`, 'error');
        showZerodhaMessage(`Price update failed: ${error.message}`, 'error');
        throw error;
    }
}

// Example: render all investments for Pradeep in a table or list
function renderInvestmentsForPradeep() {
    const pradeepId = 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49';
    const pradeepInvestments = investments.filter(inv => inv.member_id === pradeepId);
    
    // Replace this with your actual rendering logic
    const container = document.getElementById('investment-list-container');
    if (container) {
        container.innerHTML = '';
        pradeepInvestments.forEach(inv => {
            const div = document.createElement('div');
            div.textContent = `${inv.symbol_or_name}: Qty ${inv.quantity || '-'}, Current ₹${inv.current_value.toFixed(2)}`;
            container.appendChild(div);
        });
    }
}

// Auto refresh
function startAuto(minutes) {
    clearInterval(autoRefreshInterval);
    if (minutes > 0) {
        refreshIntervalMinutes = minutes;
        autoRefreshInterval = setInterval(() => {
            updatePrices().catch(error => {
                log(`Auto refresh failed: ${error.message}`, 'error');
            });
        }, minutes * 60 * 1000);
        localStorage.setItem('zerodha_refresh', minutes);
        updateNextRefreshText();
    }
}

function stopAuto() {
    clearInterval(autoRefreshInterval);
    refreshIntervalMinutes = 0;
    localStorage.removeItem('zerodha_refresh');
    updateNextRefreshText();
}

function updateNextRefreshText() {
    const el = document.getElementById('next-refresh');
    if (el) {
        el.textContent = refreshIntervalMinutes > 0 
            ? `Next refresh: ${new Date(Date.now() + refreshIntervalMinutes * 60000).toLocaleTimeString()}` 
            : '';
    }
}

// FIXED: Settings Modal with proper error handling and HTML structure
function showSettings() {
    try {
        // Remove any previous modal instance before inserting new one
        const oldModal = document.getElementById('zerodha_settings_modal');
        if (oldModal) oldModal.remove();

        const connected = !!zerodhaAccessToken;
        const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');
        
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal" id="zerodha_settings_modal" style="display: block;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🔗 Zerodha Integration Settings</h3>
                        <span class="btn-close" onclick="closeZerodhaModal()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="connection-status">
                            <p><strong>Status:</strong> ${connected ? '✅ Connected' : '❌ Not Connected'}</p>
                            ${connected ? `
                                <p><strong>User:</strong> ${userData.user_name || 'N/A'} (${userData.user_id || 'N/A'})</p>
                                <p><strong>Broker:</strong> ${userData.broker || 'N/A'}</p>
                            ` : ''}
                        </div>
                        
                        <div class="actions">
                            ${!connected ? `
                                <button class="btn btn-primary" onclick="connectToZerodha()">
                                    🔗 Connect to Zerodha
                                </button>
                                <p class="help-text">Click to authenticate with your Zerodha account</p>
                            ` : `
                                <button class="btn btn-success" onclick="importHoldings()">
                                    📥 Import Holdings
                                </button>
                                <button class="btn btn-info" onclick="updatePrices()">
                                    🔄 Update Prices
                                </button>
                                <button class="btn btn-danger" onclick="disconnectZerodha()">
                                    ❌ Disconnect
                                </button>
                            `}
                        </div>
                        
                        ${connected ? `
                            <div class="auto-refresh">
                                <h4>🔄 Auto Refresh</h4>
                                <select id="refresh_interval" onchange="handleRefreshChange()">
                                    <option value="0">Disabled</option>
                                    <option value="5">Every 5 minutes</option>
                                    <option value="15">Every 15 minutes</option>
                                    <option value="30">Every 30 minutes</option>
                                    <option value="60">Every hour</option>
                                </select>
                                <p id="next-refresh" class="help-text"></p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `);

        // Set current refresh interval
        if (connected) {
            const refreshSelect = document.getElementById('refresh_interval');
            if (refreshSelect) {
                refreshSelect.value = refreshIntervalMinutes || 0;
            }
            updateNextRefreshText();
        }
        
    } catch (error) {
        log(`Failed to show settings: ${error.message}`, 'error');
        showZerodhaMessage(`Failed to open settings: ${error.message}`, 'error');
    }
}

// Helper functions for the modal
function closeZerodhaModal() {
    const modal = document.getElementById('zerodha_settings_modal');
    if (modal) modal.remove();
}

function connectToZerodha() {
    window.location.href = generateLoginURL();
}

function disconnectZerodha() {
    clearStorage();
    showZerodhaMessage('Disconnected from Zerodha', 'info');
    closeZerodhaModal();
}

function handleRefreshChange() {
    const select = document.getElementById('refresh_interval');
    if (select) {
        const minutes = parseInt(select.value) || 0;
        if (minutes > 0) {
            startAuto(minutes);
            showZerodhaMessage(`Auto refresh enabled: every ${minutes} minutes`, 'success');
        } else {
            stopAuto();
            showZerodhaMessage('Auto refresh disabled', 'info');
        }
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async function() {
    log('Initializing Zerodha integration...', 'info');
    
    try {
        // Check for request token from redirect
        const requestToken = extractRequestToken();
        if (requestToken) {
            const sessionData = await generateSession(requestToken);
            showZerodhaMessage('Successfully connected to Zerodha!', 'success');
            
            // Clean up URL
            const url = new URL(window.location);
            url.search = '';
            window.history.replaceState({}, document.title, url.toString());
        } else {
            // Try to initialize from storage
            await initFromStorage();
        }
        
        // Restore auto refresh setting
        const savedRefresh = localStorage.getItem('zerodha_refresh');
        if (savedRefresh && zerodhaAccessToken) {
            startAuto(parseInt(savedRefresh));
        }
        
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
    }
});

// Make functions globally available
window.showSettings = showSettings;
window.zerodhaUpdatePrices = updatePrices;
window.zerodhaImportHoldings = importHoldings;
window.closeZerodhaModal = closeZerodhaModal;
window.connectToZerodha = connectToZerodha;
window.disconnectZerodha = disconnectZerodha;
window.handleRefreshChange = handleRefreshChange;
