// HDFC Securities Integration - MULTI-STEP AUTHENTICATION FLOW
// Properly handles the 4-step HDFC authorization process


const HDFC_MEMBER_NAMES = {
    equity_member: 'pradeep kumar v',
    mf_member: 'sanchita pradeep'
};

let hdfcMemberIds = {
    equity_member: null,
    mf_member: null
};

const HDFC_CONFIG = {
    backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
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
        // Use the full backend URL path
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
        // Use the full backend URL path
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

        // Wait a moment then redirect to callback to fetch holdings
               
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

// Function to check if holdings were imported and update UI
async function checkHDFCImportStatus() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if there are recent HDFC holdings
        const { count: equityCount } = await supabase
            .from('equity_holdings')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('broker_platform', 'HDFC Securities')
            .limit(1);

        const { count: mfCount } = await supabase
            .from('mutual_fund_holdings')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('broker_platform', 'HDFC Securities')
            .limit(1);

        if (equityCount > 0 || mfCount > 0) {
            console.log(`✅ Found HDFC holdings: ${equityCount} equity, ${mfCount} MF`);
            const successEl = document.getElementById('hdfc-success');
            if (successEl) successEl.style.display = 'block';
            
            showHDFCMessage(`Successfully imported ${equityCount + mfCount} holdings!`, 'success');
            
            // Reload dashboard
            if (typeof loadDashboardData === 'function') {
                await loadDashboardData();
            }
        }
    } catch (err) {
        console.error('Error checking import status:', err);
    }
}

// Expose functions globally
// Fetch holdings after successful authentication
async function fetchHDFCHoldings() {
    try {
        console.log('📥 Fetching HDFC holdings...');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
