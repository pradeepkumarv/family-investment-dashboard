// hdfc-securities-integration.js - Frontend
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

function showHDFCMessage(msg, type = 'info') {
  if (typeof showMessage === 'function') showMessage(`HDFC Securities: ${msg}`, type);
  else console.log(`HDFC: ${msg}`);
}

/* modal code kept identical to your previous modal markup */
function openHDFCLoginModal() {
  const oldModal = document.getElementById('hdfc_login_modal');
  if (oldModal) oldModal.remove();

  const modalContent = `
    <div id="hdfc_login_modal" class="modal-fixed"
        style="display:block; position:fixed; top:0; left:0; width:100vw; height:100vh;
            background:rgba(50,60,65,0.65); z-index:9999;">
      <div style="background:#fff; max-width:390px; margin:7% auto; padding:32px 26px; border-radius:16px;">
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

/* REQUEST OTP (initiate) */
async function requestHDFCOtp() {
  const username = document.getElementById('hdfc_username').value.trim();
  const password = document.getElementById('hdfc_password').value.trim();
  const otpStatus = document.getElementById('hdfc_otp_status');

  if (!username || !password) {
    otpStatus.textContent = 'Please enter username and password first.';
    return;
  }

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

    // If backend returned ambiguous response, show details for debugging
    otpStatus.textContent = data.error || JSON.stringify(data);
    console.error('Initiate failed: ', data);
  } catch (e) {
    console.error('Request OTP Error:', e);
    otpStatus.textContent = 'Connection failed: ' + e.message;
  }
}

/* SUBMIT OTP (verify) */
async function submitHDFCLogin() {
  const otp = document.getElementById('hdfc_otp').value.trim();
  const otpStatus = document.getElementById('hdfc_otp_status');

  if (!otp) {
    otpStatus.textContent = 'Enter OTP sent by HDFC.';
    return;
  }

  if (!hdfcRequestToken) {
    otpStatus.textContent = 'You must request OTP first.';
    return;
  }

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

    // Server returns detailed errors in `error` or `details`
    otpStatus.textContent = data.error || (data.details && JSON.stringify(data.details)) || 'OTP validation failed.';
    console.error('Verify failed:', data);
  } catch (e) {
    console.error('Submit Login Error:', e);
    otpStatus.textContent = 'Validation failed: ' + e.message;
  }
}

/* RESEND OTP (calls server-side resend_otp step) */
async function resendHDFCOtp() {
  const otpStatus = document.getElementById('hdfc_otp_status');
  if (!hdfcRequestToken) {
    otpStatus.textContent = 'No active session to resend OTP. Please Request OTP first.';
    return;
  }

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
      otpStatus.textContent = data.error || JSON.stringify(data);
    }
  } catch (e) {
    otpStatus.textContent = 'Failed to resend OTP: ' + e.message;
  }
}

/* CONNECTION MANAGEMENT */
function connectHDFC() { openHDFCLoginModal(); }
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
  // A simple test: try fetch holdings (or implement a dedicated /ping API)
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

/* HOLDINGS / IMPORT functions left as-is but access token usage preserved */
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
  if (!localStorage.getItem('hdfc_access_token')) { showHDFCMessage('Please login to HDFC Securities first', 'warning'); return; }
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
  } catch (e) {
    showHDFCMessage(`Import failed: ${e.message}`, 'error');
  }
}

/* rest of helper functions (importEquityHolding, importMFHolding, update functions) unchanged - keep your existing implementations */

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('hdfc_access_token');
  if (savedToken) hdfcAccessToken = savedToken;
  updateHDFCConnectionStatus();
});

// Expose functions to window
window.connectHDFC = connectHDFC;
window.disconnectHDFC = disconnectHDFC;
window.testHDFCConnection = testHDFCConnection;
window.hdfcImportAll = hdfcImportAll;
window.showHDFCSettings = showHDFCSettings;
window.requestHDFCOtp = requestHDFCOtp;
window.submitHDFCLogin = submitHDFCLogin;
window.resendHDFCOtp = resendHDFCOtp;
window.closeHDFCLoginModal = closeHDFCLoginModal;
