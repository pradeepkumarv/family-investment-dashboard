// HDFC Securities Integration - Simplified (Backend Handles Mapping + Debug Utility)
const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/'
};

let hdfcAccessToken = null;

// Utility function for messages
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: ${msg}`);
    }
}

// MAIN SETTINGS MODAL
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
                
                <div class="hdfc-import-section" style="margin-bottom:25px; padding:15px; border:1px solid #ddd; border-radius:8px;">
                    <h3 style="margin-bottom:15px; color:#555;">Import Holdings</h3>
                    <p style="font-size:0.9em; color:#666; margin-bottom:15px;">
                        Import your HDFC Securities holdings into your dashboard. Backend will map equity holdings to Pradeep Kumar V and mutual funds to Sanchita Pradeep.
                    </p>
                    
                    <button onclick="importHDFCHoldings()" 
                            style="background:#17a2b8; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; width:100%;">
                        Import Holdings Now
                    </button>

                    <button onclick="testFetchHDFCHoldings()" 
                            style="background:#ffc107; color:black; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; width:100%; margin-top:10px;">
                        🔎 Test Fetch Holdings (Debug)
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Test connection immediately when modal opens
    testHDFCConnection();
}

// AUTHORIZE
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

// TEST CONNECTION
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

// IMPORT HOLDINGS (backend maps them)
async function importHDFCHoldings() {
    const token = localStorage.getItem('hdfcaccesstoken');
    if (!token) {
        showHDFCMessage('Please authenticate with HDFC Securities first.', 'warning');
        return;
    }

    showHDFCMessage('Importing HDFC holdings...', 'info');
    let insertedCount = 0;

    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accesstoken: token })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch holdings');

        const holdingsList = result.data;
        if (Array.isArray(holdingsList) && holdingsList.length > 0) {
            for (const holding of holdingsList) {
                await addInvestmentData({
                    memberid: holding.member_id,               // backend mapped
                    investmenttype: holding.investment_type,   // backend mapped
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
        }

        showHDFCMessage(`✅ Imported ${insertedCount} holdings successfully.`, 'success');
    } catch (err) {
        console.error('Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
    }
}

// TEST FETCH HOLDINGS - Debug utility
async function testFetchHDFCHoldings() {
    const token = localStorage.getItem('hdfcaccesstoken');
    if (!token) {
        showHDFCMessage('Please authenticate with HDFC Securities first.', 'warning');
        return;
    }

    showHDFCMessage('Fetching holdings for debug...', 'info');

    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accesstoken: token })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch holdings');

        console.group('🔎 HDFC Holdings Debug');
        console.log('Full API Response:', result);
        if (Array.isArray(result.data)) {
            console.table(result.data.map(h => ({
                symbol: h.tradingsymbol || h.symbol || h.schemename,
                type: h.investment_type,
                member: h.member_id,
                qty: h.quantity || h.units,
                price: h.lastprice || h.nav,
                avg: h.averageprice || h.averagenav
            })));
        }
        console.groupEnd();

        showHDFCMessage(`✅ Debug fetch successful: ${result.data.length} holdings logged to console.`, 'success');
    } catch (err) {
        console.error('Debug fetch error:', err);
        showHDFCMessage(`Debug fetch failed: ${err.message}`, 'error');
    }
}
