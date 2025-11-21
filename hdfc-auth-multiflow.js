// HDFC Securities Integration - MULTI-STEP AUTHENTICATION FLOW - FULLY PATCHED
// Properly handles the 4-step HDFC authorization process with correct endpoint URLs

const HDFC_MEMBER_NAMES = {
    equity_member: 'pradeep kumar v',
    mf_member: 'sanchita pradeep'
};

let hdfcMemberIds = {
    equity_member: null,
    mf_member: null
};

const HDFC_CONFIG = {
    backend_base: 'https://family-investment-dashboard.onrender.com',
    api_base: 'https://family-investment-dashboard.onrender.com/api/hdfc'
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
        <div id="hdfc-settings-modal" class="modal" style="display:block; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.4)">
            <div class="modal-content" style="background-color:#fefefe; margin:10% auto; padding:20px; border:1px solid #888; width:90%; max-width:600px; border-radius:10px; max-height:90vh; overflow-y:auto;">
                <span class="close" onclick="document.getElementById('hdfc-settings-modal').remove()" style="color:#aaa; float:right; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
                <h2 style="color:#333; margin-bottom:20px;">HDFC Securities - Multi-Step Login</h2>
                
                <div class="hdfc-status-section" style="margin-bottom:25px; padding:15px; border:1px solid #ddd; border-radius:8px; background:#f9f9f9;">
                    <h3 style="margin-bottom:15px; color:#555;">Login Steps</h3>
                    
                    <!-- STEP 1: Username & Password -->
                    <div id="hdfc-step1" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:5px;">
                        <h4 style="margin-bottom:10px; color:#666;">Step 1: Enter Credentials</h4>
                        <div style="margin-bottom:10px;">
                            <label style="display:block; margin-bottom:5px; font-weight:bold;">Username:</label>
                            <input type="text" id="hdfc-username" placeholder="Your HDFC username" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="margin-bottom:10px;">
                            <label style="display:block; margin-bottom:5px; font-weight:bold;">Password:</label>
                            <input type="password" id="hdfc-password" placeholder="Your HDFC password" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <button onclick="hdfcStep1RequestOTP()" style="background:#007bff; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            Request OTP
                        </button>
                        <span id="hdfc-step1-status" style="margin-left:10px; font-size:0.9em;"></span>
                    </div>

                    <!-- STEP 2: OTP Validation -->
                    <div id="hdfc-step2" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:5px; display:none;">
                        <h4 style="margin-bottom:10px; color:#666;">Step 2: Enter OTP</h4>
                        <p style="margin-bottom:10px; color:#666; font-size:0.9em;">An OTP has been sent to your registered email/SMS</p>
                        <div style="margin-bottom:10px;">
                            <label style="display:block; margin-bottom:5px; font-weight:bold;">OTP:</label>
                            <input type="text" id="hdfc-otp" placeholder="Enter 6-digit OTP" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <button onclick="hdfcStep2ValidateOTP()" style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            Validate OTP
                        </button>
                        <span id="hdfc-step2-status" style="margin-left:10px; font-size:0.9em;"></span>
                    </div>

                    <!-- STEP 3: Authorization Complete -->
                    <div id="hdfc-step3" style="margin-bottom:20px; padding:15px; border:1px solid #e0e0e0; border-radius:5px; display:none;">
                        <h4 style="margin-bottom:10px; color:#666;">Step 3: Fetching Holdings...</h4>
                        <div style="text-align:center; padding:20px;">
                            <div style="display:inline-block; width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #007bff; border-radius:50%; animation:spin 1s linear infinite;"></div>
                            <p style="margin-top:10px; color:#666;">Please wait while we fetch your holdings...</p>
                        </div>
                    </div>

                    <!-- Success Message -->
                    <div id="hdfc-success" style="margin-bottom:20px; padding:15px; border:1px solid #d4edda; border-radius:5px; background:#d4edda; display:none; color:#155724;">
                        <h4>✅ Authentication Successful!</h4>
                        <p>Your HDFC holdings are being imported to your dashboard.</p>
                    </div>
                </div>

                <div class="hdfc-info" style="font-size:0.9em; color:#666; padding:15px; background:#f0f0f0; border-radius:5px;">
                    <p><strong>What will be imported:</strong></p>
                    <ul style="margin:10px 0; padding-left:20px;">
                        <li>Equity Holdings mapped to <strong>Pradeep Kumar V</strong></li>
                        <li>Mutual Fund Holdings mapped to <strong>Sanchita Pradeep</strong></li>
                    </ul>
                    <p style="color: #e53e3e; font-size: 12px; margin-top:10px;"><strong>Note:</strong> Old HDFC data will be deleted and replaced with fresh data.</p>
                </div>

                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

// Step 1: Request OTP
async function hdfcStep1RequestOTP() {
    const username = document.getElementById('hdfc-username').value;
    const password = document.getElementById('hdfc-password').value;
    const statusEl = document.getElementById('hdfc-step1-status');

    if (!username || !password) {
        if (statusEl) statusEl.textContent = '❌ Please enter username and password';
        return;
    }

    if (statusEl) statusEl.textContent = '⏳ Requesting OTP...';

    try {
        // Call the root-level /request-otp endpoint
        const response = await fetch(`${HDFC_CONFIG.backend_base}/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to request OTP');
        }

        console.log('✅ OTP requested successfully');
        hdfcTokenId = data.tokenid;
        
        if (statusEl) statusEl.textContent = '✅ OTP sent';
        
        // Show Step 2
        document.getElementById('hdfc-step1').style.display = 'none';
        document.getElementById('hdfc-step2').style.display = 'block';

    } catch (err) {
        console.error('❌ OTP Request Error:', err);
        if (statusEl) statusEl.textContent = `❌ ${err.message}`;
        showHDFCMessage(err.message, 'error');
    }
}

// Step 2: Validate OTP
async function hdfcStep2ValidateOTP() {
    const otp = document.getElementById('hdfc-otp').value;
    const statusEl = document.getElementById('hdfc-step2-status');

    if (!otp) {
        if (statusEl) statusEl.textContent = '❌ Please enter OTP';
        return;
    }

    if (statusEl) statusEl.textContent = '⏳ Validating OTP...';

    try {
        // Call the root-level /validate-otp endpoint
        const response = await fetch(`${HDFC_CONFIG.backend_base}/validate-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp, tokenid: hdfcTokenId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'OTP validation failed');
        }

        console.log('✅ OTP validated successfully');
        
        if (statusEl) statusEl.textContent = '✅ OTP validated';
        
        // Show Step 3 (loading)
        document.getElementById('hdfc-step2').style.display = 'none';
        document.getElementById('hdfc-step3').style.display = 'block';

        // Wait a moment then call backend to fetch and import holdings
        setTimeout(async () => {
            await fetchHDFCHoldings();
        }, 1000);

    } catch (err) {
        console.error('❌ OTP Validation Error:', err);
        if (statusEl) statusEl.textContent = `❌ ${err.message}`;
        showHDFCMessage(err.message, 'error');
    }
}

// Lookup member IDs
async function lookupMemberIds(userId) {
    try {
        console.log('🔍 Looking up member IDs for HDFC import...');
        
        const { data: members, error } = await supabase
            .from('family_members')
            .select('id, name')
            .eq('user_id', userId);

        if (error) throw error;

        if (!members || members.length === 0) {
            console.warn('⚠️ No family members found');
            return false;
        }

        hdfcMemberIds.equity_member = null;
        hdfcMemberIds.mf_member = null;

        for (const member of members) {
            const nameLower = member.name.toLowerCase().trim();
            
            if (nameLower === HDFC_MEMBER_NAMES.equity_member) {
                hdfcMemberIds.equity_member = member.id;
                console.log(`✅ Found equity member: ${member.name}`);
            }
            
            if (nameLower === HDFC_MEMBER_NAMES.mf_member) {
                hdfcMemberIds.mf_member = member.id;
                console.log(`✅ Found MF member: ${member.name}`);
            }
        }

        return (hdfcMemberIds.equity_member || hdfcMemberIds.mf_member);
    } catch (error) {
        console.error('❌ Error looking up member IDs:', error);
        return false;
    }
}

// Categorize holding as equity or mutual fund
function categorizeHolding(holding) {
    const isMutualFund = 
        holding.sip_indicator === 'Y' ||
        holding.sip_indicator === true ||
        (holding.isin && holding.isin.toUpperCase().startsWith('INF')) ||
        holding.scheme_name ||
        holding.fundhouse ||
        holding.fund_house;

    return isMutualFund ? 'mutualFunds' : 'equity';
}

// Fetch HDFC holdings after successful OTP validation
async function fetchHDFCHoldings() {
    try {
        console.log('📥 HDFC Import: Starting import process...');

        if (!window.dbHelpers) {
            console.error('❌ HDFC Import: Database helpers not initialized');
            showHDFCMessage('Database helpers not initialized', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        console.log('✅ HDFC Import: User authenticated:', user.id);

        // Lookup member IDs first
        const membersFound = await lookupMemberIds(user.id);
        if (!membersFound) {
            showHDFCMessage('Please add family members "pradeep kumar v" and "sanchita pradeep" first', 'error');
            return;
        }

        showHDFCMessage('Fetching HDFC holdings...', 'info');

        // Call backend callback endpoint to get holdings
        const response = await fetch(`${HDFC_CONFIG.api_base}/callback?user_id=${user.id}`, {
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
            console.log(`🗑️ HDFC Import: Deleting old equity holdings`);
            await window.dbHelpers.deleteEquityHoldingsByBrokerAndMember(
                user.id,
                'HDFC Securities',
                hdfcMemberIds.equity_member
            );
            
            console.log(`📥 HDFC Import: Inserting ${equityRecords.length} equity holdings`);
            await window.dbHelpers.insertEquityHoldings(equityRecords);
        }

        if (mfRecords.length > 0) {
            console.log(`🗑️ HDFC Import: Deleting old MF holdings`);
            await window.dbHelpers.deleteMutualFundHoldingsByBrokerAndMember(
                user.id,
                'HDFC Securities',
                hdfcMemberIds.mf_member
            );
            
            console.log(`📥 HDFC Import: Inserting ${mfRecords.length} MF holdings`);
            await window.dbHelpers.insertMutualFundHoldings(mfRecords);
        }

        console.log(`✅ HDFC Import: Completed! ${equityRecords.length} equity, ${mfRecords.length} MF holdings`);
        
        // Show success message
        const successEl = document.getElementById('hdfc-success');
        if (successEl) successEl.style.display = 'block';
        
        showHDFCMessage(`Imported ${equityRecords.length + mfRecords.length} holdings from HDFC`, 'success');

        // Reload dashboard
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

        // Close modal after 3 seconds
        setTimeout(() => {
            const modal = document.getElementById('hdfc-settings-modal');
            if (modal) modal.remove();
        }, 3000);

    } catch (err) {
        console.error('❌ Error importing holdings:', err);
        showHDFCMessage(`Import failed: ${err.message}`, 'error');
        
        // Hide loading, show error
        const step3El = document.getElementById('hdfc-step3');
        if (step3El) step3El.style.display = 'none';
    }
}

// Expose functions globally
window.showHDFCSettings = showHDFCSettings;
window.hdfcStep1RequestOTP = hdfcStep1RequestOTP;
window.hdfcStep2ValidateOTP = hdfcStep2ValidateOTP;
window.fetchHDFCHoldings = fetchHDFCHoldings;

console.log('✅ HDFC Securities integration (MULTI-STEP) loaded - FULLY PATCHED');
