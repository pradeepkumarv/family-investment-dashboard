// public/js/hdfc-securities-integration.js
// Frontend integration for HDFC Securities (login, OTP, holdings import, modal UI)

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

// Utility: show in-app messages (falls back to console)
function showHDFCMessage(msg, type = 'info') {
  if (typeof showMessage === 'function') showMessage(`HDFC Securities: ${msg}`, type);
  else console.log(`HDFC: ${msg}`);
}

/* ---------- UI: Login modal & settings modal ---------- */

function openHDFCLoginModal() {
  const oldModal = document.getElementById('hdfc_login_modal');
  if (oldModal) oldModal.remove();

  const modalContent = `
    <div id="hdfc_login_modal" class="modal-fixed"
        style="display:block; position:fixed; top:0; left:0; width:100vw; height:100vh;
            background:rgba(50,60,65,0.65); z-index:9999;">
      <div style="background:#fff; max-width:390px; margin:7% auto; padding:32px 26px; border-radius:16px; position:relative; font-family:Segoe UI,Arial,sans-serif;">
        <button aria-label="Close" onclick="closeHDFCLoginModal()" style="position:absolute; top:13px; right:18px; background:transparent; border:none; font-size:28px; cursor:pointer; color:#888;">&times;</button>
        <h2 style="margin:0 0 20px 0; font-size:1.32em; color:#355c9c; font-weight:bold;">HDFC Securities Login</h2>
        <div style="margin-bottom:15px;">
            <label>Username / Client ID</label>
            <input type="text" id="hdfc_username" autocomplete="username" style="width:100%; margin-top:3px; padding:10px; border-radius:7px; border:1px solid #ccd7ef;" />
        </div>
        <div style="margin-bottom:15px;">
            <label>Password / MPIN</label>
            <input type="password" id="hdfc_password" autocomplete="current-password" style="width:100%; margin-top:3px; padding:10px; border-radius:7px; border:1px solid #ccd7ef;" />
        </div>
        <div style="margin-bottom:18px;">
            <label>OTP (One Time Password)</label>
            <div style="display:flex;gap:8px;">
                <input type="text" id="hdfc_otp" autocomplete="one-time-code" style="flex:1; padding:10px; border-radius:7px; border:1px solid #ccd7ef;" />
                <button onclick="requestHDFCOtp()" id="hdfc_request_otp_btn" style="padding:0 13px; border:none; border-radius:6px; background:#e8f0fe; color:#0355b0; cursor:pointer; height:40px;">Request OTP</button>
            </div>
            <div style="display:flex; gap:5px; margin-top:5px;">
                <button onclick="resendHDFCOtp()" id="hdfc_resend_otp_btn" style="font-size:0.85em; background:none; border:none; color:#0355b0; cursor:pointer; text-decoration:underline;">Resend OTP</button>
            </div>
            <span id="hdfc_otp_status" style="color:#c43030;font-size:0.91em;display:block;margin-top:4px;"></span>
        </div>
        <div style="margin-top:24px; display:flex; justify-content:space-between; gap:10px;">
            <button onclick="submitHDFCLogin()" id="hdfc_login_btn" style="padding:9px 28px; border:none; border-radius:8px; background:#2c7be5; color:#fff; font-weight:bold; cursor:pointer;">Login</button>
            <button onclick="closeHDFCLoginModal()" style="padding:9px 18px; border:none; border-radius:8px; background:#eaedf3; color:#212326; cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closeHDFCLoginModal() {
  const modal = document.getElementById('hdfc_login_modal');
  if (modal) modal.remove();
  hdfcRequestToken = null;
}

/* Settings modal (restores original UI + dynamic status) */
function showHDFCSettings() {
  const oldModal = document.getElementById('hdfc_settings_modal');
  if (oldModal) oldModal.remove();

  const modalContent = `
    <div id="hdfc_settings_modal" class="modal" style="display:block; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000;">
        <div style="background:#fff; max-width:700px; margin:5% auto; padding:20px; border-radius:10px; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>🏦 HDFC Securities Settings</h3>
                <button onclick="closeHDFCModal()" style="font-size:26px; cursor:pointer;">&times;</button>
            </div>
            <div class="connection-status" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <h4>Connection Status</h4>
                <div id="hdfc-modal-connection">
                    <span class="hdfc-connection-status">❌ Not Connected</span>
                </div>
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Last sync: <span id="hdfc-modal-sync">Never</span>
                </div>
            </div>
            <div class="account-mapping" style="background: #e6fffa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4>📋 Account Mapping</h4>
                <div>
                    <strong>Equity Holdings:</strong> Pradeep Kumar V<br>
                    <strong>Mutual Funds:</strong> Sanchita Pradeep
                </div>
            </div>
            <div style="margin:20px 0; display:flex; gap:10px; flex-wrap:wrap;">
                <button onclick="connectHDFC()" class="btn btn-primary">🔗 Connect to HDFC Securities</button>
                <button onclick="disconnectHDFC()" class="btn btn-secondary">🔌 Disconnect</button>
                <button onclick="testHDFCConnection()" class="btn btn-info">🧪 Test Connection</button>
                <button onclick="hdfcImportAll()" class="btn btn-success">📥 Import All Holdings</button>
                <button onclick="hdfcUpdatePrices()" class="btn btn-warning">🔄 Update Prices</button>
            </div>
            <div class="requirements" style="background: #ffebee; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h4>⚠️ Requirements</h4>
                <ul>
                    <li>Active HDFC Securities InvestRight account</li>
                    <li>API access enabled (contact HDFC Securities)</li>
                    <li>Valid API Key and Secret</li>
                    <li>Backend endpoints properly deployed</li>
                </ul>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalContent);
  updateHDFCModalStatus();
}
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-hdfc-settings');
  if (btn) btn.addEventListener('click', showHDFCSettings);
});


function closeHDFCModal() {
  const modal = document.getElementById('hdfc_settings_modal');
  if (modal) modal.remove();
}

function updateHDFCModalStatus() {
  const statusSpan = document.querySelector('.hdfc-connection-status');
  if (!statusSpan) return;

  const connected = !!localStorage.getItem('hdfc_access_token');
  statusSpan.textContent = connected ? '✅ Connected' : '❌ Not Connected';
  statusSpan.style.color = connected ? '#28a745' : '#dc3545';

  const lastSync = localStorage.getItem('hdfc_last_sync');
  const syncSpan = document.getElementById('hdfc-modal-sync');
  if (syncSpan) syncSpan.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
}

/* ---------- OTP + Login flow ---------- */

async function requestHDFCOtp() {
  const username = document.getElementById('hdfc_username').value.trim();
  const password = document.getElementById('hdfc_password').value.trim();
  const otpStatus = document.getElementById('hdfc_otp_status');

  if (!username || !password) {
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'Please enter username and password first.';
    return;
  }

  otpStatus.style.color = '#333';
  otpStatus.textContent = 'Requesting OTP...';

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
    console.log('Initiate Response:', data);

    if (data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      otpStatus.style.color = 'green';
      otpStatus.textContent = 'Login successful!';
      showHDFCMessage('HDFC connected successfully!', 'success');
      closeHDFCLoginModal();
      updateHDFCConnectionStatus();
      return;
    }

    if (data.requires_2fa && data.request_token) {
      hdfcRequestToken = data.request_token;
      otpStatus.style.color = '#333';
      otpStatus.textContent = 'OTP sent — check your registered mobile/email. Enter it above and click Login.';
      return;
    }

    otpStatus.style.color = '#c43030';
    otpStatus.textContent = data.error || JSON.stringify(data);
    console.error('Initiate failed: ', data);
  } catch (e) {
    console.error('Request OTP Error:', e);
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'Connection failed: ' + e.message;
  }
}

async function submitHDFCLogin() {
  const otp = document.getElementById('hdfc_otp').value.trim();
  const otpStatus = document.getElementById('hdfc_otp_status');

  if (!otp) {
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'Enter OTP sent by HDFC.';
    return;
  }

  if (!hdfcRequestToken) {
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'You must request OTP first.';
    return;
  }

  otpStatus.style.color = '#333';
  otpStatus.textContent = 'Validating OTP...';

  try {
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'verify',
        otp,
        request_token: hdfcRequestToken,
        api_key: HDFC_CONFIG.api_key,
        api_secret: HDFC_CONFIG.api_secret
      })
    });

    const data = await resp.json();
    console.log('Verify Response:', data);

    if (data.access_token) {
      hdfcAccessToken = data.access_token;
      localStorage.setItem('hdfc_access_token', hdfcAccessToken);
      otpStatus.style.color = 'green';
      otpStatus.textContent = 'Login successful!';
      showHDFCMessage('HDFC connected successfully!', 'success');
      closeHDFCLoginModal();
      updateHDFCConnectionStatus();
      return;
    }

    otpStatus.style.color = '#c43030';
    otpStatus.textContent = data.error || (data.details && JSON.stringify(data.details)) || 'OTP validation failed.';
    console.error('Verify failed:', data);
  } catch (e) {
    console.error('Submit Login Error:', e);
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'Validation failed: ' + e.message;
  }
}

async function resendHDFCOtp() {
  const otpStatus = document.getElementById('hdfc_otp_status');
  if (!hdfcRequestToken) {
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'No active session to resend OTP. Please Request OTP first.';
    return;
  }

  otpStatus.style.color = '#333';
  otpStatus.textContent = 'Resending OTP...';

  try {
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'resend_otp',
        request_token: hdfcRequestToken,
        api_key: HDFC_CONFIG.api_key,
        api_secret: HDFC_CONFIG.api_secret
      })
    });

    const data = await resp.json();
    if (resp.ok && data.success) {
      otpStatus.style.color = '#333';
      otpStatus.textContent = data.message || 'OTP resent successfully!';
    } else {
      otpStatus.style.color = '#c43030';
      otpStatus.textContent = data.error || JSON.stringify(data);
    }
  } catch (e) {
    otpStatus.style.color = '#c43030';
    otpStatus.textContent = 'Failed to resend OTP: ' + e.message;
  }
}

/* ---------- Connection management and holdings ---------- */

function connectHDFC() {
  openHDFCLoginModal();
}

function updateHDFCConnectionStatus() {
  const statusEls = document.querySelectorAll('.hdfc-connection-status');
  const connected = !!localStorage.getItem('hdfc_access_token');
  statusEls.forEach(el => {
    el.textContent = connected ? '✅ Connected' : '❌ Not Connected';
    el.style.color = connected ? '#28a745' : '#dc3545';
  });
}

function disconnectHDFC() {
  localStorage.removeItem('hdfc_access_token');
  hdfcAccessToken = null;
  hdfcRequestToken = null;
  showHDFCMessage('Disconnected from HDFC Securities', 'info');
  updateHDFCConnectionStatus();
}

async function testHDFCConnection() {
  const token = localStorage.getItem('hdfc_access_token');
  if (!token) {
    showHDFCMessage('No access token. Please login first.', 'warning');
    return;
  }
  showHDFCMessage('Testing connection...', 'info');
  try {
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, api_key: HDFC_CONFIG.api_key })
    });
    const data = await resp.json();
    if (resp.ok) showHDFCMessage('Connection works: holdings fetched', 'success');
    else showHDFCMessage('Test failed: ' + (data.error || JSON.stringify(data)), 'error');
  } catch (e) {
    showHDFCMessage('Test failed: ' + e.message, 'error');
  }
}

async function fetchHDFCHoldings() {
  const token = localStorage.getItem('hdfc_access_token') || hdfcAccessToken;
  if (!token) throw new Error('Not authenticated. Please login.');
  const resp = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, api_key: HDFC_CONFIG.api_key })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to fetch holdings');
  return data.data;
}

async function hdfcImportAll() {
  const token = localStorage.getItem('hdfc_access_token') || hdfcAccessToken;
  if (!token) { showHDFCMessage('Please login to HDFC Securities first', 'warning'); return; }
  showHDFCMessage('Importing all HDFC holdings...', 'info');
  try {
    const holdings = await fetchHDFCHoldings();
    let importCount = 0;
    for (const h of holdings) {
      if (h.instrument_type === 'EQUITY' || h.segment === 'NSE' || h.segment === 'BSE') {
        await importEquityHolding(h);
        importCount++;
      } else if (h.instrument_type === 'MF' || h.product_type === 'MF') {
        await importMFHolding(h);
        importCount++;
      }
    }
    localStorage.setItem('hdfc_last_sync', new Date().toISOString());
    showHDFCMessage(`Imported ${importCount} holdings!`, 'success');
    if (typeof loadDashboardData === 'function') await loadDashboardData();
    updateHDFCModalStatus();
  } catch (e) {
    showHDFCMessage(`Import failed: ${e.message}`, 'error');
  }
}

async function hdfcUpdatePrices() {
  const token = localStorage.getItem('hdfc_access_token') || hdfcAccessToken;
  if (!token) { showHDFCMessage('Please login to HDFC Securities first', 'warning'); return; }
  showHDFCMessage('Updating holding prices...', 'info');
  try {
    const holdings = await fetchHDFCHoldings();
    let updateCount = 0;
    const hdfcInv = investments.filter(inv => inv.broker_platform?.includes('HDFC Securities'));
    for (const inv of hdfcInv) {
      const matched = holdings.find(h => h.symbol === inv.symbol_or_name || h.trading_symbol === inv.symbol_or_name);
      if (matched) {
        const newVal = (matched.quantity || 0) * (matched.ltp || matched.last_price || 0);
        const idx = investments.findIndex(i => i.id === inv.id);
        if (idx !== -1) {
          investments[idx].current_value = newVal;
          investments[idx].last_updated = new Date().toISOString();
          if (inv.investment_type === 'equity') investments[idx].equity_quantity = matched.quantity || 0;
          else if (inv.investment_type === 'mutualFunds') {
            investments[idx].mf_quantity = matched.units || 0;
            investments[idx].mf_nav = matched.nav || matched.ltp || 0;
          }
        }
        if (typeof updateInvestmentData === 'function') {
          await updateInvestmentData(inv.id, { current_value: newVal, last_updated: new Date().toISOString() });
        }
        updateCount++;
      }
    }
    localStorage.setItem('hdfc_last_sync', new Date().toISOString());
    showHDFCMessage(`Updated ${updateCount} holdings`, 'success');
    if (typeof loadDashboardData === 'function') await loadDashboardData();
    updateHDFCModalStatus();
  } catch (e) {
    showHDFCMessage(`Price update failed: ${e.message}`, 'error');
  }
}

/* ---------- Helper functions for importing (adapt to your app) ---------- */

async function importEquityHolding(h) {
  const exists = investments.some(inv =>
    inv.member_id === HDFC_CONFIG.members.equity &&
    inv.symbol_or_name === (h.symbol || h.trading_symbol) &&
    inv.broker_platform?.includes('HDFC Securities'));
  if (!exists) {
    await addInvestmentData({
      member_id: HDFC_CONFIG.members.equity,
      investment_type: 'equity',
      symbol_or_name: h.symbol || h.trading_symbol,
      invested_amount: (h.quantity || 0) * (h.average_price || 0),
      current_value: (h.quantity || 0) * (h.ltp || h.last_price || 0),
      broker_platform: 'HDFC Securities Equity (Pradeep)',
      hdfc_data: h,
      equity_quantity: h.quantity || 0,
      equity_avg_price: h.average_price || 0,
      equity_symbol: h.symbol || h.trading_symbol,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });
  }
}

async function importMFHolding(h) {
  const exists = investments.some(inv =>
    inv.member_id === HDFC_CONFIG.members.mf &&
    inv.folio_number === (h.folio || '') &&
    inv.broker_platform?.includes('HDFC Securities'));
  if (!exists) {
    await addInvestmentData({
      member_id: HDFC_CONFIG.members.mf,
      investment_type: 'mutualFunds',
      symbol_or_name: h.fund_name || h.symbol,
      invested_amount: (h.units || 0) * (h.average_nav || 0),
      current_value: (h.units || 0) * (h.nav || h.ltp || 0),
      broker_platform: 'HDFC Securities MF (Sanchita)',
      hdfc_data: h,
      mf_quantity: h.units || 0,
      mf_nav: h.nav || h.ltp || 0,
      mf_average_price: h.average_nav || 0,
      fund_name: h.fund_name || h.symbol,
      folio_number: h.folio || '',
      scheme_code: h.scheme_code || '',
      fund_house: h.fund_house || 'HDFC',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });
  }
}

/* ---------- Init & expose to window ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('hdfc_access_token');
  if (savedToken) hdfcAccessToken = savedToken;
  updateHDFCConnectionStatus();
});

// expose functions
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
