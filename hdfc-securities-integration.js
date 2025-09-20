// --- HDFC-Securities Integration Constants ---
const HDFCCONFIG = {
  apikey: "5f5de761677a4283bd623e6a1013395b",
  apisecret: "8ed88c629bc04639afcdca15381bd965",
  backendbase: "https://family-investment-dashboard-4hli.vercel.app/api/hdfc",
  renderauthurl: "https://family-investment-dashboard.onrender.com",
  members: {
    equity: "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",    // Pradeep Kumar V
    mf:     "d3a4fc84-a94b-494d-915f-60901f16d973"     // Sanchita Pradeep
  }
};

let hdfcAccessToken = null;

// --- Utility for user feedback ---
function showHDFCMessage(msg, type = "info") {
  if (typeof showMessage === "function") {
    showMessage("HDFC Securities", msg, type);
  } else {
    console.log(`HDFC: [${type}] ${msg}`);
  }
}

// --- Fetch holdings from backend ---
async function fetchHDFCHoldings(type) {
  const token = localStorage.getItem("hdfcaccesstoken");
  if (!token) throw new Error("Not authenticated");
  
  const resp = await fetch(`${HDFCCONFIG.backendbase}/holdings`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ accesstoken: token, apikey: HDFCCONFIG.apikey, type })
  });
  
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Failed to fetch holdings");
  return data.data;
}

// --- Import & map holdings into dashboard ---
async function importHDFCHoldings() {
  const token = localStorage.getItem("hdfcaccesstoken");
  if (!token) {
    showHDFCMessage("Please authenticate with HDFC Securities first.", "warning");
    return;
  }
  
  showHDFCMessage("Importing HDFC holdings...", "info");
  let equityCount = 0, mfCount = 0;

  try {
    // 1. Equity → Pradeep
    const equityList = await fetchHDFCHoldings("equity");
    if (Array.isArray(equityList)) {
      for (const h of equityList) {
        await addInvestmentData({
          memberid:        HDFCCONFIG.members.equity,
          investmenttype:  "equity",
          symbolorname:    h.tradingsymbol || h.symbol,
          investedamount:  h.quantity,
          averageprice:    h.averageprice || 0,
          currentvalue:    h.quantity * (h.lastprice || 0),
          lastprice:       h.lastprice || 0,
          brokerplatform:  "HDFC Securities – Equity",
          hdfcdata:        h,
          createdat:       new Date().toISOString()
        });
        equityCount++;
      }
    }

    // 2. Mutual Funds → Sanchita
    const mfList = await fetchHDFCHoldings("mf");
    if (Array.isArray(mfList)) {
      for (const h of mfList) {
        await addInvestmentData({
          memberid:        HDFCCONFIG.members.mf,
          investmenttype:  "mutualFunds",
          symbolorname:    h.schemename || h.fundname,
          investedamount:  h.units,
          averageprice:    h.averagenav || 0,
          currentvalue:    h.units * (h.nav || 0),
          lastprice:       h.nav || 0,
          brokerplatform:  "HDFC Securities – MF",
          hdfcdata:        h,
          createdat:       new Date().toISOString()
        });
        mfCount++;
      }
    }

    // 3. Update last-sync & refresh UI
    localStorage.setItem("hdfclastsync", new Date().toISOString());
    showHDFCMessage(`Imported ${equityCount} equity & ${mfCount} mutual-fund holdings.`, "success");

    if (typeof loadDashboardData === "function") {
      await loadDashboardData();
    }

  } catch (err) {
    console.error("HDFC Import Error:", err);
    showHDFCMessage(`Import failed: ${err.message}`, "error");
  }
}

// --- Expose globally for modal buttons ---
window.importHDFCHoldings = importHDFCHoldings;
