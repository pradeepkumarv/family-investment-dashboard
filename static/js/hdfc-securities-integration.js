const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/'
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
        <div id="hdfc-settings-modal" class="modal" ...>
            ...
            <button id="hdfc-test-connection" onclick="testHDFCConnection()" ...>Test Connection</button>
            <button id="hdfc-authorize-btn" onclick="authorizeHDFC()" ...>Authorize HDFC</button>
            ...
        </div>`;
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

       backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc'

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

// Import holdings after OTP callback (no Supabase auth required)
async function fetchAndImportHoldings() {
    console.log('fetchAndImportHoldings triggered...')
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
                // 🔑 Auto-map member IDs based on type
                let memberId;
                if (holding.investment_type === "equity") {
                    memberId = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"; // Pradeep
                } else if (holding.investment_type === "mutualFunds") {
                    memberId = "d3a4fc84-a94b-494d-915f-60901f16d973"; // Sanchita
                } else {
                    memberId = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"; // default → Pradeep
                }

                // Insert into Supabase
                const { error } = await supabaseClient
                    .from('investments')
                    .insert({
                        member_id: memberId,
                        investment_type: holding.investment_type || "other",
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
                    console.error("Supabase insert error:", error);
                } else {
                    insertedCount++;
                }
            }

            showHDFCMessage(`✅ Imported ${insertedCount} holdings into Supabase`, 'success');
        } else {
            showHDFCMessage('⚠️ No holdings found in callback response', 'warning');
        }
    } catch (err) {
        console.error('Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
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
