// HDFC Securities Integration - FIXED VERSION
// Properly maps to members and handles delete-then-insert logic

// Member configuration - must match BROKER_MEMBER_MAPPING
const HDFC_MEMBER_NAMES = {
    equity_member: 'pradeep kumar v',
    mf_member: 'sanchita pradeep'
};

let hdfcMemberIds = {
    equity_member: null,
    mf_member: null
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
    console.log('showHDFCSettings called');

    const oldModal = document.getElementById('hdfc-settings-modal');
    if (oldModal) {
        console.log('Removing old modal');
        oldModal.remove();
    }

    const modalContent = `
        <div id="hdfc-settings-modal" class="modal" style="display:flex !important; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); align-items:center; justify-content:center;">
            <div class="modal-content" style="background-color:#ffffff; padding:30px; border:none; width:90%; max-width:600px; border-radius:15px; box-shadow:0 10px 40px rgba(0,0,0,0.3); max-height:90vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:15px;">
                    <h2 style="color:#333; margin:0; font-size:24px;">HDFC Securities Settings</h2>
                    <button onclick="closeHDFCModal()" style="background:none; border:none; font-size:32px; cursor:pointer; color:#999; line-height:1; padding:0; width:32px; height:32px;">&times;</button>
                </div>

                <div class="hdfc-status-section" style="margin-bottom:25px; padding:20px; border:1px solid #e0e0e0; border-radius:10px; background:#f8f9fa;">
                    <h3 style="margin-bottom:15px; color:#555; font-size:18px;">Connection Status</h3>
                    <div id="hdfc-status" style="margin-bottom:15px;">
                        <span id="hdfc-connection-status" style="font-weight:bold; font-size:16px;">Checking...</span>
                    </div>
                    <div id="hdfc-last-sync" style="font-size:14px; color:#666; margin-bottom:15px;"></div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button onclick="testHDFCConnection()" style="background:#007bff; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; transition:background 0.3s;">
                            Test Connection
                        </button>
                        <button onclick="authorizeHDFC()" style="background:#28a745; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; transition:background 0.3s;">
                            Authorize HDFC
                        </button>
                    </div>
                </div>

                <div class="hdfc-info" style="font-size:14px; color:#555; background:#fff3cd; padding:15px; border-radius:8px; border-left:4px solid #ffc107;">
                    <p style="margin:0 0 10px 0;"><strong>Automatic Import Process:</strong></p>
                    <p style="margin:0 0 10px 0;">After you log in and validate OTP, your HDFC holdings will be imported automatically.</p>
                    <ul style="margin:10px 0; padding-left:20px;">
                        <li style="margin-bottom:5px;">Equity Holdings mapped to <strong>Pradeep Kumar V</strong></li>
                        <li>Mutual Fund Holdings mapped to <strong>Sanchita Pradeep</strong></li>
                    </ul>
                    <p style="color:#d32f2f; font-size:13px; margin:10px 0 0 0;"><strong>Note:</strong> Old data will be deleted and fresh data imported.</p>
                </div>
            </div>
        </div>
    `;

    console.log('Inserting modal into DOM');
    document.body.insertAdjacentHTML('beforeend', modalContent);
    console.log('Modal inserted successfully');
}

function closeHDFCModal() {
    console.log('closeHDFCModal called');
    const modal = document.getElementById('hdfc-settings-modal');
    if (modal) {
        modal.remove();
        console.log('Modal removed');
    }
}

async function authorizeHDFC() {
    try {
        showHDFCMessage('Redirecting to HDFC Securities authorization...', 'info');
        const resp = await fetch(`${HDFC_CONFIG.backend_base}/auth-url`, { method: 'GET' });
        const data = await resp.json();
        
        // Extract the actual URL from the response
        // Backend may return: {auth_url: '...'} or {url: '...'} or just the URL string
        const authUrl = data.auth_url || data.url || data;
        
        console.log('📍 Authorization URL:', authUrl);
        
        if (!authUrl || typeof authUrl !== 'string') {
            throw new Error('Invalid authorization URL received from server');
        }
        
        window.location.href = authUrl;
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
            if (lastSyncElement && data.last_sync) {
                lastSyncElement.textContent = `Last sync: ${new Date(data.last_sync).toLocaleString()}`;
            }
            if (data.access_token) {
                localStorage.setItem('hdfc_access_token', data.access_token);
            }
        } else {
            if (statusElement) {
                statusElement.textContent = 'Not connected';
                statusElement.style.color = '#dc3545';
            }
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

// CRITICAL FIX: Properly lookup member IDs before import
async function lookupMemberIds(userId) {
    try {
        console.log('🔍 Looking up member IDs for HDFC import...');
        
        const { data: members, error } = await supabase
            .from('family_members')
            .select('id, name')
            .eq('user_id', userId);

        if (error) throw error;

        if (!members || members.length === 0) {
            console.warn('⚠️ No family members found. Please add family members first.');
            return false;
        }

        // Reset IDs
        hdfcMemberIds.equity_member = null;
        hdfcMemberIds.mf_member = null;

        for (const member of members) {
            const nameLower = member.name.toLowerCase().trim();
            
            if (nameLower === HDFC_MEMBER_NAMES.equity_member) {
                hdfcMemberIds.equity_member = member.id;
                console.log(`✅ Found equity member: ${member.name} (${member.id})`);
            }
            
            if (nameLower === HDFC_MEMBER_NAMES.mf_member) {
                hdfcMemberIds.mf_member = member.id;
                console.log(`✅ Found MF member: ${member.name} (${member.id})`);
            }
        }

        if (!hdfcMemberIds.equity_member) {
            console.warn(`⚠️ Member "${HDFC_MEMBER_NAMES.equity_member}" not found for equity holdings`);
        }
        if (!hdfcMemberIds.mf_member) {
            console.warn(`⚠️ Member "${HDFC_MEMBER_NAMES.mf_member}" not found for mutual fund holdings`);
        }

        return (hdfcMemberIds.equity_member || hdfcMemberIds.mf_member);
    } catch (error) {
        console.error('❌ Error looking up member IDs:', error);
        return false;
    }
}

// CRITICAL FIX: Properly categorize holdings based on HDFC API response structure
function categorizeHolding(holding) {
    // Check for mutual fund indicators
    const isMutualFund = 
        holding.sip_indicator === 'Y' ||
        holding.sip_indicator === true ||
        (holding.isin && holding.isin.toUpperCase().startsWith('INF')) ||
        holding.scheme_name ||
        holding.fundhouse ||
        holding.fund_house;

    return isMutualFund ? 'mutualFunds' : 'equity';
}

// Main import function - FIXED VERSION
async function fetchAndImportHoldings() {
    try {
        console.log('📥 HDFC Import: Starting import process...');

        if (!window.dbHelpers) {
            console.error('❌ HDFC Import: Database helpers not initialized');
            showHDFCMessage('Database helpers not initialized', 'error');
            return;
        }

        console.log('✅ HDFC Import: Database helpers available');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('❌ HDFC Import: No user logged in');
            showHDFCMessage('Please log in first', 'error');
            return;
        }

        console.log('✅ HDFC Import: User authenticated:', user.id);

        // CRITICAL: Lookup member IDs first
        const membersFound = await lookupMemberIds(user.id);
        if (!membersFound) {
            showHDFCMessage('Please add family members "pradeep kumar v" and "sanchita pradeep" first', 'error');
            return;
        }

        showHDFCMessage('Importing HDFC holdings...', 'info');

        // Fetch holdings from backend
        const response = await fetch(`${HDFC_CONFIG.backend_base}/callback?user_id=${user.id}`, {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();
        console.log('📊 HDFC Import: Received data:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch holdings');
        }

        if (!Array.isArray(result.data)) {
            throw new Error('Invalid data format received from HDFC');
        }

        let equityCount = 0;
        let mfCount = 0;
        const importDate = new Date().toISOString().split('T')[0];

        const equityRecords = [];
        const mfRecords = [];

        // Process each holding
        for (const holding of result.data) {
            const holdingType = categorizeHolding(holding);

            if (holdingType === 'equity' && hdfcMemberIds.equity_member) {
                equityRecords.push({
                    user_id: user.id,
                    member_id: hdfcMemberIds.equity_member,
                    broker_platform: 'HDFC Securities',
                    symbol: holding.security_id || holding.tradingsymbol || holding.symbol || 'UNKNOWN',
                    company_name: holding.company_name || holding.security_id || 'UNKNOWN',
                    quantity: parseFloat(holding.quantity || 0),
                    average_price: parseFloat(holding.average_price || holding.averageprice || 0),
                    current_price: parseFloat(holding.close_price || holding.last_price || 0),
                    invested_amount: parseFloat(holding.investment_value || (parseFloat(holding.quantity || 0) * parseFloat(holding.average_price || 0))),
                    current_value: parseFloat(holding.quantity || 0) * parseFloat(holding.close_price || holding.last_price || 0),
                    import_date: importDate
                });
            } else if (holdingType === 'mutualFunds' && hdfcMemberIds.mf_member) {
                mfRecords.push({
                    user_id: user.id,
                    member_id: hdfcMemberIds.mf_member,
                    broker_platform: 'HDFC Securities',
                    scheme_name: holding.scheme_name || holding.company_name || 'Unknown',
                    scheme_code: holding.scheme_code || holding.security_id || '',
                    folio_number: holding.folio || holding.folio_number || '',
                    fund_house: holding.fund_house || holding.fundhouse || 'Unknown',
                    units: parseFloat(holding.quantity || holding.units || 0),
                    average_nav: parseFloat(holding.average_price || holding.averagenav || 0),
                    current_nav: parseFloat(holding.close_price || holding.nav || 0),
                    invested_amount: parseFloat(holding.investment_value || (parseFloat(holding.quantity || 0) * parseFloat(holding.average_price || 0))),
                    current_value: parseFloat(holding.quantity || 0) * parseFloat(holding.close_price || holding.nav || 0),
                    import_date: importDate
                });
            }
        }

        // DELETE old holdings before inserting new ones
        if (equityRecords.length > 0) {
            console.log(`🗑️ HDFC Import: Deleting old equity holdings for user ${user.id}, broker "HDFC Securities", member ${hdfcMemberIds.equity_member}`);
            await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                user.id,
                'HDFC Securities',
                hdfcMemberIds.equity_member
            );
            console.log('✅ HDFC Import: Old equity holdings deleted');

            console.log(`📥 HDFC Import: Inserting ${equityRecords.length} equity holdings`, equityRecords);
            const insertedEquity = await window.dbHelpers.insertEquityHoldings(equityRecords);
            console.log('✅ HDFC Import: Equity holdings inserted', insertedEquity);
            equityCount = equityRecords.length;
        }

        if (mfRecords.length > 0) {
            console.log(`🗑️ HDFC Import: Deleting old MF holdings for user ${user.id}, broker "HDFC Securities", member ${hdfcMemberIds.mf_member}`);
            await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                user.id,
                'HDFC Securities',
                hdfcMemberIds.mf_member
            );
            console.log('✅ HDFC Import: Old MF holdings deleted');

            console.log(`📥 HDFC Import: Inserting ${mfRecords.length} MF holdings`, mfRecords);
            const insertedMF = await window.dbHelpers.insertMutualFundHoldings(mfRecords);
            console.log('✅ HDFC Import: MF holdings inserted', insertedMF);
            mfCount = mfRecords.length;
        }

        console.log(`✅ HDFC Import: Completed! ${equityCount} equity, ${mfCount} MF holdings`);
        showHDFCMessage(`Imported ${equityCount} equity and ${mfCount} MF holdings from HDFC`, 'success');

        // Reload dashboard
        console.log('🔄 HDFC Import: Reloading dashboard data...');
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        console.log('✅ HDFC Import: Dashboard reloaded');

    } catch (err) {
        console.error('❌ Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
    }
}

// Expose functions globally
window.showHDFCSettings = showHDFCSettings;
window.closeHDFCModal = closeHDFCModal;
window.authorizeHDFC = authorizeHDFC;
window.testHDFCConnection = testHDFCConnection;
window.fetchAndImportHoldings = fetchAndImportHoldings;

console.log('✅ HDFC Securities integration (FIXED) loaded');
