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
    console.log('═══════════════════════════════════════════');
    console.log('🚀 HDFC IMPORT STARTED');
    console.log('═══════════════════════════════════════════');
    log("fetchAndImportHoldings triggered", 'info');

    try {
        showHDFCMessage("Importing HDFC holdings...", "info");

        // STEP 1: Fetch holdings from backend
        console.log('📡 STEP 1: Fetching from backend');
        console.log('   URL:', `${HDFC_CONFIG.backend_base}/callback`);

        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('📥 Response received:');
        console.log('   Status:', response.status, response.statusText);
        console.log('   OK:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response not OK. Body:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📦 Parsed response:', result);
        console.log('   Status:', result.status);
        console.log('   Count:', result.count);
        console.log('   Data length:', result.data?.length || 0);

        // STEP 2: Validate response
        console.log('✅ STEP 2: Validating response');
        if (!result.data || !Array.isArray(result.data)) {
            console.error('❌ Invalid data structure:', result);
            throw new Error('Invalid holdings data structure');
        }

        const holdings = result.data;
        console.log(`✅ Received ${holdings.length} holdings`);

        if (holdings.length === 0) {
            console.warn('⚠️ No holdings returned from API');
            showHDFCMessage('No holdings found', 'warning');
            return;
        }

        // STEP 3: Get current user
        console.log('👤 STEP 3: Getting current user');
        const user = await getCurrentUser();
        console.log('   User ID:', user?.id || 'NOT LOGGED IN');

        if (!user) {
            throw new Error('User not authenticated');
        }

        // STEP 4: Process and save holdings
        console.log('💾 STEP 4: Processing and saving holdings');
        let savedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < holdings.length; i++) {
            const holding = holdings[i];
            console.log(`\n   [${i+1}/${holdings.length}] Processing:`, holding.company_name || holding.scheme_name);

            try {
                // Determine if it's equity or mutual fund
                const isEquity = holding.exchange === 'BSE' || holding.exchange === 'NSE';
                const isMF = holding.asset_class === 'MUTUAL_FUND' || holding.sip_indicator === 'Y';

                console.log('      Type:', isEquity ? 'EQUITY' : (isMF ? 'MUTUAL FUND' : 'UNKNOWN'));
                console.log('      Member ID:', isEquity ? HDFC_CONFIG.members.equity : HDFC_CONFIG.members.mf);

                if (isEquity) {
                    // Save to equity_holdings
                    const equityData = {
                        user_id: user.id,
                        member_id: HDFC_CONFIG.members.equity,
                        broker_platform: 'HDFC Securities',
                        symbol: holding.security_id || holding.isin,
                        company_name: holding.company_name,
                        quantity: parseFloat(holding.quantity) || 0,
                        average_price: parseFloat(holding.average_price) || 0,
                        current_price: parseFloat(holding.close_price) || 0,
                        invested_amount: parseFloat(holding.quantity) * parseFloat(holding.average_price),
                        current_value: parseFloat(holding.quantity) * parseFloat(holding.close_price),
                        import_date: new Date().toISOString().split('T')[0]
                    };

                    console.log('      💰 Equity data:', equityData);

                    const { error } = await supabase
                        .from('equity_holdings')
                        .upsert(equityData, { onConflict: 'user_id,member_id,symbol,import_date' });

                    if (error) {
                        console.error('      ❌ Equity save error:', error);
                        errorCount++;
                    } else {
                        console.log('      ✅ Equity saved');
                        savedCount++;
                    }

                } else if (isMF) {
                    // Save to mutual_fund_holdings
                    const mfData = {
                        user_id: user.id,
                        member_id: HDFC_CONFIG.members.mf,
                        broker_platform: 'HDFC Securities',
                        scheme_name: holding.scheme_name || holding.company_name,
                        scheme_code: holding.security_id,
                        folio_number: holding.folio_number,
                        fund_house: holding.fund_house,
                        units: parseFloat(holding.units) || parseFloat(holding.quantity) || 0,
                        average_nav: parseFloat(holding.avg_price) || parseFloat(holding.average_price) || 0,
                        current_nav: parseFloat(holding.nav) || parseFloat(holding.close_price) || 0,
                        invested_amount: (parseFloat(holding.units) || 0) * (parseFloat(holding.avg_price) || 0),
                        current_value: (parseFloat(holding.units) || 0) * (parseFloat(holding.nav) || 0),
                        import_date: new Date().toISOString().split('T')[0]
                    };

                    console.log('      📊 MF data:', mfData);

                    const { error } = await supabase
                        .from('mutual_fund_holdings')
                        .upsert(mfData, { onConflict: 'user_id,member_id,scheme_name,import_date' });

                    if (error) {
                        console.error('      ❌ MF save error:', error);
                        errorCount++;
                    } else {
                        console.log('      ✅ MF saved');
                        savedCount++;
                    }
                } else {
                    console.warn('      ⚠️ Unknown holding type, skipping');
                }

            } catch (err) {
                console.error(`      ❌ Error processing holding:`, err);
                errorCount++;
            }
        }

        // STEP 5: Summary
        console.log('\n═══════════════════════════════════════════');
        console.log('✅ HDFC IMPORT COMPLETED');
        console.log('   Total holdings:', holdings.length);
        console.log('   Saved:', savedCount);
        console.log('   Errors:', errorCount);
        console.log('═══════════════════════════════════════════');

        showHDFCMessage(`Import completed: ${savedCount} saved, ${errorCount} errors`, savedCount > 0 ? 'success' : 'warning');

        // Reload the page to show new data
        if (savedCount > 0) {
            console.log('🔄 Reloading page to show new data...');
            setTimeout(() => window.location.reload(), 2000);
        }

    } catch (err) {
        console.error('═══════════════════════════════════════════');
        console.error('💥 HDFC IMPORT FAILED');
        console.error('   Error:', err.message);
        console.error('   Stack:', err.stack);
        console.error('═══════════════════════════════════════════');
        log(`Import failed: ${err.message}`, 'error');
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
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
