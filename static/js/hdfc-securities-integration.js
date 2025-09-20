// HDFC Securities Integration - Final Clean Version
const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/'
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

// MAIN HDFC SETTINGS MODAL FUNCTION
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
                    
                    <button id="hdfc-test-connection" onclick="testHDFCConnection()" 
                            style="background:#007bff; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; margin-right:10px;">
                        Test Connection
                    </button>
                    
                    <button id="hdfc-authorize-btn" onclick="authorizeHDFC()" 
                            style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                        Authorize HDFC
                    </button>
                </div>
                
                <div class="hdfc-info" style="font-size:0.9em; color:#666;">
                    <p><strong>Automatic Import:</strong></p>
                    <p>After you log in and validate OTP, your HDFC holdings will be imported automatically into your dashboard.</p>
                    <ul style="margin:10px 0; padding-left:20px;">
                        <li>Equity Holdings → mapped to <strong>Pradeep Kumar V</strong></li>
                        <li>Mutual Fund Holdings → mapped to <strong>Sanchita Pradeep</strong></li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Test connection immediately when modal opens
    testHDFCConnection();
}

// Authorize with backend
async function authorizeHDFC() {
    try {
        showHDFCMessage('Redirecting to HDFC Securities authorization...', 'info');
        const resp = await fetch(`${HDFC_CONFIG.backend_base}/auth-url`, { method: 'GET' });
        const { url } = await resp.json();
        if (!url) throw new Error('No URL returned');
        window.location.href = url;
    } catch (err) {
        console.error('HDFC Authorization Error:', err);
        showHDFCMessage(`Authorization failed: ${err.message}`, 'error');
    }
}

// Test HDFC connection
async function testHDFCConnection() {
    const statusElement = document.getElementById('hdfc-connection-status');
    const lastSyncElement = document.getElementById('hdfc-last-sync');
    
    if (statusElement) statusElement.textContent = 'Testing...';
    
    try {
        const supabaseUser = await getCurrentUser();
        if (!supabaseUser) {
            if (statusElement) statusElement.textContent = 'Not logged in';
            return;
        }

        const response = await fetch(`${HDFC_CONFIG.backend_base}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${supabaseUser.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
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
        console.error('HDFC Connection Test Error:', error);
        if (statusElement) {
            statusElement.textContent = 'Connection failed';
            statusElement.style.color = '#dc3545';
        }
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// Import holdings after OTP callback
async function fetchAndImportHoldings() {
    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback`, {
            method: 'GET',
            credentials: 'include'  // keep session cookies for Flask
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch holdings');

        if (Array.isArray(result.data)) {
            let insertedCount = 0;
            for (const holding of result.data) {
                await addInvestmentData({
                    memberid: holding.member_id,
                    investmenttype: holding.investment_type,
                    symbolorname: holding.tradingsymbol || holding.symbol || holding.schemename || 'Unknown',
                    investedamount: parseFloat(holding.quantity || holding.units) || 0,
                    averageprice: parseFloat(holding.averageprice || holding.averagenav) || 0,
                    currentvalue: (parseFloat(holding.quantity || holding.units) || 0) *
                                  (parseFloat(holding.lastprice || holding.nav) || 0),
                    lastprice: parseFloat(holding.lastprice || holding.nav) || 0,
                    brokerplatform: 'HDFC Securities',
                    hdfcdata: JSON.stringify(holding),
                    createdat: new Date().toISOString()
                });
                insertedCount++;
            }
            showHDFCMessage(`✅ Imported ${insertedCount} holdings from callback`, 'success');
        } else {
            showHDFCMessage('⚠️ No holdings found in callback response', 'warning');
        }
    } catch (err) {
        console.error('Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
    }
}

// Helper function to get current Supabase user
async function getCurrentUser() {
    if (typeof supabaseClient !== 'undefined') {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    }
    return null;
}

// Expose functions globally
window.showHDFCSettings = showHDFCSettings;
window.authorizeHDFC = authorizeHDFC;
window.testHDFCConnection = testHDFCConnection;
window.fetchAndImportHoldings = fetchAndImportHoldings;
