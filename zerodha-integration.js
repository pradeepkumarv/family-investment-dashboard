// zerodha-integrated.js — Corrected full version with modal and member mapping

const ZERODHA_CONFIG = {
  api_key: 'ci3r8cbqb',  // Your actual API key here
  base_url: 'https://api.kite.trade',
  login_url: 'https://kite.zerodha.com/login'
};

// State variables
let zerodhaAccessToken = null;
let autoRefreshInterval = null;
let refreshIntervalMinutes = 0;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000;
const MAX_API_CALLS_PER_MINUTE = 100;

// Utilities
function log(msg, type='info') {
  const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
  console.log(`${emoji} [${new Date().toISOString()}] ZERODHA: ${msg}`);
}
function showZerodhaMessage(msg, type='info') {
  if (typeof showMessage === 'function') showMessage(`Zerodha: ${msg}`, type);
  else console.log(msg);
}
function safeHTML(el, html) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (!el) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  el.innerHTML = '';
  while (tmp.firstChild) el.appendChild(tmp.firstChild);
}
function canMakeAPICall() {
  const now = Date.now();
  if (now > apiCallResetTime) {
    apiCallCount = 0;
    apiCallResetTime = now + 60000;
  }
  if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
    log('Rate limit exceeded', 'warning');
    return false;
  }
  apiCallCount++;
  return true;
}

// Authentication
function generateLoginURL() {
  return `${ZERODHA_CONFIG.login_url}?api_key=${ZERODHA_CONFIG.api_key}`;
}
function extractRequestToken() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') === 'success' && params.get('action') === 'login') {
    return params.get('request_token');
  }
  return null;
}
async function generateSession(request_token) {
  try {
    log('Requesting session from backend...');
    const response = await fetch('https://family-investment-dashboard-4hli.vercel.app/api/zerodha/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_token }),
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.error || data.message || 'Session creation failed');
    zerodhaAccessToken = data.data.access_token;
    localStorage.setItem('zerodha_access_token', zerodhaAccessToken);
    localStorage.setItem('zerodha_user_data', JSON.stringify(data.data));
    log('Session created successfully', 'success');
    return data.data;
  } catch (error) {
    log(error.message, 'error');
    throw error;
  }
}
async function initFromStorage() {
  const token = localStorage.getItem('zerodha_access_token');
  if (!token) return false;
  zerodhaAccessToken = token;
  return verifyToken();
}
async function verifyToken() {
  if (!zerodhaAccessToken || !canMakeAPICall()) return false;
  try {
    const response = await fetch(`${ZERODHA_CONFIG.base_url}/user/profile`, {
      headers: {
        'Authorization': `token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
        'X-Kite-Version': '3',
      }
    });
    const data = await response.json();
    return data.status === 'success';
  } catch {
    return false;
  }
}
function clearStorage() {
  localStorage.removeItem('zerodha_access_token');
  localStorage.removeItem('zerodha_user_data');
  clearInterval(autoRefreshInterval);
  zerodhaAccessToken = null;
}

// API requests
async function apiRequest(endpoint, method = 'GET', params = {}) {
  if (!zerodhaAccessToken) throw new Error('Not connected');
  if (!canMakeAPICall()) throw new Error('API rate limited');
  const url = new URL(`${ZERODHA_CONFIG.base_url}${endpoint}`);
  const options = {
    method,
    headers: {
      'Authorization': `token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
      'X-Kite-Version': '3',
      'Content-Type': 'application/json'
    }
  };
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  } else {
    options.body = JSON.stringify(params);
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (data.status !== 'success') throw new Error(data.message || 'API error');
  return data.data;
}
async function getHoldings() {
  return apiRequest('/portfolio/holdings');
}

// Import and update
async function importHoldings() {
  const pradeepId = 'bef9dbfa-2a47-49ce-b17a-19e5a40d4e98';
  const holdings = await getHoldings();
  const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');
  let count = 0;
  for (const holding of holdings) {
    if (!investments.some(inv =>
      inv.member_id === pradeepId &&
      inv.symbol_or_name === holding.tradingsymbol &&
      inv.broker_platform.includes('Zerodha')
    )) {
      await addInvestmentData({
        member_id: pradeepId,
        investment_type: 'equity',
        symbol_or_name: holding.tradingsymbol,
        invested_amount: holding.quantity * holding.average_price,
        current_value: holding.quantity * holding.last_price,
        broker_platform: `Zerodha (${userData.user_id})`,
        zerodha_data: holding,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });
      count++;
    }
  }
  showZerodhaMessage(`Imported ${count} holdings`, 'success');
  await loadDashboardData();
}
async function updatePrices() {
  if (!zerodhaAccessToken) throw new Error('Not connected');
  const holdings = await getHoldings();
  let updatedCount = 0;
  for (const inv of investments.filter(i => i.broker_platform.includes('Zerodha'))) {
    const matchingHolding = holdings.find(h => h.tradingsymbol === inv.symbol_or_name);
    if (matchingHolding) {
      await updateInvestmentInDashboard(inv.id, {
        current_value: matchingHolding.quantity * matchingHolding.last_price,
        last_updated: new Date().toISOString()
      });
      updatedCount++;
    }
  }
  showZerodhaMessage(`Updated ${updatedCount} prices`, 'success');
}

// Auto refresh
function startAuto(minutes) {
  clearInterval(autoRefreshInterval);
  if (minutes > 0) {
    refreshIntervalMinutes = minutes;
    autoRefreshInterval = setInterval(updatePrices, minutes * 60 * 1000);
    localStorage.setItem('zerodha_refresh', minutes);
    updateNextRefreshText();
  }
}
function stopAuto() {
  clearInterval(autoRefreshInterval);
  refreshIntervalMinutes = 0;
  localStorage.removeItem('zerodha_refresh');
  updateNextRefreshText();
}
function updateNextRefreshText() {
  const el = document.getElementById('next-refresh');
  if (el) {
    el.textContent = refreshIntervalMinutes > 0
      ? `Next refresh: ${new Date(Date.now() + refreshIntervalMinutes * 60000).toLocaleTimeString()}`
      : '';
  }
}

// Settings Modal
function showSettings() {
  if (!document.getElementById('zerodha_settings_modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="zerodha_settings_modal" class="modal hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;">
        <div style="background:#fff;padding:20px;border-radius:12px;max-width:400px;width:90%;">
          <h2>Zerodha Integration Settings</h2>
          <div id="zerodha_connection_status" style="margin-bottom:16px;"></div>
          <hr/>
          <button id="btn_import_holdings" disabled style="padding:8px 12px;">Import Holdings</button>
          <button id="btn_update_prices" disabled style="padding:8px 12px; margin-left:10px;">Update Prices</button>
          <hr/>
          <label for="select_refresh_interval">Auto-refresh:</label><br/>
          <select id="select_refresh_interval" style="width:100%; margin-bottom:16px;">
            <option value="0">Off</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
          <button id="btn_close_settings" style="padding:6px 12px;">Close</button>
        </div>
      </div>
    `);

    document.getElementById('btn_import_holdings').addEventListener('click', importHoldings);
    document.getElementById('btn_update_prices').addEventListener('click', updatePrices);
    document.getElementById('select_refresh_interval').addEventListener('change', e => {
      const val = +e.target.value;
      if (val > 0) startAuto(val);
      else stopAuto();
    });
    document.getElementById('btn_close_settings').addEventListener('click', () => {
      document.getElementById('zerodha_settings_modal').classList.add('hidden');
    });
  }

  const user = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');
  updateConnectionStatus(Boolean(zerodhaAccessToken), user);
  const savedRefresh = localStorage.getItem('zerodha_refresh') || '0';
  document.getElementById('select_refresh_interval').value = savedRefresh;
  
  const modal = document.getElementById('zerodha_settings_modal');
  modal.classList.remove('hidden');

  const enabled = Boolean(zerodhaAccessToken);
  document.getElementById('btn_import_holdings').disabled = !enabled;
  document.getElementById('btn_update_prices').disabled = !enabled;
}

// Update connection status UI
function updateConnectionStatus(connected, user) {
  const el = document.getElementById('zerodha_connection_status');
  if (!el) return;
  if (connected) {
    safeHTML(el, `
      <div style="padding:8px;background:#e6ffed;border:1px solid #34d058;border-radius:6px;display:flex;align-items:center;gap:8px;">
        ✅ Connected <small>${user.user_name || ''}</small>
        <button onclick="disconnect()" style="margin-left:auto">Disconnect</button>
      </div>
      <div id="last-refresh" style="font-size:12px;margin-top:4px;"></div>
      <div id="next-refresh" style="font-size:12px;margin-top:2px;"></div>
    `);
  } else {
    safeHTML(el, `
      <div style="padding:8px;background:#ffeef0;border:1px solid #cb2431;border-radius:6px;display:flex;align-items:center;gap:8px;">
        ❌ Not Connected
        <button onclick="connect()" style="margin-left:auto">Connect</button>
      </div>
    `);
  }
}

// Public API
window.connect = async function() {
  if (await initFromStorage()) {
    updateConnectionStatus(true, JSON.parse(localStorage.getItem('zerodha_user_data')));
    return;
  }
  const rt = extractRequestToken();
  if (rt) {
    const u = await generateSession(rt);
    updateConnectionStatus(true, u);
    history.replaceState({}, '', location.pathname);
  } else {
    location.href = generateLoginURL();
  }
};
window.disconnect = function() {
  clearStorage();
  updateConnectionStatus(false);
};
window.showSettings = showSettings;
window.showZerodhaSettingsModal = showSettings; // alias
window.startAuto = startAuto;
window.stopAuto = stopAuto;

// Initialization on startup
document.addEventListener('DOMContentLoaded', async () => {
  if (await initFromStorage()) {
    updateConnectionStatus(true, JSON.parse(localStorage.getItem('zerodha_user_data')));
    const iv = +localStorage.getItem('zerodha_refresh') || 0;
    if (iv > 0) startAuto(iv);
  } else {
    updateConnectionStatus(false);
  }
});
