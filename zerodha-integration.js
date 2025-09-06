// zerodha-integration.js - FIXED VERSION with Member Selection & Auto-Refresh
// Author: Family Wealth Dashboard
// Version: 2.1.0

// ===== ZERODHA CONFIGURATION =====
const ZERODHA_CONFIG = {
    api_key: 'ci3r8v1cbqb6e73p',
    redirect_url: 'https://pradeepkumarv.github.io/family-investment-dashboard/',
    base_url: 'https://api.kite.trade',
    login_url: 'https://kite.zerodha.com/connect/login'
};

// Global variables
let zerodhaAccessToken = null;
let autoRefreshInterval = null;
let refreshIntervalMinutes = 0;
let apiCallCount = 0;
let apiCallResetTime = Date.now() + 60000;
const MAX_API_CALLS_PER_MINUTE = 100;

// ===== SECURITY & RATE LIMITING =====
function canMakeAPICall() {
    const now = Date.now();
    if (now > apiCallResetTime) {
        apiCallCount = 0;
        apiCallResetTime = now + 60000;
    }
    if (apiCallCount >= MAX_API_CALLS_PER_MINUTE) {
        log('Rate limit exceeded, please wait', 'warning');
        return false;
    }
    apiCallCount++;
    return true;
}

// ===== UTILITY =====
function log(message, type='info') {
    const emoji = {info:'ℹ️',success:'✅',error:'❌',warning:'⚠️'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] ZERODHA: ${message}`);
}
function showZerodhaMessage(msg,type='info'){
    if(typeof showMessage==='function') showMessage(`Zerodha: ${msg}`,type);
    else console.log(msg);
}
function safeSetInnerHTML(el, html) {
    if (typeof el==='string') el=document.getElementById(el);
    if(!el) return;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    el.innerHTML = '';
    while(temp.firstChild) el.appendChild(temp.firstChild);
}
function sanitizeHTML(str){
    const d=document.createElement('div');
    d.textContent=str;
    return d.innerHTML;
}

// ===== MEMBER SELECT POPULATION =====
function populateZerodhaMemberSelect() {
    const sel=document.getElementById('member-select');
    sel.innerHTML='';
    familyMembers.forEach(m=>{
        const o=document.createElement('option');
        o.value=m.id; o.textContent=m.name;
        sel.append(o);
    });
}

// ===== AUTHENTICATION =====
function generateZerodhaLoginURL(){
    return `${ZERODHA_CONFIG.login_url}?v=3&api_key=${ZERODHA_CONFIG.api_key}`;
}
function extractRequestToken(){
    const p=new URLSearchParams(window.location.search);
    if(p.get('status')==='success' && p.get('action')==='login') return p.get('request_token');
    return null;
}
async function generateZerodhaSession(rt){
    const secret=atob(localStorage.getItem('zerodha_api_secret_encrypted')||'');
    if(!secret) throw new Error('API Secret not configured');
    const chk=await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(ZERODHA_CONFIG.api_key+rt+secret)
    ).then(b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''));
    if(!canMakeAPICall()) throw new Error('Rate limit exceeded');
    const res=await fetch(`${ZERODHA_CONFIG.base_url}/session/token`,{
        method:'POST',
        headers:{'X-Kite-Version':'3','Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({api_key:ZERODHA_CONFIG.api_key,request_token:rt,checksum:chk})
    });
    const jd=await res.json();
    if(jd.status!=='success') throw new Error(jd.message||'Session failed');
    zerodhaAccessToken=jd.data.access_token;
    localStorage.setItem('zerodha_access_token',zerodhaAccessToken);
    localStorage.setItem('zerodha_user_data',JSON.stringify(jd.data));
    return jd.data;
}
async function initializeZerodhaFromStorage(){
    const tok=localStorage.getItem('zerodha_access_token');
    if(!tok) return false;
    zerodhaAccessToken=tok;
    return verifyZerodhaToken();
}
async function verifyZerodhaToken(){
    if(!zerodhaAccessToken||!canMakeAPICall()) return false;
    const r=await fetch(`${ZERODHA_CONFIG.base_url}/user/profile`,{
        headers:{'Authorization':`token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,'X-Kite-Version':'3'}
    });
    const d=await r.json();
    return d.status==='success';
}
function clearZerodhaStorage(){
    localStorage.removeItem('zerodha_access_token');
    localStorage.removeItem('zerodha_user_data');
    clearInterval(autoRefreshInterval);
    zerodhaAccessToken=null;
}

// ===== API REQUEST =====
async function apiRequest(ep,method='GET',params={}){
    if(!zerodhaAccessToken) throw new Error('Not connected');
    if(!canMakeAPICall()) throw new Error('Rate limit exceeded');
    const u=new URL(`${ZERODHA_CONFIG.base_url}${ep}`);
    const o={method,headers:{'Authorization':`token ${ZERODHA_CONFIG.api_key}:${zerodhaAccessToken}`,'X-Kite-Version':'3','Content-Type':'application/json'}};
    if(method==='GET') Object.entries(params).forEach(([k,v])=>u.searchParams.append(k,v));
    else o.body=JSON.stringify(params);
    const r=await fetch(u,o), j=await r.json();
    if(j.status!=='success') throw new Error(j.message||j.error_type);
    return j.data;
}

// ===== DATA FETCH =====
async function getPortfolioHoldings(){return apiRequest('/portfolio/holdings');}

// ===== UI FUNCTIONS =====
function updateZerodhaConnectionStatus(connected,userData){
    const c=document.getElementById('zerodha-connection-status');
    if(!c) return;
    if(connected){
        safeSetInnerHTML(c,`
            <div style="display:flex;gap:8px;padding:8px;background:#e6ffed;border:1px solid #34d058;border-radius:6px">
                <strong style="color:#28a745">✅ Connected</strong>
                <small>${sanitizeHTML(userData.user_name)}</small>
                <button onclick="disconnectZerodha()" class="btn btn-sm btn-secondary" style="margin-left:auto">Disconnect</button>
            </div>
            <div id="zerodha-last-refresh" style="font-size:12px;margin-top:4px"></div>
            <div id="zerodha-auto-refresh-status" style="font-size:12px;margin-top:2px">${getNextRefreshTime()}</div>
        `);
    } else {
        safeSetInnerHTML(c,`
            <div style="display:flex;gap:8px;padding:8px;background:#ffeef0;border:1px solid #cb2431;border-radius:6px">
                <strong style="color:#cb2431">❌ Not Connected</strong>
                <button onclick="connectToZerodha()" class="btn btn-sm btn-primary" style="margin-left:auto">Connect</button>
            </div>
        `);
    }
}

// ===== MEMBER SELECT & IMPORT BUTTON =====
populateZerodhaMemberSelect();  // initial
document.getElementById('member-select').addEventListener('change',()=>{
    const has=!!document.getElementById('member-select').value;
    document.getElementById('import-holdings').disabled=!zerodhaAccessToken||!has;
});
document.getElementById('import-holdings').addEventListener('click',async()=>{
    const memberId=document.getElementById('member-select').value;
    await importZerodhaHoldings(memberId);
});

// ===== IMPORT & UPDATE FUNCTIONS =====
async function importZerodhaHoldings(memberId){
    const holdings=await getPortfolioHoldings();
    const user=JSON.parse(localStorage.getItem('zerodha_user_data'));
    let count=0;
    for(const h of holdings){
        if(!investments.find(inv=>inv.symbol_or_name===h.tradingsymbol&&inv.broker_platform.includes('Zerodha'))){
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
            count++;
        }
    }
    showZerodhaMessage(`Imported ${count} holdings`, 'success');
    loadDashboardData();
}
async function updateEquityInvestments(){
    if(!zerodhaAccessToken) throw new Error('Not connected');
    const holdings=await getPortfolioHoldings();
    let updated=0;
    for(const inv of investments.filter(i=>i.investment_type==='equity'&&i.broker_platform.includes('Zerodha'))){
        const h=holdings.find(x=>x.tradingsymbol===inv.symbol_or_name);
        if(h){
            await updateInvestmentInDashboard(inv.id,{
                current_value:h.quantity*h.last_price,
                last_updated:new Date().toISOString()
            });
            updated++;
        }
    }
    showZerodhaMessage(`Updated ${updated} investments`, 'success');
}

// ===== AUTO-REFRESH =====
function startAutoRefresh(mins){
    stopAutoRefresh();
    if(mins>0){
        refreshIntervalMinutes=mins;
        autoRefreshInterval=setInterval(()=>updateEquityInvestments(),mins*60000);
        localStorage.setItem('zerodha_auto_refresh_interval',mins);
    }
}
function stopAutoRefresh(){
    clearInterval(autoRefreshInterval);
    refreshIntervalMinutes=0;
    localStorage.removeItem('zerodha_auto_refresh_interval');
}
function getNextRefreshTime(){
    if(!refreshIntervalMinutes) return 'Auto-refresh disabled';
    return `Next refresh: ${new Date(Date.now()+refreshIntervalMinutes*60000).toLocaleTimeString()}`;
}

// ===== SETTINGS MODAL =====

// ===== PUBLIC =====
window.connectToZerodha=async()=>{function showZerodhaSettingsModal() {
  // 1) If modal doesn’t exist, create it now
  if (!document.getElementById('zerodha-settings-modal')) {
    const modalHTML = `
      <div id="zerodha-settings-modal" class="modal hidden">
        <div class="modal-content">…</div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // 2) Now it definitely exists, so toggle hidden
  const modal = document.getElementById('zerodha-settings-modal');
  modal.classList.remove('hidden');

  // 3) Populate and update status
  populateZerodhaMemberSelect();
  const user = JSON.parse(localStorage.getItem('zerodha_user_data') || 'null');
  updateZerodhaConnectionStatus(!!zerodhaAccessToken, user);
  updateRateLimitStatus();
}

    if(await initializeZerodhaFromStorage()){
        updateZerodhaConnectionStatus(true,JSON.parse(localStorage.getItem('zerodha_user_data')));
        return;
    }
    const rt=extractRequestToken();
    if(rt){
        await generateZerodhaSession(rt);
        updateZerodhaConnectionStatus(true,JSON.parse(localStorage.getItem('zerodha_user_data')));
        history.replaceState({},'',window.location.pathname);
    } else {
        window.location.href=generateZerodhaLoginURL();
    }
};
window.disconnectZerodha=()=>{
    clearZerodhaStorage();
    updateZerodhaConnectionStatus(false);
};
window.startAutoRefresh=startAutoRefresh;
window.stopAutoRefresh=stopAutoRefresh;

// ===== INIT =====
document.addEventListener('DOMContentLoaded',async()=>{
    if(await initializeZerodhaFromStorage()){
        updateZerodhaConnectionStatus(true,JSON.parse(localStorage.getItem('zerodha_user_data')));
        const iv=+localStorage.getItem('zerodha_auto_refresh_interval');
        if(iv) startAutoRefresh(iv);
    } else {
        updateZerodhaConnectionStatus(false);
    }
});
