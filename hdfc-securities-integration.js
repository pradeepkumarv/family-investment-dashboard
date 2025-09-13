// HDFC Securities Integration - Complete Implementation
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
let hdfcTokenId = null;

// Utility function for messages
function showHDFCMessage(msg, type = 'info') {
  if (typeof showMessage === 'function') {
    showMessage(`HDFC Securities: ${msg}`, type);
  } else {
    console.log(`HDFC: ${msg}`);
  }
}

// MAIN HDFC SETTINGS MODAL FUNCTION
function showHDFCSettings() {
  const oldModal = document.getElementById('hdfc-settings-modal');
  if (oldModal) oldModal.remove();

  const modalContent = `
    <div id="hdfc-settings-modal" class="modal" style="display:block; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
      <div style="background:#fff; max-width:700px; margin:3% auto; padding:24px; border-radius:12px; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="margin:0; font-size:24px; color:#2c5aa0;">🏦 HDFC Securities Settings</h3>
          <button onclick="closeHDFCModal()" style="background:none; border:none; font-size:28px; cursor:pointer; color:#666; line-height:1;">&times;</button>
        </div>
        
        <div class="connection-status" style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left:4px solid #3b82f6;">
          <h4 style="margin:0 0 12px 0; color:#1e40af;">Connection Status</h4>
          <div id="hdfc-connection-status">❌ Not Connected</div>
          <div style="margin-top: 8px; font-size: 14px; color: #64748b;">
            Last sync: <span id="hdfc-last-sync">Never</span>
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
          <button onclick="importHDFCHoldings()" style="padding:12px 20px; border:none; border-radius:8px; font-weight:500; cursor:pointer; transition:all 0.2s; background:#059669; color:white;">
            📥 Import Holdings
          </button>
        </div>
        
        <div class="account-mapping" style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin-bottom: 24px; border-left:4px solid #10b981;">
          <h4 style="margin:0 0 12px 0; color:#047857;">📋 Account Mapping</h4>
          <div style="font-size:14px; line-height:1.6;">
            <strong>Equity Holdings:</strong> Pradeep Kumar V<br>
            <strong>Mutual Funds:</strong> Sanchita Pradeep
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalContent);
  updateHDFCConnectionStatus();
}

// HDFC LOGIN MODAL
function connectHDFC() {
  const oldModal = document.getElementById('hdfc-login-modal');
  if (oldModal) oldModal.remove();

  const modalContent = `
    <div id="hdfc-login-modal" class="modal" style="display:block; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1001;">
      <div style="background:#fff; max-width:450px; margin:5% auto; padding:32px 28px; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15); position:relative;">
        <button onclick="closeHDFCLoginModal()" style="position:absolute; top:16px; right:20px; background:transparent; border:none; font-size:24px; cursor:pointer; color:#666; line-height:1;">&times;</button>
        
        <h2 style="margin:0 0 24px 0; font-size:24px; color:#2c5aa0; font-weight:600;">🏦 HDFC Securities Login</h2>
        
        <div style="margin-bottom:20px;">
          <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">Username / Client ID</label>
          <input type="text" id="hdfc-username" placeholder="Enter your client ID" style="width:100%; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px;" />
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">Password / MPIN</label>
          <input type="password" id="hdfc-password" placeholder="Enter your password" style="width:100%; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px;" />
        </div>
        
        <div style="margin-bottom:24px;">
          <label style="display:block; font-size:14px; color:#374151; margin-bottom:6px; font-weight:500;">OTP</label>
          <div style="display:flex; gap:12px;">
            <input type="text" id="hdfc-otp" placeholder="Enter OTP" maxlength="6" style="flex:1; padding:12px 16px; border-radius:8px; border:2px solid #e5e7eb; font-size:16px;" />
            <button onclick="requestHDFCOtp()" style="padding:12px 20px; border:none; font-size:14px; border-radius:8px; background:#3b82f6; color:white; cursor:pointer;">Request OTP</button>
          </div>
          <div id="hdfc-status" style="color:#dc2626; font-size:14px; margin-top:8px; min-height:20px;"></div>
        </div>
        
        <div style="display:flex; gap:12px;">
          <button onclick="submitHDFCLogin()" style="flex:1; padding:14px 24px; border:none; font-size:16px; border-radius:8px; background:#059669; color:white; cursor:pointer;">Login</button>
          <button onclick="closeHDFCLoginModal()" style="flex:0.5; padding:14px 24px; border:2px solid #e5e7eb; font-size:16px; border-radius:8px; background:white; color:#374151; cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalContent);
}

// REQUEST OTP FUNCTION
async function requestHDFCOtp() {
  const username = document.getElementById('hdfc-username').value.trim();
  const password = document.getElementById('hdfc-password').value.trim();
  const status = document.getElementById('hdfc-status');
  
  if (!username || !password) {
    status.textContent = 'Please enter username and password first.';
    status.style.color = '#dc2626';
    return;
  }
  
  status.textContent = 'Requesting OTP...';
  status.style.color = '#2563eb';

  try {
    const response = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
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
    
    const data = await response.json();
    console.log('OTP Request Response:', data);
    
    if (data.token_id) {
      hdfcTokenId = data.token_id;
      status.textContent = 'OTP sent! Please enter it above and click Login.';
      status.style.color = '#059669';
      document.getElementById('hdfc-otp').focus();
    } else if (data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      status.textContent = 'Login successful!';
      status.style.color = '#059669';
      showHDFCMessage('Connected successfully!', 'success');
      closeHDFCLoginModal();
      updateHDFCConnectionStatus();
    } else {
      status.textContent = data.error || 'Failed to request OTP';
      status.style.color = '#dc2626';
    }
  } catch (error) {
    console.error('OTP Request Error:', error);
    status.textContent = 'Connection failed. Please try again.';
    status.style.color = '#dc2626';
  }
}

// SUBMIT LOGIN FUNCTION
async function submitHDFCLogin() {
  const otp = document.getElementById('hdfc-otp').value.trim();
  const status = document.getElementById('hdfc-status');
  
  if (!otp) {
    status.textContent = 'Please enter the OTP.';
    status.style.color = '#dc2626';
    return;
  }
  
  if (!hdfcTokenId) {
    status.textContent = 'Please request OTP first.';
    status.style.color = '#dc2626';
    return;
  }
  
  status.textContent = 'Validating OTP...';
  status.style.color = '#2563eb';

  try {
    const response = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
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
    
    const data = await response.json();
    console.log('Login Response:', data);
    
    if (data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      status.textContent = 'Login successful!';
      status.style.color = '#059669';
      showHDFCMessage('Connected successfully!', 'success');
      closeHDFCLoginModal();
      updateHDFCConnectionStatus();
    } else {
      status.textContent = data.error || 'Login failed. Please try again.';
      status.style.color = '#dc2626';
    }
  } catch (error) {
    console.error('Login Error:', error);
    status.textContent = 'Login failed. Please try again.';
    status.style.color = '#dc2626';
  }
}

// FETCH HOLDINGS FROM BACKEND
async function fetchHDFCHoldings(type = 'equity') {
  const token = localStorage.getItem('hdfc_access_token');
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      api_key: HDFC_CONFIG.api_key,
      type: type
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch holdings');
  return data;
}

// IMPORT HOLDINGS FUNCTION
async function importHDFCHoldings() {
  const token = localStorage.getItem('hdfc_access_token');
  if (!token) {
    showHDFCMessage('Please connect to HDFC Securities first', 'warning');
    return;
  }
  
  showHDFCMessage('Importing HDFC holdings...', 'info');
  
  try {
    // Import Equity Holdings
    const equityData = await fetchHDFCHoldings('equity');
    if (equityData.data && Array.isArray(equityData.data)) {
      for (const holding of equityData.data) {
        await addInvestmentData({
          member_id: HDFC_CONFIG.members.equity,
          investment_type: 'equity',
          symbol_or_name: holding.symbol || holding.trading_symbol,
          invested_amount: (holding.quantity || 0) * (holding.average_price || 0),
          current_value: (holding.quantity || 0) * (holding.last_price || 0),
          broker_platform: 'HDFC Securities Equity (Pradeep)',
          hdfc_data: holding,
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Import Mutual Fund Holdings  
    const mfData = await fetchHDFCHoldings('mf');
    if (mfData.data && Array.isArray(mfData.data)) {
      for (const holding of mfData.data) {
        await addInvestmentData({
          member_id: HDFC_CONFIG.members.mf,
          investment_type: 'mutualFunds',
          symbol_or_name: holding.fund_name || holding.scheme_name,
          invested_amount: (holding.units || 0) * (holding.average_nav || 0),
          current_value: (holding.units || 0) * (holding.nav || 0),
          broker_platform: 'HDFC Securities MF (Sanchita)',
          hdfc_data: holding,
          created_at: new Date().toISOString()
        });
      }
    }
    
    localStorage.setItem('hdfc_last_sync', new Date().toISOString());
    showHDFCMessage('Holdings imported successfully!', 'success');
    
    // Refresh dashboard data
    if (typeof loadDashboardData === 'function') {
      await loadDashboardData();
    }
  } catch (error) {
    console.error('Import Error:', error);
    showHDFCMessage(`Import failed: ${error.message}`, 'error');
  }
}

// CONNECTION STATUS FUNCTIONS
function updateHDFCConnectionStatus() {
  const statusEl = document.getElementById('hdfc-connection-status');
  const syncEl = document.getElementById('hdfc-last-sync');
  
  if (statusEl) {
    const connected = localStorage.getItem('hdfc_access_token');
    statusEl.textContent = connected ? '✅ Connected' : '❌ Not Connected';
    statusEl.style.color = connected ? '#059669' : '#dc2626';
  }
  
  if (syncEl) {
    const lastSync = localStorage.getItem('hdfc_last_sync');
    syncEl.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
  }
}

function disconnectHDFC() {
  localStorage.removeItem('hdfc_access_token');
  localStorage.removeItem('hdfc_last_sync');
  hdfcAccessToken = null;
  hdfcTokenId = null;
  updateHDFCConnectionStatus();
  showHDFCMessage('Disconnected from HDFC Securities', 'info');
}

async function testHDFCConnection() {
  const token = localStorage.getItem('hdfc_access_token');
  if (!token) {
    showHDFCMessage('No access token found. Please login first.', 'warning');
    return;
  }
  
  try {
    await fetchHDFCHoldings('equity');
    showHDFCMessage('Connection test successful!', 'success');
  } catch (error) {
    showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
  }
}

// MODAL CLOSE FUNCTIONS
function closeHDFCModal() {
  const modal = document.getElementById('hdfc-settings-modal');
  if (modal) modal.remove();
}

function closeHDFCLoginModal() {
  const modal = document.getElementById('hdfc-login-modal');
  if (modal) modal.remove();
  hdfcTokenId = null;
}

// INITIALIZE ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('hdfc_access_token');
  if (savedToken) {
    hdfcAccessToken = savedToken;
  }
  updateHDFCConnectionStatus();
});

// MAKE FUNCTIONS GLOBALLY AVAILABLE
window.showHDFCSettings = showHDFCSettings;
window.connectHDFC = connectHDFC;
window.disconnectHDFC = disconnectHDFC;
window.testHDFCConnection = testHDFCConnection;
window.importHDFCHoldings = importHDFCHoldings;
window.requestHDFCOtp = requestHDFCOtp;
window.submitHDFCLogin = submitHDFCLogin;
window.closeHDFCModal = closeHDFCModal;
window.closeHDFCLoginModal = closeHDFCLoginModal;
