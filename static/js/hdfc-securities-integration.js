// hdfc-securities-integration.js
// Refactored HDFC integration — full file, auto-import after callback, duplicate checks, mapping

// ----------------- CONFIG -----------------
const HDFC_CONFIG = {
  backend_base: 'https://family-investment-dashboard.onrender.com/api/hdfc',
  render_auth_url: 'https://family-investment-dashboard.onrender.com/',
  // Replace with real member IDs from your Supabase "members" table:
  MEMBERS: {
    equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49',   // Pradeep -> equities
    mf: 'd3a4fc84-a94b-494d-915f-60901f16d973'       // Sanchita -> mutual funds
  }
};

// ----------------- Logging helper -----------------
function logHDFC(msg, level = 'info') {
  const time = new Date().toISOString();
  const prefix = '[HDFC]';
  if (level === 'error') console.error(`${prefix} ${time} ❌ ${msg}`);
  else if (level === 'warn') console.warn(`${prefix} ${time} ⚠️ ${msg}`);
  else console.log(`${prefix} ${time} ℹ️ ${msg}`);
}

// Convenience UI message wrapper (if you have a showMessage function)
function showHDFCMessage(msg, type = 'info') {
  if (typeof showMessage === 'function') showMessage(`HDFC: ${msg}`, type);
  else logHDFC(msg, type === 'error' ? 'error' : (type === 'warning' ? 'warn' : 'info'));
}

// ----------------- Helper: get current Supabase user -----------------
async function getCurrentUser() {
  try {
    if (typeof supabaseClient === 'undefined') {
      logHDFC('supabaseClient not found on window', 'error');
      return null;
    }
    const { data } = await supabaseClient.auth.getUser();
    return data?.user || null;
  } catch (err) {
    logHDFC(`getCurrentUser error: ${err.message}`, 'error');
    return null;
  }
}

// ----------------- UI: Settings Modal -----------------
function showHDFCSettings() {
  const old = document.getElementById('hdfc-settings-modal');
  if (old) old.remove();

  const content = `
    <div id="hdfc-settings-modal" class="modal" style="display:block; position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:10000;">
      <div style="background:#fff; max-width:720px; margin:6% auto; padding:18px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0">HDFC Securities Settings</h3>
          <button onclick="document.getElementById('hdfc-settings-modal').remove()" style="font-size:20px">✕</button>
        </div>
        <div style="margin-top:12px;">
          <div id="hdfc-status" style="padding:12px; border-radius:8px; border:1px solid #eee;">
            <p>Status: <strong id="hdfc-connection-status">Checking...</strong></p>
            <p id="hdfc-last-sync"></p>
            <div style="margin-top:10px;">
              <button id="hdfc-authorize-btn" onclick="authorizeHDFC()" style="margin-right:8px;">Authorize HDFC</button>
              <button onclick="testHDFCConnection()">Test Connection</button>
            </div>
          </div>

          <div style="margin-top:14px; font-size:13px; color:#444;">
            <p><strong>Auto Import:</strong> After OTP validation, holdings will be imported automatically.</p>
            <ul>
              <li>Equity holdings → <strong>Pradeep</strong></li>
              <li>Mutual funds (SIP) → <strong>Sanchita</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', content);
  updateHDFCStatusUI();
}

// ----------------- Test connection -----------------
async function testHDFCConnection() {
  const statusEl = document.getElementById('hdfc-connection-status');
  const lastSyncEl = document.getElementById('hdfc-last-sync');
  if (statusEl) statusEl.textContent = 'Testing...';

  try {
    const user = await getCurrentUser();
    if (!user) {
      if (statusEl) statusEl.textContent = 'Not logged in';
      return;
    }

    const resp = await fetch(`${HDFC_CONFIG.backend_base}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await resp.json();
    logHDFC('Status response: ' + JSON.stringify(data));

    if (resp.ok && data.connected) {
      if (statusEl) {
        statusEl.textContent = 'Connected ✓';
        statusEl.style.color = '#28a745';
      }
      if (lastSyncEl && data.lastSync) {
        lastSyncEl.textContent = `Last sync: ${new Date(data.lastSync).toLocaleString()}`;
      }
      if (data.accessToken) localStorage.setItem('hdfcaccesstoken', data.accessToken);
    } else {
      if (statusEl) {
        statusEl.textContent = 'Not connected';
        statusEl.style.color = '#dc3545';
      }
      if (lastSyncEl) lastSyncEl.textContent = '';
    }
  } catch (err) {
    logHDFC(`testHDFCConnection error: ${err.message}`, 'error');
    if (statusEl) {
      statusEl.textContent = 'Connection failed';
      statusEl.style.color = '#dc3545';
    }
  }
}

function updateHDFCStatusUI() {
  const statusSpan = document.getElementById('hdfc-connection-status');
  const lastSyncEl = document.getElementById('hdfc-last-sync');
  const token = localStorage.getItem('hdfcaccesstoken');

  if (statusSpan) {
    statusSpan.textContent = token ? 'Connected (token present)' : 'Not connected';
    statusSpan.style.color = token ? '#28a745' : '#dc3545';
  }
  if (lastSyncEl) {
    const last = localStorage.getItem('hdfc_last_sync');
    lastSyncEl.textContent = last ? `Last sync: ${new Date(last).toLocaleString()}` : '';
  }
}

// ----------------- Start Authorization (redirect to HDFC) -----------------
async function authorizeHDFC() {
  try {
    showHDFCMessage('Redirecting to HDFC for authorization...');
    const resp = await fetch(`${HDFC_CONFIG.backend_base}/auth-url`, { method: 'GET' });
    if (!resp.ok) throw new Error(`Auth-url returned ${resp.status}`);
    const { url } = await resp.json();
    if (!url) throw new Error('Authorization URL missing in response');
    // Redirect browser
    window.location.href = url;
  } catch (err) {
    logHDFC(`authorizeHDFC failed: ${err.message}`, 'error');
    showHDFCMessage(`Authorization failed: ${err.message}`, 'error');
  }
}

// ----------------- Fetch holdings from backend -----------------
async function fetchHoldingsFromBackend() {
  try {
    const user = await getCurrentUser();
    // call /api/hdfc/holdings; backend will use session/token logic to return holdings
    const resp = await fetch('/api/hdfc/holdings', {
      method: 'GET',
      headers: user ? { Authorization: `Bearer ${user.access_token}` } : {}
    });
    if (!resp.ok) throw new Error(`Holdings fetch failed: ${resp.status}`);
    const payload = await resp.json();
    // backend returns consistent structure: { data: [...] }
    const holdings = Array.isArray(payload.data) ? payload.data : (payload.data ? [payload.data] : []);
    return holdings;
  } catch (err) {
    logHDFC(`fetchHoldingsFromBackend error: ${err.message}`, 'error');
    return [];
  }
}

// ----------------- Supabase duplicate check helper -----------------
async function existsInvestment({ member_id, security_id, isin, folio_number, broker_platform, investment_type }) {
  try {
    if (typeof supabaseClient === 'undefined') {
      logHDFC('supabaseClient not available', 'error');
      return false;
    }

    // Prefer security_id or isin or folio_number for checking
    let query = supabaseClient.from('investments').select('id').limit(1);

    // Build filter
    const filters = { member_id, brokerplatform: broker_platform, investment_type };
    // We will attempt to match by most reliable identifiers in order:
    if (security_id) {
      filters.security_id = security_id;
      query = supabaseClient.from('investments').select('id').match(filters).limit(1);
    } else if (isin) {
      filters.isin = isin;
      query = supabaseClient.from('investments').select('id').match(filters).limit(1);
    } else if (folio_number) {
      filters.folio_number = folio_number;
      query = supabaseClient.from('investments').select('id').match(filters).limit(1);
    } else {
      // Fallback: match by company_name + member_id + broker
      // This is less reliable but better than nothing
      const { data } = await supabaseClient
        .from('investments')
        .select('id')
        .ilike('company_name', `%${security_id || isin || folio_number || ''}%`)
        .limit(1);
      return Array.isArray(data) && data.length > 0;
    }

    const { data, error } = await query;
    if (error) {
      logHDFC(`existsInvestment check error: ${error.message}`, 'warn');
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    logHDFC(`existsInvestment threw: ${err.message}`, 'error');
    return false;
  }
}

// ----------------- Insert single investment to Supabase -----------------
async function insertInvestmentRecord(record) {
  try {
    const { error } = await supabaseClient.from('investments').insert(record);
    if (error) {
      logHDFC(`Supabase insert failed: ${error.message}`, 'error');
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    logHDFC(`insertInvestmentRecord exception: ${err.message}`, 'error');
    return { success: false, error: err };
  }
}

// ----------------- Main: fetchAndImportHoldings (auto-import safe) -----------------
async function fetchAndImportHoldings() {
  try {
    logHDFC('Starting fetchAndImportHoldings...');
    const holdings = await fetchHoldingsFromBackend();
    logHDFC(`Holdings received: ${holdings.length}`);

    // member mapping
    const pradeepId = HDFC_CONFIG.MEMBERS.equity;
    const sanchitaId = HDFC_CONFIG.MEMBERS.mf;
    const brokerPlatform = 'HDFC Securities';

    // Process holdings sequentially
    let insertedCount = 0;
    for (const holding of holdings) {
      // Decide type: SIP indicator "Y" considered mutual fund
      const isMF = (String(holding.sip_indicator || '').toUpperCase() === 'Y') ||
                   (holding.company_name && String(holding.company_name).toLowerCase().includes('fund'));
      const member_id = isMF ? sanchitaId : pradeepId;
      const invType = isMF ? 'mutual_fund' : 'equity';

      // Build identifiers for duplicate check
      const checkArgs = {
        member_id,
        security_id: holding.security_id || null,
        isin: holding.isin || null,
        folio_number: holding.folio || null,
        broker_platform,
        investment_type: invType
      };

      const already = await existsInvestment(checkArgs);
      if (already) {
        logHDFC(`Skipping duplicate for ${holding.company_name || holding.tradingsymbol || 'unknown'}`, 'info');
        continue;
      }

      // Create record
      const record = {
        member_id: member_id,
        investment_type: invType,
        company_name: holding.company_name || holding.schemename || holding.tradingsymbol || null,
        symbol_or_name: holding.tradingsymbol || holding.company_name || holding.schemename || null,
        security_id: holding.security_id || null,
        isin: holding.isin || null,
        folio_number: holding.folio || null,
        authorised_quantity: holding.authorised_quantity || 0,
        quantity: holding.quantity || holding.units || 0,
        used_quantity: holding.used_quantity || 0,
        average_price: holding.average_price || 0,
        investment_value: holding.investment_value || 0,
        close_price: holding.close_price || 0,
        realised: holding.realised || 0,
        sip_indicator: holding.sip_indicator || null,
        sector_name: holding.sector_name || null,
        hdfcdata: JSON.stringify(holding),
        brokerplatform: `${brokerPlatform} (${invType})`,
        createdat: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      // Insert
      const res = await insertInvestmentRecord(record);
      if (res.success) {
        insertedCount++;
        logHDFC(`Inserted: ${record.company_name} for member ${member_id}`);
      } else {
        logHDFC(`Insert failed for ${record.company_name}`, 'error');
      }
    }

    // Save last sync timestamp
    localStorage.setItem('hdfc_last_sync', new Date().toISOString());
    logHDFC(`fetchAndImportHoldings completed. Inserted ${insertedCount} new records.`);
    showHDFCMessage(`Imported ${insertedCount} new holdings`, 'success');

    return { inserted: insertedCount };
  } catch (err) {
    logHDFC(`fetchAndImportHoldings error: ${err.message}`, 'error');
    showHDFCMessage('Import failed. Check logs.', 'error');
    return { inserted: 0, error: err };
  }
}

// ----------------- Auto-import trigger after callback -----------------
// Two ways to trigger auto-import depending on backend behavior:
// 1) Backend redirects to a page with '?hdfc_callback=1' on success -> we auto-call fetchAndImportHoldings
// 2) If your OTP page uses JS to call fetchAndImportHoldings explicitly, it's still available globally.
//
// We'll implement detection for '?hdfc_callback=1' and also a window event listener.

async function tryAutoImportOnLoad() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hdfc_callback') === '1' || params.get('hdfc_import') === '1') {
      logHDFC('Detected callback URL parameter; starting auto-import...');
      // Wait briefly to allow session/cookies to settle
      setTimeout(() => {
        fetchAndImportHoldings().catch(e => logHDFC('Auto-import error: ' + e.message, 'error'));
      }, 800);
    }
  } catch (err) {
    logHDFC(`tryAutoImportOnLoad error: ${err.message}`, 'warn');
  }
}

// Also listen for a custom window message (optional) - backend or OTP page can postMessage to trigger import
window.addEventListener('message', async (ev) => {
  try {
    if (!ev || !ev.data) return;
    if (ev.data === 'hdfc:import_now') {
      logHDFC('Received window message hdfc:import_now - starting import');
      await fetchAndImportHoldings();
    }
  } catch (err) {
    logHDFC(`message handler error: ${err.message}`, 'warn');
  }
});

// ----------------- Init on load -----------------
window.addEventListener('load', async () => {
  try {
    logHDFC('HDFC integration JS initializing...');
    updateHDFCStatusUI();
    await tryAutoImportOnLoad();
  } catch (err) {
    logHDFC(`init error: ${err.message}`, 'error');
  }
});

// ----------------- Export / Global exposure -----------------
window.showHDFCSettings = showHDFCSettings;
window.authorizeHDFC = authorizeHDFC;
window.testHDFCConnection = testHDFCConnection;
window.fetchAndImportHoldings = fetchAndImportHoldings;
window.updateHDFCStatusUI = updateHDFCStatusUI;

logHDFC('HDFC integration loaded');
