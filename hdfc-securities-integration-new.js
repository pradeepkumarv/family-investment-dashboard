// HDFC Securities Integration - Updated for New Database Structure
// Uses separate tables with delete-then-insert logic

const HDFC_MEMBER_MAPPING = {
    equity_member: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49',
    mf_member: 'd3a4fc84-a94b-494d-915f-60901f16d973'
};

const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
    render_auth_url: 'https://family-investment-dashboard.onrender.com/'
};

let hdfcAccessToken = null;
let hdfcTokenId = null;

function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: ${msg}`);
    }
}

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
                    <p style="color: #e53e3e; font-size: 12px;"><strong>Note:</strong> Old data will be deleted and fresh data imported.</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    testHDFCConnection();
}

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

async function testHDFCConnection() {
    const statusElement = document.getElementById('hdfc-connection-status');
    const lastSyncElement = document.getElementById('hdfc-last-sync');

    if (statusElement) statusElement.textContent = 'Testing...';

    try {
        if (!currentUser) {
            if (statusElement) statusElement.textContent = 'Not logged in';
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            if (statusElement) statusElement.textContent = 'Not logged in';
            return;
        }

        const response = await fetch(`${HDFC_CONFIG.backend_base}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.connected) {
            if (statusElement) {
                statusElement.textContent = 'Connected';
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

async function fetchAndImportHoldings() {
    try {
        console.log('🔵 HDFC Import: Starting import process...');

        if (!window.dbHelpers) {
            console.error('❌ HDFC Import: Database helpers not initialized');
            showHDFCMessage('Database helpers not initialized', 'error');
            return;
        }
        console.log('✅ HDFC Import: Database helpers available');

        // Get current user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('❌ HDFC Import: No user logged in');
            showHDFCMessage('Please log in first', 'error');
            return;
        }
        console.log('✅ HDFC Import: User authenticated:', user.id);

        showHDFCMessage('Importing HDFC holdings...', 'info');

        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback`, {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();
        console.log('📦 HDFC Import: Received data:', result);

        if (!response.ok) throw new Error(result.error || 'Failed to fetch holdings');

        if (Array.isArray(result.data)) {
            let equityCount = 0;
            let mfCount = 0;
            const importDate = new Date().toISOString().split('T')[0];

            const equityRecords = [];
            const mfRecords = [];

            for (const holding of result.data) {
                if (holding.investment_type === 'equity') {
                    equityRecords.push({
                        user_id: user.id,
                        member_id: HDFC_MEMBER_MAPPING.equity_member,
                        broker_platform: 'HDFC Securities',
                        symbol: holding.tradingsymbol || holding.symbol || 'UNKNOWN',
                        company_name: holding.tradingsymbol || holding.symbol || 'UNKNOWN',
                        quantity: parseFloat(holding.quantity) || 0,
                        average_price: parseFloat(holding.averageprice) || 0,
                        current_price: parseFloat(holding.lastprice) || 0,
                        invested_amount: (parseFloat(holding.quantity) || 0) * (parseFloat(holding.averageprice) || 0),
                        current_value: (parseFloat(holding.quantity) || 0) * (parseFloat(holding.lastprice) || 0),
                        import_date: importDate
                    });
                } else if (holding.investment_type === 'mutualFunds') {
                    mfRecords.push({
                        user_id: user.id,
                        member_id: HDFC_MEMBER_MAPPING.mf_member,
                        broker_platform: 'HDFC Securities',
                        scheme_name: holding.schemename || 'Unknown',
                        scheme_code: holding.schemecode || '',
                        folio_number: holding.folionumber || '',
                        fund_house: holding.fundhouse || 'Unknown',
                        units: parseFloat(holding.units) || 0,
                        average_nav: parseFloat(holding.averagenav) || 0,
                        current_nav: parseFloat(holding.nav) || 0,
                        invested_amount: (parseFloat(holding.units) || 0) * (parseFloat(holding.averagenav) || 0),
                        current_value: (parseFloat(holding.units) || 0) * (parseFloat(holding.nav) || 0),
                        import_date: importDate
                    });
                }
            }

            // DELETE old equity holdings for HDFC Securities and Pradeep Kumar V
            if (equityRecords.length > 0) {
                console.log(`🗑️ HDFC Import: Deleting old equity holdings for user ${user.id}, broker HDFC Securities, member ${HDFC_MEMBER_MAPPING.equity_member}`);
                await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    HDFC_MEMBER_MAPPING.equity_member
                );
                console.log('✅ HDFC Import: Old equity holdings deleted');

                // INSERT fresh equity holdings
                console.log(`📥 HDFC Import: Inserting ${equityRecords.length} equity holdings`, equityRecords);
                const insertedEquity = await window.dbHelpers.insertEquityHoldings(equityRecords);
                console.log('✅ HDFC Import: Equity holdings inserted:', insertedEquity);
                equityCount = equityRecords.length;
            }

            // DELETE old MF holdings for HDFC Securities and Sanchita Pradeep
            if (mfRecords.length > 0) {
                console.log(`🗑️ HDFC Import: Deleting old MF holdings for user ${user.id}, broker HDFC Securities, member ${HDFC_MEMBER_MAPPING.mf_member}`);
                await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                    user.id,
                    'HDFC Securities',
                    HDFC_MEMBER_MAPPING.mf_member
                );
                console.log('✅ HDFC Import: Old MF holdings deleted');

                // INSERT fresh MF holdings
                console.log(`📥 HDFC Import: Inserting ${mfRecords.length} MF holdings`, mfRecords);
                const insertedMF = await window.dbHelpers.insertMutualFundHoldings(mfRecords);
                console.log('✅ HDFC Import: MF holdings inserted:', insertedMF);
                mfCount = mfRecords.length;
            }

            console.log(`✅ HDFC Import: Completed! ${equityCount} equity, ${mfCount} MF holdings`);
            showHDFCMessage(`Imported ${equityCount} equity and ${mfCount} MF holdings from HDFC`, 'success');

            console.log('🔄 HDFC Import: Reloading dashboard data...');
            if (typeof loadDashboardData === 'function') {
                await loadDashboardData();
            }
            console.log('✅ HDFC Import: Dashboard reloaded');
        } else {
            showHDFCMessage('No holdings found in callback response', 'warning');
        }
    } catch (err) {
        console.error('Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
    }
}

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

console.log('HDFC Securities integration with new database structure loaded');
