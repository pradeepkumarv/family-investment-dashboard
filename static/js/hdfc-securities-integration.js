const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/',
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49',  // Pradeep
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973',      // Sanchita
    }
};

let hdfcAccessToken = null;
let hdfcTokenId = null;

// Utility function for messages with console log
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: [${type}] ${msg}`);
    }
}

// Main HDFC Settings modal
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
    testHDFCConnection();
}

// Start OAuth authorization flow
async function authorizeHDFC() {
    console.log("🔐 authorizeHDFC() called");
    try {
        showHDFCMessage('Redirecting to HDFC Securities authorization...', 'info');
        const resp = await fetch(`${HDFC_CONFIG.backend_base}/auth-url`, { method: 'GET' });
        const { url } = await resp.json();
        if (!url) throw new Error('No URL returned');
        console.log(`Redirecting browser to: ${url}`);
        window.location.href = url;
    } catch (err) {
        console.error('HDFC Authorization Error:', err);
        showHDFCMessage(`Authorization failed: ${err.message}`, 'error');
    }
}

// Test connection and get status
async function testHDFCConnection() {
    console.log("🔗 testHDFCConnection() called");
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
        console.log("Connection test response:", data);

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

// Import holdings after OTP callback (fixed version)

// ✅ Final fetchAndImportHoldings with member mapping
async function fetchAndImportHoldings() {
  try {
    // Fetch holdings from backend
    const response = await fetch('/api/hdfc/holdings');
    const result = await response.json();
    const holdings = result.data || [];

    console.log(`📊 Processing ${holdings.length} holdings`);

    // Define member IDs
    const pradeepId = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49";   // <-- replace with real ID
    const sanchitaId = "d3a4fc84-a94b-494d-915f-60901f16d973"; // <-- replace with real ID

   
    // Insert each holding
    for (const holding of holdings) {
      // Choose member based on type
      const memberId = holding.sip_indicator === "Y" 
        ? sanchitaId   // Mutual fund (SIP = Yes)
        : pradeepId;   // Equity

      const { error } = await supabaseClient
        .from('investments')
        .insert({
          member_id: memberId,
          investment_type: holding.investment_type || (holding.sip_indicator === "Y" ? "mutual_fund" : "equity"),
          company_name: holding.company_name || holding.schemename || null,
          authorised_quantity: holding.authorised_quantity || 0,
          average_price: holding.average_price || 0,
          brokerplatform: 'HDFC Securities',
          close_price: holding.close_price || 0,
          collateral_quantity: holding.collateral_quantity || 0,
          corporate_action_indicator: holding.corporate_action_indicator || null,
          corporate_action_message: holding.corporate_action_message || null,
          createdat: new Date().toISOString(),
          day_change: holding.day_change || 0,
          day_change_percentage: holding.day_change_percentage || 0,
          discrepancy: holding.discrepancy || false,
          hdfcdata: JSON.stringify(holding),
          instrument_token: holding.instrument_token || null,
          investment_value: holding.investment_value || 0,
          isin: holding.isin || null,
          ltcg_quantity: holding.ltcg_quantity || 0,
          mtf_indicator: holding.mtf_indicator || null,
          pnl: holding.pnl || 0,
          quantity: holding.quantity || holding.units || 0,
          realised: holding.realised || 0,
          sector_name: holding.sector_name || null,
          security_id: holding.security_id || null,
          sip_indicator: holding.sip_indicator || null,
          t1_quantity: holding.t1_quantity || 0,
          used_quantity: holding.used_quantity || 0
        });

      if (error) {
        console.error(`❌ Supabase insert error for ${holding.company_name}:`, error);
      } else {
        console.log(`📥 Inserted holding: ${holding.company_name} → Member: ${memberId}`);
      }
    }

    console.log("✅ All holdings processed and inserted!");
  } catch (err) {
    console.error("❌ fetchAndImportHoldings error:", err);
  }
}

// Helper to get current Supabase user
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

console.log('🔧 HDFC Securities integration loaded successfully');
