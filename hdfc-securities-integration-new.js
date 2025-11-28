const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/',
    // Members mapping (fixed to match your setup)
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49',  // Pradeep Kumar V
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973',      // Sanchita Pradeep
    }
};

// Broker-Member mapping (like Zerodha)
const BROKER_MEMBER_MAPPING = {
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['HDFC Securities'],
        mutualFunds: ['FundsIndia'] // Pradeep uses FundsIndia for MF, not HDFC
    },
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities'] // Sanchita uses HDFC Securities for MF
    }
};

let hdfcAccessToken = null;
let hdfcTokenId = null;

// Utility functions (same as Zerodha)
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: [${type}] ${msg}`);
    }
}

function log(msg, type = 'info') {
    const emoji = {'info': 'ℹ️', 'success': '✅', 'warning': '⚠️', 'error': '❌'}[type];
    console.log(`${emoji} ${new Date().toISOString()} [HDFC] ${msg}`);
}

// Authorization flow
async function authorizeHDFC() {
    log("authorizeHDFC() called");
    try {
        showHDFCMessage('Redirecting to HDFC Securities authorization...', 'info');
        const resp = await fetch(`${HDFC_CONFIG.backend_base}/auth-url`, { method: 'GET' });
        const { url } = await resp.json();
        if (!url) throw new Error('No URL returned');
        log(`Redirecting browser to: ${url}`);
        window.location.href = url;
    } catch (err) {
        log(`Authorization failed: ${err.message}`, 'error');
        showHDFCMessage(`Authorization failed: ${err.message}`, 'error');
    }
}

// Test connection
async function testHDFCConnection() {
    log("testHDFCConnection() called");
    const statusElement = document.getElementById('hdfc-connection-status');
    const lastSyncElement = document.getElementById('hdfc-last-sync');
    
    if (statusElement) statusElement.textContent = 'Testing...';
    
    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        log("Connection test response:", 'info');
        console.log(data);

        if (response.ok && data.connected) {
            if (statusElement) {
                statusElement.textContent = 'Connected ✓';
                statusElement.style.color = '#28a745';
            }
            if (lastSyncElement && data.lastSync) {
                lastSyncElement.textContent = `Last sync: ${new Date(data.lastSync).toLocaleString()}`;
            }
            if (data.accessToken) {
                localStorage.setItem('hdfcaccesstoken', data.accessToken);
            }
        } else {
            if (statusElement) {
                statusElement.textContent = 'Not connected';
                statusElement.style.color = '#dc3545';
            }
            if (lastSyncElement) lastSyncElement.textContent = '';
        }
    } catch (error) {
        log(`Connection test failed: ${error.message}`, 'error');
        if (statusElement) {
            statusElement.textContent = 'Connection failed';
            statusElement.style.color = '#dc3545';
        }
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// **MAIN IMPORT FUNCTION - Fixed to work like Zerodha**
// Replace the existing fetchAndImportHoldings function with this fixed version
async function fetchAndImportHoldings() {
    log("fetchAndImportHoldings triggered", 'info');
    
    try {
        showHDFCMessage("Importing HDFC holdings...", "info");
        
        // ✅ FIXED: Use same-origin request instead of cross-origin
        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback`, {
            method: 'GET',
            mode: 'cors',  // Explicitly set CORS mode
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        log(`Backend response received: ${result.data?.length || 0} holdings`, 'info');
        
        // Rest of your existing import logic...
        if (!result.data || !Array.isArray(result.data)) {
            throw new Error('Invalid holdings data structure');
        }
        
        const holdings = result.data;
        // ... continue with your existing code
        
    } catch (err) {
        log(`Import failed: ${err.message}`, 'error');
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
        console.error('Full error details:', err);
    }
}

// Settings modal (same structure as Zerodha)
function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc-settings-modal');
    if (oldModal) oldModal.remove();
    
    const modalContent = `
        <div id="hdfc-settings-modal" class="modal" style="display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.4);">
            <div class="modal-content" style="background-color:#fefefe; margin:10% auto; padding:20px; border:1px solid #888; width:90%; max-width:500px; border-radius:10px;">
                <span class="close" onclick="document.getElementById('hdfc-settings-modal').remove()" style="color:#aaa; float:right; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
                
                <h2 style="color:#333; margin-bottom:20px;">HDFC Securities Settings</h2>
                
                <div class="hdfc-status-section" style="margin-bottom:25px; padding:15px; border:1px solid #ddd; border-radius:8px; background:#f9f9f9;">
                    <h3 style="margin-bottom:15px; color:#555;">Connection Status</h3>
                    <div id="hdfc-status" style="margin-bottom:15px;">
                        <span id="hdfc-connection-status" style="font-weight:bold;">Checking...</span>
                        <div id="hdfc-last-sync" style="font-size:0.9em; color:#666; margin-top:5px;"></div>
                    </div>
                    
                    <button onclick="testHDFCConnection()" style="background:#007bff; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-right:10px;">
                        Test Connection
                    </button>
                    
                    <button onclick="authorizeHDFC()" style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-right:10px;">
                        Authorize HDFC
                    </button>
                    
                    <button onclick="fetchAndImportHoldings()" style="background:#17a2b8; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                        Import Holdings
                    </button>
                </div>
                
                <div class="hdfc-info" style="font-size:0.9em; color:#666;">
                    <p><strong>Account Mapping:</strong></p>
                    <ul style="margin:10px 0; padding-left:20px;">
                        <li><strong>Equity Holdings</strong> → Pradeep Kumar V</li>
                        <li><strong>Mutual Fund Holdings</strong> → Sanchita Pradeep</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalContent);
    testHDFCConnection();
}

// Helper function (same as Zerodha)
async function getCurrentUser() {
    if (typeof supabaseClient !== 'undefined') {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    }
    return null;
}

// **EXPOSE FUNCTIONS GLOBALLY (same as Zerodha)**
window.showHDFCSettings = showHDFCSettings;
window.authorizeHDFC = authorizeHDFC;
window.testHDFCConnection = testHDFCConnection;
window.fetchAndImportHoldings = fetchAndImportHoldings;

log('HDFC Securities integration loaded successfully', 'success');
