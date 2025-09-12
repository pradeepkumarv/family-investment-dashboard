// hdfc-securities-integration.js - Complete HDFC Securities integration

const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965',
    backend_base: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49', // Pradeep Kumar V
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973', // Sanchita Pradeep
    }
};

let hdfcAccessToken = null;
let hdfcRequestToken = null;
let hdfcTokenId = null;

// Utility: Show message wrapper
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: ${msg}`);
    }
}

// OPEN LOGIN MODAL
function openHDFCLoginModal() {
    const oldModal = document.getElementById('hdfc_login_modal');
    if (oldModal) oldModal.remove();
    
    const modalContent = `
    <div id="hdfc_login_modal" class="modal-fixed"
        style="
            display:block; position:fixed; top:0; left:0; width:100vw; height:100vh;
            background:rgba(50,60,65,0.65); z-index:9999;
        ">
      <div style="
            background:#fff; max-width:450px; margin:5% auto; 
            padding:32px 28px; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15);
            position:relative; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        ">
        <button aria-label="Close" onclick="closeHDFCLoginModal()"
            style="position:absolute; top:16px; right:20px; background:transparent; border:none; font-size:24px; cursor:pointer; color:#666; line-height:1;">&times;</button>
        
        <h2 style="margin:0 0 24px 0; font-size:24px; color:#2c5aa0; font-weight:600;">
            🏦 HDFC Securities Login
        </h2>
        
        <div style="margin-bottom:20px;">
            <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">Username / Client ID</label>
            <input type="text" id="hdfc_username" placeholder="Enter your client ID"
                autocomplete="username"
                style="width:100%; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px; transition:border-color 0.2s;" />
        </div>
        
        <div style="margin-bottom:20px;">
            <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">Password / MPIN</label>
            <input type="password" id="hdfc_password" placeholder="Enter your password"
                autocomplete="current-password"
                style="width:100%; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px; transition:border-color 0.2s;" />
        </div>
        
        <div style="margin-bottom:24px;">
            <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">OTP (One Time Password)</label>
            <div style="display:flex; gap:12px; align-items:flex-start;">
                <input type="text" id="hdfc_otp" placeholder="Enter OTP"
                    autocomplete="one-time-code" maxlength="6"
                    style="flex:1; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px; transition:border-color 0.2s;" />
                <button onclick="requestHDFCOtp()" id="hdfc_request_otp_btn"
                    style="
                        padding:12px 20px; border:none; font-size:14px; border-radius:8px; font-weight:500;
                        background:#3b82f6; color:white; cursor:pointer; min-width:120px;
                        box-shadow:0 2px 4px rgba(59,130,246,0.3); transition:all 0.2s;
                    ">Request OTP</button>
            </div>
            
            <div style="margin-top:8px; display:flex; gap:16px;">
                <button onclick="resendHDFCOtp()" id="hdfc_resend_otp_btn" 
                    style="font-size:13px; background:none; border:none; color:#3b82f6; cursor:pointer; text-decoration:underline; padding:0;">
                    Resend OTP
                </button>
            </div>
            
            <div id="hdfc_otp_status" style="color:#dc2626; font-size:14px; margin-top:8px; min-height:20px;"></div>
        </div>
        
        <div style="display:flex; justify-content:space-between; gap:12px;">
            <button onclick="submitHDFCLogin()" id="hdfc_login_btn"
                style="
                    flex:1; padding:14px 24px; border:none; font-size:16px; border-radius:8px; font-weight:600;
                    background:#059669; color:white; cursor:pointer;
                    box-shadow:0 2px 4px rgba(5,150,105,0.3); transition:all 0.2s;
                ">Login with OTP</button>
            <button onclick="closeHDFCLoginModal()"
                style="
                    flex:0.5; padding:14px 24px; border:2px solid #e5e7eb; font-size:16px; border-radius:8px; font-weight:500;
                    background:white; color:#374151; cursor:pointer; transition:all 0.2s;
                ">Cancel</button>
        </div>
        
        <div style="margin-top:16px; padding:12px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;">
            <p style="margin:0; font-size:13px; color:#92400e;">
                <strong>Note:</strong> Click "Request OTP" first to receive OTP on your registered mobile/email, then enter it and click "Login with OTP".
            </p>
        </div>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

// CLOSE LOGIN MODAL
function closeHDFCLoginModal() {
    const modal = document.getElementById('hdfc_login_modal');
    if (modal) modal.remove();
    // Reset tokens
    hdfcRequestToken = null;
}

// REQUEST OTP - Step 1

async function requestHDFCOtp() {
  const username = document.getElementById('hdfc_username').value.trim();
  const password = document.getElementById('hdfc_password').value.trim();
  const status = document.getElementById('hdfc-otp-status');
  if (!username || !password) { status.textContent = 'Enter username and password'; return; }
  status.textContent = 'Requesting OTP...';
  try {
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'initiate',
        username,
        password,
        api_key: HDFC_CONFIG.api_key,
        api_secret: HDFC_CONFIG.api_secret
      })
    });
    const data = await resp.json();
    console.log('OTP Response:', data);
    if (resp.ok && data.token_id) {
      hdfcTokenId = data.token_id;
      status.textContent = 'OTP sent. Enter OTP and Login.';
    } else if (resp.ok && data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      status.textContent = 'Login successful!';
      // optionally close modal here
    } else {
      status.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    console.error('OTP request error:', err);
    status.textContent = 'Request failed: ' + err.message;
  }
}

async function submitHDFCLogin() {
  const otp = document.getElementById('hdfc_otp').value.trim();
  const status = document.getElementById('hdfc-otp-status');
  if (!otp) { status.textContent = 'Enter OTP'; return; }
  if (!hdfcTokenId) { status.textContent = 'No OTP session found'; return; }
  status.textContent = 'Validating OTP...';
  try {
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'verify',
        otp,
        token_id: hdfcTokenId,
        api_key: HDFC_CONFIG.api_key,
        api_secret: HDFC_CONFIG.api_secret
      })
    });
    const data = await resp.json();
    console.log('OTP Validate Response:', data);
    if (resp.ok && data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      status.textContent = 'Login successful!';
      // optionally close modal here
    } else {
      status.textContent = data.error || 'OTP validation failed';
    }
  } catch (err) {
    console.error('OTP validate error:', err);
    status.textContent = 'Validation failed: ' + err.message;
  }
}

// RESEND OTP
async function resendHDFCOtp() {
    if (!hdfcRequestToken) {
        document.getElementById('hdfc_otp_status').textContent = 'No active session. Please click "Request OTP" first.';
        document.getElementById('hdfc_otp_status').style.color = '#dc2626';
        return;
    }
    
    const otpStatus = document.getElementById('hdfc_otp_status');
    otpStatus.textContent = 'Resending OTP...';
    otpStatus.style.color = '#2563eb';
    
    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                step: 'resend_otp',
                request_token: hdfcRequestToken
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            otpStatus.textContent = 'OTP resent successfully!';
            otpStatus.style.color = '#059669';
        } else {
            otpStatus.textContent = data.error || 'Failed to resend OTP. Please try again.';
            otpStatus.style.color = '#dc2626';
        }
    } catch (error) {
        console.error('Resend OTP Error:', error);
        otpStatus.textContent = 'Failed to resend OTP. Please try again.';
        otpStatus.style.color = '#dc2626';
    }
}

// CONNECT HDFC
function connectHDFC() {
    openHDFCLoginModal();
}

// UPDATE CONNECTION STATUS ON UI
function updateHDFCConnectionStatus() {
    const statusEls = document.querySelectorAll('.hdfc-connection-status');
    const connected = !!localStorage.getItem('hdfc_access_token');
    statusEls.forEach(el => {
        el.textContent = connected ? '✅ Connected' : '❌ Not Connected';
        el.style.color = connected ? '#059669' : '#dc2626';
    });
}

// DISCONNECT ACTION
function disconnectHDFC() {
    localStorage.removeItem('hdfc_access_token');
    hdfcAccessToken = null;
    showHDFCMessage('Disconnected from HDFC Securities', 'info');
    updateHDFCConnectionStatus();
}

// TEST CONNECTION ACTION
async function testHDFCConnection() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        showHDFCMessage('No access token. Please login first.', 'warning');
        return;
    }
    
    showHDFCMessage('Testing connection...', 'info');
    try {
        const holdings = await fetchHDFCHoldings();
        showHDFCMessage('Connection test successful!', 'success');
    } catch (error) {
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// FETCH HOLDINGS FROM BACKEND
async function fetchHDFCHoldings() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) throw new Error('Not authenticated. Please login first.');
    
    const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            access_token: token, 
            api_key: HDFC_CONFIG.api_key 
        })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch holdings');
    return data.data;
}

// IMPORT ALL HOLDINGS INTO DASHBOARD DATABASE
async function hdfcImportAll() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        showHDFCMessage('Please login to HDFC Securities first', 'warning');
        return;
    }
    
    showHDFCMessage('Importing all HDFC holdings...', 'info');
    try {
        const holdings = await fetchHDFCHoldings();
        let importCount = 0;
        
        for (const holding of holdings || []) {
            if (holding.instrument_type === 'EQUITY' || holding.segment === 'NSE' || holding.segment === 'BSE') {
                await importEquityHolding(holding);
                importCount++;
            }
            else if (holding.instrument_type === 'MF' || holding.product_type === 'MF') {
                await importMFHolding(holding);
                importCount++;
            }
        }
        
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Successfully imported ${importCount} holdings!`, 'success');
        if (typeof loadDashboardData === 'function') await loadDashboardData();
    } catch(error) {
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

// Helper functions for importing holdings
async function importEquityHolding(holding) {
    if (typeof investments === 'undefined' || typeof addInvestmentData !== 'function') return;
    
    const exists = investments.some(inv => 
        inv.member_id === HDFC_CONFIG.members.equity && 
        inv.symbol_or_name === holding.symbol && 
        inv.broker_platform && inv.broker_platform.includes('HDFC Securities'));
    
    if (!exists) {
        await addInvestmentData({
            member_id: HDFC_CONFIG.members.equity,
            investment_type: 'equity',
            symbol_or_name: holding.symbol || holding.trading_symbol,
            invested_amount: (holding.quantity || 0) * (holding.average_price || 0),
            current_value: (holding.quantity || 0) * (holding.ltp || holding.last_price || 0),
            broker_platform: 'HDFC Securities Equity (Pradeep)',
            hdfc_data: holding,
            equity_quantity: holding.quantity || 0,
            equity_avg_price: holding.average_price || 0,
            equity_symbol: holding.symbol || holding.trading_symbol,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
        });
    }
}

async function importMFHolding(holding) {
    if (typeof investments === 'undefined' || typeof addInvestmentData !== 'function') return;
    
    const exists = investments.some(inv => 
        inv.member_id === HDFC_CONFIG.members.mf && 
        inv.folio_number === holding.folio && 
        inv.broker_platform && inv.broker_platform.includes('HDFC Securities'));
    
    if (!exists) {
        await addInvestmentData({
            member_id: HDFC_CONFIG.members.mf,
            investment_type: 'mutualFunds',
            symbol_or_name: holding.fund_name || holding.symbol,
            invested_amount: (holding.units || 0) * (holding.average_nav || 0),
            current_value: (holding.units || 0) * (holding.nav || holding.ltp || 0),
            broker_platform: 'HDFC Securities MF (Sanchita)',
            hdfc_data: holding,
            mf_quantity: holding.units || 0,
            mf_nav: holding.nav || holding.ltp || 0,
            mf_average_price: holding.average_nav || 0,
            fund_name: holding.fund_name || holding.symbol,
            folio_number: holding.folio || '',
            scheme_code: holding.scheme_code || '',
            fund_house: holding.fund_house || 'HDFC',
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
        });
    }
}

// UPDATE prices for existing holdings
async function hdfcUpdatePrices() {
    const token = localStorage.getItem('hdfc_access_token');
    if (!token) {
        showHDFCMessage('Please login to HDFC Securities first', 'warning');
        return;
    }
    
    showHDFCMessage('Updating holding prices...', 'info');
    try {
        const holdings = await fetchHDFCHoldings();
        let updateCount = 0;
        
        if (typeof investments !== 'undefined') {
            const hdfcInvestments = investments.filter(inv => 
                inv.broker_platform && inv.broker_platform.includes('HDFC Securities'));
            
            for (const inv of hdfcInvestments) {
                const matched = holdings.find(h => 
                    h.symbol === inv.symbol_or_name || h.trading_symbol === inv.symbol_or_name);
                if (matched) {
                    const newVal = (matched.quantity || 0) * (matched.ltp || matched.last_price || 0);
                    const idx = investments.findIndex(i => i.id === inv.id);
                    if (idx !== -1) {
                        investments[idx].current_value = newVal;
                        investments[idx].last_updated = new Date().toISOString();
                        if (inv.investment_type === 'equity') {
                            investments[idx].equity_quantity = matched.quantity || 0;
                        } else if (inv.investment_type === 'mutualFunds') {
                            investments[idx].mf_quantity = matched.units || 0;
                            investments[idx].mf_nav = matched.nav || matched.ltp || 0;
                        }
                    }
                    if (typeof updateInvestmentData === 'function') {
                        await updateInvestmentData(inv.id, { 
                            current_value: newVal, 
                            last_updated: new Date().toISOString() 
                        });
                    }
                    updateCount++;
                }
            }
        }
        
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Updated ${updateCount} holdings`, 'success');
        if (typeof loadDashboardData === 'function') await loadDashboardData();
    } catch(error) {
        showHDFCMessage(`Price update failed: ${error.message}`, 'error');
    }
}

// SHOW HDFC SETTINGS MODAL
function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc_settings_modal');
    if (oldModal) oldModal.remove();
    
    const modalContent = `
    <div id="hdfc_settings_modal" class="modal" style="display:block; position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;">
        <div style="background:#fff; max-width:700px; margin:3% auto; padding:24px; border-radius:12px; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.15);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-size:24px; color:#2c5aa0;">🏦 HDFC Securities Settings</h3>
                <button onclick="closeHDFCModal()" style="background:none; border:none; font-size:28px; cursor:pointer; color:#666; line-height:1;">&times;</button>
            </div>
            
            <div class="connection-status" style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left:4px solid #3b82f6;">
                <h4 style="margin:0 0 12px 0; color:#1e40af;">Connection Status</h4>
                <div id="hdfc-modal-connection">
                    <span class="hdfc-connection-status" style="font-weight:500;">❌ Not Connected</span>
                </div>
                <div style="margin-top: 8px; font-size: 14px; color: #64748b;">
                    Last sync: <span id="hdfc-modal-sync">Never</span>
                </div>
            </div>
            
            <div class="account-mapping" style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin-bottom: 24px; border-left:4px solid #10b981;">
                <h4 style="margin:0 0 12px 0; color:#047857;">📋 Account Mapping</h4>
                <div style="font-size:14px; line-height:1.6;">
                    <strong>Equity Holdings:</strong> Pradeep Kumar V<br>
                    <strong>Mutual Funds:</strong> Sanchita Pradeep
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:24px;">
                <button onclick="connectHDFC()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#3b82f6; color:white;">
                    🔗 Connect to HDFC
                </button>
                <button onclick="disconnectHDFC()" style="padding:12px 20px; border:2px solid #e5e7eb; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:white; color:#374151;">
                    🔌 Disconnect
                </button>
                <button onclick="testHDFCConnection()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#06b6d4; color:white;">
                    🧪 Test Connection
                </button>
                <button onclick="hdfcImportAll()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#059669; color:white;">
                    📥 Import Holdings
                </button>
                <button onclick="hdfcUpdatePrices()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#d97706; color:white;">
                    🔄 Update Prices
                </button>
            </div>
            
            <div class="requirements" style="background: #fef2f2; padding: 20px; border-radius: 10px; border-left:4px solid #ef4444;">
                <h4 style="margin:0 0 12px 0; color:#dc2626;">⚠️ Requirements</h4>
                <ul style="margin:0; padding-left:20px; font-size:14px; line-height:1.6;">
                    <li>Active HDFC Securities InvestRight account</li>
                    <li>API access enabled (contact HDFC Securities)</li>
                    <li>Valid API Key and Secret configured</li>
                    <li>Registered mobile/email for OTP</li>
                </ul>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateHDFCModalStatus();
}

// Close HDFC settings modal
function closeHDFCModal() {
    const modal = document.getElementById('hdfc_settings_modal');
    if (modal) modal.remove();
}

// Update modal status info
function updateHDFCModalStatus() {
    const statusSpan = document.querySelector('.hdfc-connection-status');
    if (!statusSpan) return;
    
    const connected = !!localStorage.getItem('hdfc_access_token');
    statusSpan.textContent = connected ? '✅ Connected' : '❌ Not Connected';
    statusSpan.style.color = connected ? '#059669' : '#dc2626';
    
    const lastSync = localStorage.getItem('hdfc_last_sync');
    const syncSpan = document.getElementById('hdfc-modal-sync');
    if (syncSpan) {
        syncSpan.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
    }
}

// Initialize connection status on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('hdfc_access_token');
    if (savedToken) {
        hdfcAccessToken = savedToken;
    }
    updateHDFCConnectionStatus();
});

// Export functions to window
window.connectHDFC = connectHDFC;
window.disconnectHDFC = disconnectHDFC;
window.testHDFCConnection = testHDFCConnection;
window.hdfcImportAll = hdfcImportAll;
window.hdfcUpdatePrices = hdfcUpdatePrices;
window.showHDFCSettings = showHDFCSettings;
window.requestHDFCOtp = requestHDFCOtp;
window.submitHDFCLogin = submitHDFCLogin;
window.resendHDFCOtp = resendHDFCOtp;
window.closeHDFCLoginModal = closeHDFCLoginModal;
window.closeHDFCModal = closeHDFCModal;
