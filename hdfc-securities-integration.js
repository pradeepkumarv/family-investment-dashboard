// HDFC Securities Integration - Updated for Member Mapping and Database Integration
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
                        Import your HDFC Securities holdings into your dashboard. Equity holdings will be mapped to Pradeep Kumar V and Mutual Fund holdings to Sanchita Pradeep.
                    </p>
                    
                    <button onclick="importHDFCHoldings()" 
                            style="background:#17a2b8; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; width:100%;">
                        Import Holdings Now
                    </button>
                </div>
                
                <div class="hdfc-info" style="font-size:0.9em; color:#666;">
                    <p><strong>Member Mapping:</strong></p>
                    <ul style="margin:10px 0; padding-left:20px;">
                        <li>Equity Holdings → Pradeep Kumar V</li>
                        <li>Mutual Fund Holdings → Sanchita Pradeep</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Test connection immediately when modal opens
    testHDFCConnection();
}

// Authorization function - redirects to Render authentication
async function authorizeHDFC() {
    try {
        const supabaseUser = await getCurrentUser();
        if (!supabaseUser) {
            showHDFCMessage('Please log in to your dashboard first', 'error');
            return;
        }

        showHDFCMessage('Redirecting to HDFC Securities authorization...', 'info');
        
        // Redirect to your Render website for HDFC authentication
        window.location.href = HDFC_CONFIG.render_auth_url;
        
    } catch (error) {
        console.error('HDFC Authorization Error:', error);
        showHDFCMessage(`Authorization failed: ${error.message}`, 'error');
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
            
            // Store the access token for later use
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

// Fetch holdings from backend
async function fetchHDFCHoldings(type) {
    const token = localStorage.getItem('hdfcaccesstoken');
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            accesstoken: token, 
            apikey: HDFC_CONFIG.api_key, 
            type: type 
        })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch holdings');
    return data.data;
}

// Import & map holdings into dashboard
async function importHDFCHoldings() {
    const token = localStorage.getItem('hdfcaccesstoken');
    if (!token) {
        showHDFCMessage('Please authenticate with HDFC Securities first.', 'warning');
        return;
    }
    
    showHDFCMessage('Importing HDFC holdings...', 'info');
    let equityCount = 0, mfCount = 0;

    try {
        // 1. Import Equity Holdings → Pradeep Kumar V
        try {
            const equityList = await fetchHDFCHoldings('equity');
            if (Array.isArray(equityList) && equityList.length > 0) {
                for (const holding of equityList) {
                    await addInvestmentData({
                        memberid: HDFC_CONFIG.members.equity,
                        investmenttype: 'equity',
                        symbolorname: holding.tradingsymbol || holding.symbol || 'Unknown',
                        investedamount: parseFloat(holding.quantity) || 0,
                        averageprice: parseFloat(holding.averageprice) || 0,
                        currentvalue: (parseFloat(holding.quantity) || 0) * (parseFloat(holding.lastprice) || 0),
                        lastprice: parseFloat(holding.lastprice) || 0,
                        brokerplatform: 'HDFC Securities - Equity',
                        hdfcdata: JSON.stringify(holding),
                        createdat: new Date().toISOString()
                    });
                    equityCount++;
                }
            }
        } catch (equityError) {
            console.error('Error importing equity holdings:', equityError);
            showHDFCMessage(`Equity import warning: ${equityError.message}`, 'warning');
        }

        // 2. Import Mutual Fund Holdings → Sanchita Pradeep
        try {
            const mfList = await fetchHDFCHoldings('mf');
            if (Array.isArray(mfList) && mfList.length > 0) {
                for (const holding of mfList) {
                    await addInvestmentData({
                        memberid: HDFC_CONFIG.members.mf,
                        investmenttype: 'mutualFunds',
                        symbolorname: holding.schemename || holding.fundname || 'Unknown Fund',
                        investedamount: parseFloat(holding.units) || 0,
                        averageprice: parseFloat(holding.averagenav) || 0,
                        currentvalue: (parseFloat(holding.units) || 0) * (parseFloat(holding.nav) || 0),
                        lastprice: parseFloat(holding.nav) || 0,
                        brokerplatform: 'HDFC Securities - MF',
                        hdfcdata: JSON.stringify(holding),
                        createdat: new Date().toISOString()
                    });
                    mfCount++;
                }
            }
        } catch (mfError) {
            console.error('Error importing mutual fund holdings:', mfError);
            showHDFCMessage(`Mutual fund import warning: ${mfError.message}`, 'warning');
        }

        // 3. Update last sync timestamp and refresh UI
        localStorage.setItem('hdfclastsync', new Date().toISOString());
        showHDFCMessage(`Successfully imported ${equityCount} equity and ${mfCount} mutual fund holdings.`, 'success');

        // Refresh the dashboard data
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

        // Update the connection status in the modal
        testHDFCConnection();

    } catch (error) {
        console.error('HDFC Import Error:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
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

// Expose functions globally for button onclick handlers
window.showHDFCSettings = showHDFCSettings;
window.authorizeHDFC = authorizeHDFC;
window.testHDFCConnection = testHDFCConnection;
window.importHDFCHoldings = importHDFCHoldings;
