// zerodha-integration.js — Fixed Version with Member Select & Auto-Refresh
// Version 2.2.0

// ===== CONFIG =====
const ZERODHA_CONFIG = {
  api_key: 'ci3r8v1cbqb6e73p',
  base_url: 'https://api.kite.trade',
  login_url: 'https://kite.zerodha.com/connect/login'
};

// ===== STATE =====
let zerodhaAccessToken = null;
let autoRefreshInterval = null;
let refreshIntervalMinutes = 0;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000;
const MAX_API_CALLS_PER_MINUTE = 100;

// ===== UTIL =====
function log(msg, type='info') {
  const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
  console.log(`${emoji} [${new Date().toISOString()}] ZERODHA: ${msg}`);
}
function showZerodhaMessage(msg,type='info') {
  if (typeof showMessage==='function') showMessage(`Zerodha: ${msg}`, type);
  else console.log(msg);
}
function safeHTML(el, html) {
  if (typeof el==='string') el=document.getElementById(el);
  if (!el) return;
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  el.innerHTML='';
  while(tmp.firstChild) el.appendChild(tmp.firstChild);
}
function canMakeAPICall() {
  const now=Date.now();
  if (now>apiCallResetTime) {
    apiCallCount=0;
    apiCallResetTime=now+60000;
  }
  if (apiCallCount>=MAX_API_CALLS_PER_MINUTE) {
    log('Rate limit exceeded', 'warning');
    return false;
  }
  apiCallCount++;
  return true;
}

// ===== AUTH =====
function generateLoginURL() {
  return `${ZERODHA_CONFIG.login_url}?v=3&api_key=${ZERODHA_CONFIG.api_key}`;
}
function extractRequestToken() {
  const p=new URLSearchParams(location.search);
  if (p.get('status')==='success' && p.get('action')==='login') return p.get('request_token');
  return null;
}
async function generateSession(request_token) {
  try {
    log('Calling backend to generate session...');
    
    // Replace with your actual Vercel URL
    const response = await fetch('https://family-investment-dashboard-4hli.vercel.app/api/zerodha/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_token }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.error || data.message || 'Session generation failed');
    }

    // Store tokens
    zerodhaAccessToken = data.data.access_token;
    localStorage.setItem('zerodha_access_token', zerodhaAccessToken);
    localStorage.setItem('zerodha_user_data', JSON.stringify(data.data));
    
    log('Session generated successfully!', 'success');
    return data.data;
    
  } catch (error) {
    log(`Session generation error: ${error.message}`, 'error');
    throw error;
  }
}

async function initFromStorage() {
  const tok=localStorage.getItem('zerodha_access_token');
  if (!tok) return false;
  zerodhaAccessToken=tok;
  return verifyToken();
}
async function verifyToken() {
  if (!zerodhaAccessToken || !canMakeAPICall()) return false;
  const res=await fetch(`${ZERODHA_CONFIG.base_url}/user/profile`, {
    headers:{
      'Authorization':`token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
      'X-Kite-Version':'3'
    }
  });
  const j=await res.json();
  return j.status==='success';
}
function clearStorage() {
  localStorage.removeItem('zerodha_access_token');
  localStorage.removeItem('zerodha_user_data');
  clearInterval(autoRefreshInterval);
  zerodhaAccessToken=null;
}

// ===== API =====
async function apiRequest(ep, method='GET', params={}) {
  if (!zerodhaAccessToken) throw new Error('Not connected');
  if (!canMakeAPICall()) throw new Error('Rate limited');
  const url=new URL(ZERODHA_CONFIG.base_url+ep);
  const opt={ method, headers:{
    'Authorization':`token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,
    'X-Kite-Version':'3',
    'Content-Type':'application/json'
  }};
  if (method==='GET') Object.entries(params).forEach(([k,v])=>url.searchParams.append(k,v));
  else opt.body=JSON.stringify(params);
  const res=await fetch(url,opt), j=await res.json();
  if (j.status!=='success') throw new Error(j.message||j.error_type);
  return j.data;
}
async function getHoldings() { return apiRequest('/portfolio/holdings'); }

// ===== UI =====
function populateMemberSelect() {
  const sel=document.getElementById('member-select');
  if (!sel) return;
  sel.innerHTML='';
  familyMembers.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.id; o.textContent=m.name;
    sel.appendChild(o);
  });
}
function updateConnectionStatus(ok, user) {
  const c=document.getElementById('zerodha-connection-status');
  if (!c) return;
  if (ok) {
    safeHTML(c, `
      <div style="padding:8px;background:#e6ffed;border:1px solid #34d058;border-radius:6px;display:flex;align-items:center;gap:8px;">
        ✅ Connected <small>${user.user_name}</small>
        <button onclick="disconnect()" style="margin-left:auto">Disconnect</button>
      </div>
      <div id="last-refresh" style="font-size:12px;margin-top:4px;"></div>
      <div id="next-refresh" style="font-size:12px;margin-top:2px;"></div>
    `);
  } else {
    safeHTML(c, `
      <div style="padding:8px;background:#ffeef0;border:1px solid #cb2431;border-radius:6px;display:flex;align-items:center;gap:8px;">
        ❌ Not Connected
        <button onclick="connect()" style="margin-left:auto">Connect</button>
      </div>
    `);
  }
}

// ===== IMPORT & UPDATE =====
async function importHoldings(memberId) {
  const holdings=await getHoldings();
  const user=JSON.parse(localStorage.getItem('zerodha_user_data')||'{}');
  let cnt=0;
  for (const h of holdings) {
    if (!investments.some(i=>i.symbol_or_name===h.tradingsymbol && i.broker_platform.includes('Zerodha'))) {
      await addInvestmentData({
        member_id:memberId,
        investment_type:'equity',
        symbol_or_name:h.tradingsymbol,
        invested_amount:h.quantity*h.average_price,
        current_value:h.quantity*h.last_price,
        broker_platform:`Zerodha (${user.user_id})`,
        zerodha_data:h,
        created_at:new Date().toISOString(),
        last_updated:new Date().toISOString()
      });
      cnt++;
    }
  }
  showZerodhaMessage(`Imported ${cnt} holdings`, 'success');
  loadDashboardData();
}
async function updatePrices() {
  if (!zerodhaAccessToken) throw new Error('Not connected');
  const holdings=await getHoldings();
  let cnt=0;
  investments.filter(i=>i.broker_platform.includes('Zerodha')).forEach(async inv=>{
    const h=holdings.find(x=>x.tradingsymbol===inv.symbol_or_name);
    if (h) {
      await updateInvestmentInDashboard(inv.id, {
        current_value:h.quantity*h.last_price,
        last_updated:new Date().toISOString()
      });
      cnt++;
    }
  });
  showZerodhaMessage(`Updated ${cnt} prices`, 'success');
}

// ===== AUTO-REFRESH =====
function startAuto(mins) {
  clearInterval(autoRefreshInterval);
  if (mins>0) {
    refreshIntervalMinutes=mins;
    autoRefreshInterval=setInterval(()=>updatePrices(), mins*60000);
    localStorage.setItem('zerodha_refresh',mins);
    updateNext();
  }
}
function stopAuto() {
  clearInterval(autoRefreshInterval);
  refreshIntervalMinutes=0;
  localStorage.removeItem('zerodha_refresh');
  updateNext();
}
function updateNext() {
  const el=document.getElementById('next-refresh');
  if (el) {
    el.textContent = refreshIntervalMinutes>0
      ? `Next refresh: ${new Date(Date.now()+refreshIntervalMinutes*60000).toLocaleTimeString()}`
      : '';
  }
}

// ===== SETTINGS MODAL =====
// Replace your existing showSettingsModal() with this:
function showSettingsModal() {
  // 1) Inject modal if missing
  if (!document.getElementById('zerodha-settings-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="zerodha-settings-modal" class="modal hidden">
        <div class="modal-content" style="padding:20px; max-width:400px;">
          <h2>Zerodha Integration Settings</h2>
          <div id="zerodha-connection-status" style="margin-bottom:16px;"></div>

   //       <label>API Secret:</label><br>
     //     <input type="password" id="zerodha-api-secret-input" placeholder="Enter API Secret" style="width:100%;margin-bottom:16px;"/><br>
       //   <button id="zerodha-save-secret">Save Secret</button>

          <hr/>

          <label>Member:</label><br>
          <select id="member-select" style="width:100%;margin-bottom:16px;"></select>

          <button id="import-holdings" disabled>Import Holdings</button>
          <button id="update-prices" disabled style="margin-left:8px">Update All</button>

          <hr/>

          <label>Auto-refresh:</label><br>
          <select id="refresh-select" style="width:100%;margin-bottom:16px;">
            <option value="0">Off</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>

          <button id="zerodha-close-settings">Close</button>
        </div>
      </div>
    `);

    // Wire up buttons:
    document.getElementById('zerodha-save-secret').addEventListener('click', () => {
      const val = document.getElementById('zerodha-api-secret-input').value.trim();
      if (!val) return showZerodhaMessage('API Secret cannot be empty','error');
      localStorage.setItem('zerodha_api_secret', btoa(val));
      showZerodhaMessage('API Secret saved','success');
    });
    document.getElementById('member-select').addEventListener('change', () => {
      const m = !!document.getElementById('member-select').value;
      document.getElementById('import-holdings').disabled = !zerodhaAccessToken || !m;
    });
    document.getElementById('import-holdings').addEventListener('click', () =>
      importHoldings(document.getElementById('member-select').value)
    );
    document.getElementById('update-prices').addEventListener('click', updatePrices);
    document.getElementById('refresh-select').addEventListener('change', e => {
      const v = +e.target.value;
      if (v>0) startAuto(v); else stopAuto();
    });
    document.getElementById('zerodha-close-settings').addEventListener('click', () => {
      document.getElementById('zerodha-settings-modal').classList.add('hidden');
    });
  }

  // 2) Populate current state
  updateConnectionStatus(!!zerodhaAccessToken,
    JSON.parse(localStorage.getItem('zerodha_user_data')||'{}'));
  document.getElementById('zerodha-api-secret-input').value = ''; // never
  const saved = localStorage.getItem('zerodha_refresh')||0;
  document.getElementById('refresh-select').value = saved;

  // 3) Populate members
  populateMemberSelect();

  // 4) Show modal
  document.getElementById('zerodha-settings-modal').classList.remove('hidden');
}

function closeSettingsModal(){
  const m=document.getElementById('zerodha-settings-modal');
  if(m) m.classList.add('hidden');
}

// ===== PUBLIC API =====
window.connect = async function(){
  if (await initFromStorage()) {
    updateConnectionStatus(true, JSON.parse(localStorage.getItem('zerodha_user_data')));
    return;
  }
  const rt = extractRequestToken();
  if (rt) {
    const u = await generateSession(rt);
    updateConnectionStatus(true, u);
    history.replaceState({},'',location.pathname);
  } else {
    location.href = generateLoginURL();
  }
};
window.disconnect = function(){
  clearStorage();
  updateConnectionStatus(false);
};
window.showZerodhaSettingsModal = showSettingsModal;
window.startAutoRefresh = startAuto;
window.stopAutoRefresh = stopAuto;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async ()=>{
  if (await initFromStorage()) {
    updateConnectionStatus(true, JSON.parse(localStorage.getItem('zerodha_user_data')));
    const iv=+localStorage.getItem('zerodha_refresh')||0;
    if (iv>0) startAuto(iv);
  } else {
    updateConnectionStatus(false);
  }
});
