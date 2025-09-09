// hdfc-securities-integration.js - HDFC Securities integration with member mapping

// HDFC Securities member mapping from accounts.xlsx
const HDFC_MEMBER_MAPPING = {
    // Pradeep Kumar V - has HDFC Securities for Demat
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: ['HDFC Securities'],
        mutualFunds: []
    },
    // Sanchita Pradeep - has HDFC Securities for MF
    'd3a4fc84-a94b-494d-915f-60901f16d973': {
        name: 'Sanchita Pradeep',
        demat: [],
        mutualFunds: ['HDFC Securities']
    }
};

const HDFC_CONFIG = {
    base_url: 'https://api.hdfcsec.com', // This will need to be updated with actual HDFC API
    // HDFC members mapping
    equity_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'], // Only Pradeep has HDFC Demat
    mf_members: ['d3a4fc84-a94b-494d-915f-60901f16d973'] // Only Sanchita has HDFC MF
};

// State variables
let hdfcAccessToken = null;
let hdfcAutoRefreshInterval = null;

// Utilities
function logHDFC(msg, type='info') {
    const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] HDFC: ${msg}`);
}

function showHDFCMessage(msg, type='info') {
    if (typeof showMessage === 'function') showMessage(`HDFC Securities: ${msg}`, type);
    else console.log(msg);
}

// Authentication functions (placeholder - will be implemented when HDFC API is available)
async function connectHDFC() {
    showHDFCMessage('HDFC Securities integration is under development. Connection will be available soon!', 'info');
    
    // Simulate connection for demo
    setTimeout(() => {
        localStorage.setItem('hdfc_demo_connected', 'true');
        updateHDFCConnectionStatus();
        showHDFCMessage('Demo connection established (Development Mode)', 'success');
    }, 1000);
}

function disconnectHDFC() {
    localStorage.removeItem('hdfc_demo_connected');
    localStorage.removeItem('hdfc_access_token');
    localStorage.removeItem('hdfc_user_data');
    clearInterval(hdfcAutoRefreshInterval);
    hdfcAccessToken = null;
    
    updateHDFCConnectionStatus();
    showHDFCMessage('Disconnected from HDFC Securities', 'info');
}

// Import functions (placeholder implementations)
async function hdfcImportEquity() {
    try {
        if (!localStorage.getItem('hdfc_demo_connected')) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('HDFC Securities equity import is under development', 'info');
        
        // Demo data for Pradeep Kumar V
        const demoEquityData = [
            {
                symbol: 'RELIANCE',
                quantity: 50,
                average_price: 2450.50,
                last_price: 2500.75,
                company_name: 'Reliance Industries Ltd'
            },
            {
                symbol: 'TCS',
                quantity: 25,
                average_price: 3200.00,
                last_price: 3350.25,
                company_name: 'Tata Consultancy Services Ltd'
            }
        ];

        let count = 0;
        for (const memberId of HDFC_CONFIG.equity_members) {
            const memberInfo = HDFC_MEMBER_MAPPING[memberId];
            
            for (const holding of demoEquityData) {
                // Check if already exists
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.symbol_or_name === holding.symbol && 
                    inv.broker_platform.includes('HDFC') &&
                    inv.investment_type === 'equity'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'equity',
                        symbol_or_name: holding.symbol,
                        invested_amount: holding.quantity * holding.average_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: `HDFC Securities Equity (${memberInfo.name})`,
                        hdfc_data: holding,
                        equity_quantity: holding.quantity,
                        equity_avg_price: holding.average_price,
                        equity_symbol: holding.symbol,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        showHDFCMessage(`Demo: Imported ${count} equity holdings for ${HDFC_MEMBER_MAPPING[HDFC_CONFIG.equity_members[0]].name}`, 'success');
        await loadDashboardData();
        renderInvestmentTabContent('equity');

    } catch (error) {
        console.error('Error importing HDFC equity:', error);
        showHDFCMessage(`Failed to import equity: ${error.message}`, 'error');
    }
}

async function hdfcImportMF() {
    try {
        if (!localStorage.getItem('hdfc_demo_connected')) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('HDFC Securities mutual fund import is under development', 'info');
        
        // Demo data for Sanchita Pradeep
        const demoMFData = [
            {
                fund_name: 'HDFC Large Cap Fund - Growth',
                folio: 'HDFC123456789',
                fund_house: 'HDFC Mutual Fund',
                quantity: 1250.75,
                average_nav: 85.50,
                current_nav: 92.25
            },
            {
                fund_name: 'HDFC Mid Cap Opportunities Fund - Growth',
                folio: 'HDFC987654321',
                fund_house: 'HDFC Mutual Fund',
                quantity: 850.25,
                average_nav: 125.75,
                current_nav: 135.50
            }
        ];

        let count = 0;
        for (const memberId of HDFC_CONFIG.mf_members) {
            const memberInfo = HDFC_MEMBER_MAPPING[memberId];
            
            for (const mf of demoMFData) {
                // Check if already exists
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.folio_number === mf.folio && 
                    inv.broker_platform.includes('HDFC') &&
                    inv.investment_type === 'mutualFunds'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name,
                        invested_amount: mf.quantity * mf.average_nav,
                        current_value: mf.quantity * mf.current_nav,
                        broker_platform: `HDFC Securities MF (${memberInfo.name})`,
                        hdfc_data: mf,
                        fund_name: mf.fund_name,
                        folio_number: mf.folio,
                        fund_house: mf.fund_house,
                        mf_quantity: mf.quantity,
                        mf_nav: mf.current_nav,
                        mf_average_price: mf.average_nav,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    count++;
                }
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        
        const memberNames = HDFC_CONFIG.mf_members.map(id => HDFC_MEMBER_MAPPING[id].name).join(', ');
        showHDFCMessage(`Demo: Imported ${count} mutual fund holdings for ${memberNames}`, 'success');
        await loadDashboardData();
        renderInvestmentTabContent('mutualFunds');

    } catch (error) {
        console.error('Error importing HDFC MF:', error);
        showHDFCMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

// Import all HDFC holdings
async function hdfcImportAll() {
    try {
        if (!localStorage.getItem('hdfc_demo_connected')) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing all holdings from HDFC Securities...', 'info');
        
        // Import equity first
        await hdfcImportEquity();
        
        // Then import mutual funds
        await hdfcImportMF();
        
        showHDFCMessage('Demo: Successfully imported all HDFC Securities holdings', 'success');

    } catch (error) {
        console.error('Error importing all HDFC holdings:', error);
        showHDFCMessage(`Failed to import all holdings: ${error.message}`, 'error');
    }
}

// Price update function (placeholder)
async function hdfcUpdatePrices() {
    try {
        if (!localStorage.getItem('hdfc_demo_connected')) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Price updates will be available when HDFC API integration is complete', 'info');
        
        // Simulate price update
        let updatedCount = 0;
        for (const inv of investments.filter(i => i.broker_platform.includes('HDFC'))) {
            // Simulate small price changes
            const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
            const newValue = inv.current_value * (1 + priceChange);
            
            const invIndex = investments.findIndex(i => i.id === inv.id);
            if (invIndex !== -1) {
                investments[invIndex].current_value = newValue;
                investments[invIndex].last_updated = new Date().toISOString();
            }
            
            if (typeof updateInvestmentData === 'function') {
                await updateInvestmentData(inv.id, {
                    current_value: newValue,
                    last_updated: new Date().toISOString()
                });
            }
            updatedCount++;
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Demo: Updated ${updatedCount} HDFC holdings`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error updating HDFC prices:', error);
        showHDFCMessage(`Failed to update prices: ${error.message}`, 'error');
    }
}

// Settings modal
function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc_settings_modal');
    if (oldModal) oldModal.remove();

    const equityMembersList = HDFC_CONFIG.equity_members.map(id => HDFC_MEMBER_MAPPING[id].name).join(', ');
    const mfMembersList = HDFC_CONFIG.mf_members.map(id => HDFC_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="hdfc_settings_modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>🏦 HDFC Securities Settings</h3>
                    <button class="btn-close" onclick="closeHDFCModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🚧 Development Status</h4>
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <p><strong>⚠️ Under Development</strong></p>
                            <p>HDFC Securities API integration is currently being developed. Demo functionality is available for testing.</p>
                            <p><strong>Expected Release:</strong> Q4 2025</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🔗 Connection</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="connectHDFC()" class="btn btn-primary">Connect (Demo)</button>
                            <button onclick="disconnectHDFC()" class="btn btn-secondary">Disconnect</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo connection for testing purposes</p>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📊 Account Mapping (from accounts.xlsx)</h4>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Equity Holdings:</strong> ${equityMembersList}</p>
                            <p><strong>Mutual Fund Holdings:</strong> ${mfMembersList}</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📥 Import Options (Demo)</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="hdfcImportAll()" class="btn btn-success" style="background: #805ad5;">📥 Import All (Demo)</button>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="hdfcImportEquity()" class="btn btn-success">📈 Import Equity (Demo)</button>
                            <button onclick="hdfcImportMF()" class="btn btn-info">📊 Import MF (Demo)</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo data will be used for testing</p>
                    </div>

                    <div class="setting-group">
                        <h4>ℹ️ Status</h4>
                        <div id="hdfc-modal-status">
                            <p>Status: <span id="hdfc-modal-connection">Checking...</span></p>
                            <p>Last Sync: <span id="hdfc-modal-sync">Never</span></p>
                            <p>Mode: <span style="color: #ed8936;">Development/Demo</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateHDFCModalStatus();
}

function updateHDFCModalStatus() {
    const connectionSpan = document.getElementById('hdfc-modal-connection');
    const syncSpan = document.getElementById('hdfc-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('hdfc_demo_connected');
        connectionSpan.textContent = connected ? '✅ Connected (Demo)' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('hdfc_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = syncDate.toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

function updateHDFCConnectionStatus() {
    const statusEl = document.getElementById('hdfc-connection-status');
    if (statusEl) {
        const connected = localStorage.getItem('hdfc_demo_connected');
        if (connected) {
            statusEl.textContent = '🟡 Demo Connected';
            statusEl.style.color = '#ed8936';
        } else {
            statusEl.textContent = '❌ Not Connected';
            statusEl.style.color = '#dc3545';
        }
    }
}

function closeHDFCModal() {
    const modal = document.getElementById('hdfc_settings_modal');
    if (modal) modal.remove();
}

// Make functions globally available
window.connectHDFC = connectHDFC;
window.disconnectHDFC = disconnectHDFC;
window.hdfcImportAll = hdfcImportAll;
window.hdfcImportEquity = hdfcImportEquity;
window.hdfcImportMF = hdfcImportMF;
window.hdfcUpdatePrices = hdfcUpdatePrices;
window.showHDFCSettings = showHDFCSettings;

// Initialize on load
window.addEventListener('load', () => {
    updateHDFCConnectionStatus();
    logHDFC('HDFC Securities integration loaded (Development Mode)');
});

console.log('✅ HDFC Securities integration with member mapping loaded');
