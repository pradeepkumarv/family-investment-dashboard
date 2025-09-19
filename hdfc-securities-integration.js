// HDFC Securities Integration - Updated for Render Website Authentication
const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    // Updated backend base - keeping your Vercel backend for API calls
    backend_base: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    // Render website for authentication
    render_auth_url: 'https://family-investment-dashboard.onrender.com/',
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49', // Pradeep Kumar V
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973', // Sanchita Pradeep
    }
};

let hdfcAccessToken = null;
let hdfcTokenId = null;

// Utility function for messages
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: ${msg}`);
    }
}

// MAIN HDFC SETTINGS MODAL FUNCTION - Updated to redirect to Render
function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc-settings-modal');
    if (oldModal) oldModal.remove();

    const modalContent = `
    <div id="hdfc-settings-modal" class="modal" style="display:block; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
        <div style="background:#fff; max-width:700px; margin:3% auto; padding:24px; border-radius:12px; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-size:24px; color:#2c5aa0;">🏦 HDFC Securities Settings</h3>
                <button onclick="closeHDFCModal()" style="background:none; border:none; font-size:28px; cursor:pointer; color:#666; line-height:1;">&times;</button>
            </div>
            
            <div class="connection-status" style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left:4px solid #3b82f6;">
                <h4 style="margin:0 0 12px 0; color:#1e40af;">Connection Status</h4>
                <div id="hdfc-connection-status">Not Connected</div>
                <div style="margin-top: 8px; font-size: 14px; color: #64748b;">
                    Last sync: <span id="hdfc-last-sync">Never</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:24px;">
                <button onclick="authenticateWithRender()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#3b82f6; color:white;">
                    🔐 Authenticate with HDFC
                </button>
                
                <button onclick="disconnectHDFC()" style="padding:12px 20px; border:2px solid #e5e7eb; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:white; color:#374151;">
                    Disconnect
                </button>
                
                <button onclick="testHDFCConnection()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#06b6d4; color:white;">
                    Test Connection
                </button>
                
                <button onclick="importHDFCHoldings()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#059669; color:white;">
                    📥 Import Holdings
                </button>
            </div>

            <div class="account-mapping" style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin-bottom: 24px; border-left:4px solid #10b981;">
                <h4 style="margin:0 0 12px 0; color:#047857;">Account Mapping</h4>
                <div style="font-size:14px; line-height:1.6;">
                    <strong>Equity Holdings:</strong> Pradeep Kumar V<br>
                    <strong>Mutual Funds:</strong> Sanchita Pradeep
                </div>
            </div>

            <div style="background: #fffbeb; padding: 20px; border-radius: 10px; border-left:4px solid #f59e0b;">
                <h4 style="margin:0 0 12px 0; color:#92400e;">Authentication Flow</h4>
                <div style="font-size:14px; line-height:1.6; color:#78350f;">
                    1. Click "Authenticate with HDFC" to redirect to secure authentication<br>
                    2. Complete login with your HDFC Securities credentials<br>
                    3. Return automatically to import your holdings<br>
                    4. Holdings will be mapped to family members automatically
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateHDFCConnectionStatus();
}

// NEW FUNCTION: Redirect to Render for authentication
function authenticateWithRender() {
    showHDFCMessage('Redirecting to secure authentication...', 'info');
    
    // Store current dashboard URL for return
    const returnUrl = encodeURIComponent(window.location.href);
    
    // Redirect to Render authentication with return URL
    const renderAuthUrl = `${HDFC_CONFIG.render_auth_url}?return_url=${returnUrl}&action=hdfc_auth`;
    
    closeHDFCModal();
    showHDFCMessage('Opening secure authentication window...', 'info');
    
    // Redirect to Render website
    window.location.href = renderAuthUrl;
}

// FUNCTION: Handle return from authentication
function handleAuthReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth_status');
    const authToken = urlParams.get('auth_token');
    const error = urlParams.get('error');

    if (authStatus === 'success' && authToken) {
        // Store the authentication token
        hdfcAccessToken = authToken;
        localStorage.setItem('hdfc_access_token', hdfcAccessToken);
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        showHDFCMessage('Authentication successful! You can now import holdings.', 'success');
        updateHDFCConnectionStatus();
        
        // Auto-import holdings after successful authentication
        setTimeout(() => {
            importHDFCHoldings();
        }, 2000);
        
        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
    } else if (error) {
        showHDFCMessage(`Authentication failed: ${error}`, 'error');
    }
}

// FETCH HOLDINGS FROM BACKEND (Updated)
async function fetchHDFCHoldings(type = 'equity') {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            access_token: token,
            api_key: HDFC_CONFIG.api_key,
            type: type
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch holdings');
    }
    return data;
}

// IMPORT HOLDINGS FUNCTION (Updated)
async function importHDFCHoldings() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        showHDFCMessage('Please authenticate with HDFC Securities first', 'warning');
        return;
    }

    showHDFCMessage('Importing HDFC holdings...', 'info');

    try {
        // Import Equity Holdings (Pradeep Kumar V)
        const equityData = await fetchHDFCHoldings('equity');
        let equityCount = 0;
        
        if (equityData.data && Array.isArray(equityData.data)) {
            for (const holding of equityData.data) {
                await addInvestmentData({
                    member_id: HDFC_CONFIG.members.equity,
                    investment_type: 'equity',
                    symbol_or_name: holding.symbol || holding.tradingsymbol,
                    invested_amount: (holding.quantity || 0) * (holding.average_price || 0),
                    current_value: (holding.quantity || 0) * (holding.last_price || 0),
                    broker_platform: 'HDFC Securities - Equity (Pradeep)',
                    hdfc_data: holding,
                    created_at: new Date().toISOString()
                });
                equityCount++;
            }
        }

        // Import Mutual Fund Holdings (Sanchita Pradeep)
        const mfData = await fetchHDFCHoldings('mf');
        let mfCount = 0;
        
        if (mfData.data && Array.isArray(mfData.data)) {
            for (const holding of mfData.data) {
                await addInvestmentData({
                    member_id: HDFC_CONFIG.members.mf,
                    investment_type: 'mutualFunds',
                    symbol_or_name: holding.fund_name || holding.scheme_name,
                    invested_amount: (holding.units || 0) * (holding.average_nav || 0),
                    current_value: (holding.units || 0) * (holding.nav || 0),
                    broker_platform: 'HDFC Securities - MF (Sanchita)',
                    hdfc_data: holding,
                    created_at: new Date().toISOString()
                });
                mfCount++;
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Holdings imported successfully! ${equityCount} equity + ${mfCount} mutual funds`, 'success');

        // Refresh dashboard data
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Import Error:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

// CONNECTION STATUS FUNCTIONS
function updateHDFCConnectionStatus() {
    const statusEl = document.getElementById('hdfc-connection-status');
    const syncEl = document.getElementById('hdfc-last-sync');
    
    if (statusEl) {
        const connected = localStorage.getItem('hdfc_access_token');
        statusEl.textContent = connected ? 'Connected' : 'Not Connected';
        statusEl.style.color = connected ? '#059669' : '#dc2626';
    }
    
    if (syncEl) {
        const lastSync = localStorage.getItem('hdfc_last_sync');
        syncEl.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
    }
}

function disconnectHDFC() {
    localStorage.removeItem('hdfc_access_token');
    localStorage.removeItem('hdfc_last_sync');
    hdfcAccessToken = null;
    hdfcTokenId = null;
    updateHDFCConnectionStatus();
    showHDFCMessage('Disconnected from HDFC Securities', 'info');
}

async function testHDFCConnection() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        showHDFCMessage('No access token found. Please authenticate first.', 'warning');
        return;
    }

    try {
        await fetchHDFCHoldings('equity');
        showHDFCMessage('Connection test successful!', 'success');
    } catch (error) {
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// MODAL CLOSE FUNCTIONS
function closeHDFCModal() {
    const modal = document.getElementById('hdfc-settings-modal');
    if (modal) {
        modal.remove();
    }
}

// INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('hdfc_access_token');
    if (savedToken) {
        hdfcAccessToken = savedToken;
    }
    
    // Check if returning from authentication
    handleAuthReturn();
    
    updateHDFCConnectionStatus();
});

// MAKE FUNCTIONS GLOBALLY AVAILABLE
window.showHDFCSettings = showHDFCSettings;
window.authenticateWithRender = authenticateWithRender;
window.disconnectHDFC = disconnectHDFC;
window.testHDFCConnection = testHDFCConnection;
window.importHDFCHoldings = importHDFCHoldings;
window.closeHDFCModal = closeHDFCModal;
window.handleAuthReturn = handleAuthReturn;
