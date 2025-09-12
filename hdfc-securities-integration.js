const HDFC_CONFIG = {
  api_key: '5f5de761677a4283bd623e6a1013395b',
  // Use your backend proxy URL for HDFC API
  base_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
  members: {
    equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49',  // Pradeep
    mf: 'd3a4fc84-a94b-494d-915f-60901f16d973',      // Sanchita
  },
};

let hdfcAccessToken = null;  // Obtained by your auth flow with HDFC

async function getHdfcHoldings(type) {
  try {
    const response = await fetch(`${HDFC_CONFIG.base_url}/holdings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        access_token: hdfcAccessToken, 
        api_key: HDFC_CONFIG.api_key,
        type: type, // 'equity' or 'mf'
      })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${type} holdings:`, error);
    throw error;
  }
}

async function importHdfcAll() {
  try {
    if (!hdfcAccessToken) {
      alert('Please connect HDFC Securities first');
      return;
    }

    // Import Equity for Pradeep
    const equityData = await getHdfcHoldings('equity');
    if (Array.isArray(equityData.data)) {
      for (const holding of equityData.data) {
        // Map to Pradeep and addInvestmentData call (similar to Zerodha)
        await addInvestmentData({
          member_id: HDFC_CONFIG.members.equity,
          investment_type: 'equity',
          symbol_or_name: holding.symbol,
          invested_amount: holding.quantity * holding.avg_price,
          current_value: holding.quantity * holding.last_price,
          broker_platform: 'HDFC Securities Equity (Pradeep)',
          hdfc_data: holding,
          equity_quantity: holding.quantity,
          equity_avg_price: holding.avg_price,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });
      }
    }

    // Import MF for Sanchita
    const mfData = await getHdfcHoldings('mf');
    if (Array.isArray(mfData.data)) {
      for (const mf of mfData.data) {
        await addInvestmentData({
          member_id: HDFC_CONFIG.members.mf,
          investment_type: 'mutualFunds',
          symbol_or_name: mf.fund_name || mf.scheme_name,
          invested_amount: mf.units * mf.avg_nav,
          current_value: mf.units * mf.current_nav,
          broker_platform: 'HDFC Securities MF (Sanchita)',
          hdfc_data: mf,
          mf_quantity: mf.units,
          mf_nav: mf.current_nav,
          mf_average_price: mf.avg_nav,
          fund_name: mf.fund_name || mf.scheme_name,
          folio_number: mf.folio_number,
          scheme_code: mf.scheme_code,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });
      }
    }

    alert('HDFC Securities holdings imported successfully');
    await loadDashboardData();
  } catch (error) {
    console.error('Error importing HDFC holdings:', error);
    alert(`Import failed: ${error.message}`);
  }
}
