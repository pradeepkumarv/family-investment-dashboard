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
async function fetchAndImportHoldings() {
    log("fetchAndImportHoldings triggered", 'info');
    
    try {
        showHDFCMessage("Importing HDFC holdings...", "info");
        
        // **1. Fetch holdings from backend (like Zerodha getHoldings)**
        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        log(`Backend response: ${JSON.stringify(result)}`, 'info');
        
        if (!result.data || !Array.isArray(result.data)) {
            throw new Error('Invalid holdings data structure');
        }
        
        const holdings = result.data;
        log(`Processing ${holdings.length} holdings`, 'info');
        
        if (holdings.length === 0) {
            showHDFCMessage('No holdings found', 'warning');
            return;
        }
        
        // **2. Import holdings with proper member mapping**
        let importedCount = 0;
        
        for (const holding of holdings) {
            log(`Processing: ${holding.company_name || holding.schemename || holding.security_id}`, 'info');
            
            // **3. Member ID mapping based on investment type (like Zerodha)**
            let memberId;
            let investmentType;
            let brokerPlatform;
            
            if (holding.sip_indicator === 'Y' || holding.sector_name === 'Equity - Diversified') {
                // Mutual Fund - goes to Sanchita
                memberId = HDFC_CONFIG.members.mf;
                investmentType = 'mutualFunds';
                brokerPlatform = `HDFC Securities - MF (${BROKER_MEMBER_MAPPING[memberId].name})`;
            } else {
                // Equity - goes to Pradeep
                memberId = HDFC_CONFIG.members.equity;
                investmentType = 'equity';
                brokerPlatform = `HDFC Securities - Equity (${BROKER_MEMBER_MAPPING[memberId].name})`;
            }
            
            // **4. Check for duplicates (like Zerodha does)**
            const existingInvestment = investments ? investments.find(inv => 
                inv.memberid === memberId &&
                inv.symbolorname === (holding.company_name || holding.schemename) &&
                inv.brokerplatform.includes('HDFC Securities') &&
                inv.investmenttype === investmentType
            ) : null;
            
            if (existingInvestment) {
                log(`Skipping duplicate: ${holding.company_name || holding.schemename}`, 'warning');
                continue;
            }
            
            // **5. Insert into Supabase (using addInvestmentData like Zerodha)**
            try {
                await addInvestmentData({
                    memberid: memberId,
                    investmenttype: investmentType,
                    symbolorname: holding.company_name || holding.schemename,
                    investedamount: Number(holding.quantity || holding.units || 0) * Number(holding.average_price || 0),
                    currentvalue: Number(holding.quantity || holding.units || 0) * Number(holding.close_price || holding.nav || 0),
                    brokerplatform: brokerPlatform,
                    hdfcdata: holding,
                    // Additional HDFC-specific fields
                    quantity: Number(holding.quantity || holding.units || 0),
                    averageprice: Number(holding.average_price || 0),
                    lastprice: Number(holding.close_price || holding.nav || 0),
                    securityid: holding.security_id || null,
                    isin: holding.isin || null,
                    sectorname: holding.sector_name || null,
                    sipindicator: holding.sip_indicator || null,
                    folionumber: holding.folio || null,
                    createdat: new Date().toISOString(),
                    lastupdated: new Date().toISOString()
                });
                
                importedCount++;
                log(`Imported: ${holding.company_name || holding.schemename} → ${BROKER_MEMBER_MAPPING[memberId].name}`, 'success');
                
            } catch (insertError) {
                log(`Failed to import ${holding.company_name || holding.schemename}: ${insertError.message}`, 'error');
            }
        }
        
        // **6. Update UI and storage (like Zerodha)**
        localStorage.setItem('hdfclastsync', new Date().toISOString());
        
        const equityCount = holdings.filter(h => h.sip_indicator !== 'Y' && h.sector_name !== 'Equity - Diversified').length;
        const mfCount = holdings.filter(h => h.sip_indicator === 'Y' || h.sector_name === 'Equity - Diversified').length;
        
        showHDFCMessage(`✅ Imported ${importedCount} holdings (${equityCount} equity for Pradeep, ${mfCount} MF for Sanchita)`, 'success');
        
        // **7. Refresh dashboard (like Zerodha)**
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        } else if (typeof loadInvestmentData === 'function') {
            await loadInvestmentData();
        }
        
        log(`Import completed: ${importedCount}/${holdings.length} holdings imported`, 'success');
        
    } catch (error) {
        log(`Import failed: ${error.message}`, 'error');
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
        console.error('Full error details:', error);
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
