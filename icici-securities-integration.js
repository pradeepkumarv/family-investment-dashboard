// icici-securities-integration.js - ICICI Securities integration with member mapping

// ICICI Securities member mapping from accounts.xlsx
const ICICI_MEMBER_MAPPING = {
    // Smruthi Pradeep - has ICICI securities for both Demat and MF
    '0221a8e7-fad8-42cd-bdf6-2f84b85dac31': {
        name: 'Smruthi Pradeep',
        demat: ['ICICI Securities'],
        mutualFunds: ['ICICI Securities']
    }
};

const ICICI_CONFIG = {
    base_url: 'https://api.icicisecurities.com', // This will need to be updated with actual ICICI API
    // ICICI members mapping
    equity_members: ['0221a8e7-fad8-42cd-bdf6-2f84b85dac31'], // Smruthi has ICICI Demat
    mf_members: ['0221a8e7-fad8-42cd-bdf6-2f84b85dac31'] // Smruthi has ICICI MF
};

// State variables
let iciciAccessToken = null;
let iciciAutoRefreshInterval = null;

// Utilities
function logICICI(msg, type='info') {
    const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] ICICI: ${msg}`);
}

function showICICIMessage(msg, type='info') {
    if (typeof showMessage === 'function') showMessage(`ICICI Securities: ${msg}`, type);
    else console.log(msg);
}

// Authentication functions (placeholder)
async function connectICICI() {
    showICICIMessage('ICICI Securities integration is under development. Connection will be available soon!', 'info');
    
    // Simulate connection for demo
    setTimeout(() => {
        localStorage.setItem('icici_demo_connected', 'true');
        updateICICIConnectionStatus();
        showICICIMessage('Demo connection established (Development Mode)', 'success');
    }, 1000);
}

function disconnectICICI() {
    localStorage.removeItem('icici_demo_connected');
    localStorage.removeItem('icici_access_token');
    localStorage.removeItem('icici_user_data');
    clearInterval(iciciAutoRefreshInterval);
    iciciAccessToken = null;
    
    updateICICIConnectionStatus();
    showICICIMessage('Disconnected from ICICI Securities', 'info');
}

// Import functions (placeholder implementations)
async function iciciImportEquity() {
    try {
        if (!localStorage.getItem('icici_demo_connected')) {
            showICICIMessage('Please connect to ICICI Securities first', 'warning');
            return;
        }

        showICICIMessage('ICICI Securities equity import is under development', 'info');
        
        // Demo data for Smruthi Pradeep
        const demoEquityData = [
            {
                symbol: 'INFY',
                quantity: 100,
                average_price: 1450.75,
                last_price: 1520.50,
                company_name: 'Infosys Limited'
            },
            {
                symbol: 'HDFCBANK',
                quantity: 75,
                average_price: 1650.25,
                last_price: 1680.75,
                company_name: 'HDFC Bank Limited'
            },
            {
                symbol: 'ICICIBANK',
                quantity: 60,
                average_price: 950.50,
                last_price: 975.25,
                company_name: 'ICICI Bank Limited'
            }
        ];

        let count = 0;
        for (const memberId of ICICI_CONFIG.equity_members) {
            const memberInfo = ICICI_MEMBER_MAPPING[memberId];
            
            for (const holding of demoEquityData) {
                // Check if already exists
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.symbol_or_name === holding.symbol && 
                    inv.broker_platform.includes('ICICI') &&
                    inv.investment_type === 'equity'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'equity',
                        symbol_or_name: holding.symbol,
                        invested_amount: holding.quantity * holding.average_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: `ICICI Securities Equity (${memberInfo.name})`,
                        icici_data: holding,
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

        localStorage.setItem('icici_last_sync', new Date().toISOString());
        
        showICICIMessage(`Demo: Imported ${count} equity holdings for ${ICICI_MEMBER_MAPPING[ICICI_CONFIG.equity_members[0]].name}`, 'success');
        await loadDashboardData();
        renderInvestmentTabContent('equity');

    } catch (error) {
        console.error('Error importing ICICI equity:', error);
        showICICIMessage(`Failed to import equity: ${error.message}`, 'error');
    }
}

async function iciciImportMF() {
    try {
        if (!localStorage.getItem('icici_demo_connected')) {
            showICICIMessage('Please connect to ICICI Securities first', 'warning');
            return;
        }

        showICICIMessage('ICICI Securities mutual fund import is under development', 'info');
        
        // Demo data for Smruthi Pradeep
        const demoMFData = [
            {
                fund_name: 'ICICI Prudential Bluechip Fund - Growth',
                folio: 'ICICI123456789',
                fund_house: 'ICICI Prudential Mutual Fund',
                quantity: 1500.50,
                average_nav: 65.25,
                current_nav: 72.75
            },
            {
                fund_name: 'ICICI Prudential Technology Fund - Growth',
                folio: 'ICICI987654321',
                fund_house: 'ICICI Prudential Mutual Fund',
                quantity: 950.25,
                average_nav: 95.50,
                current_nav: 108.25
            },
            {
                fund_name: 'ICICI Prudential Balanced Advantage Fund - Growth',
                folio: 'ICICI456789123',
                fund_house: 'ICICI Prudential Mutual Fund',
                quantity: 1200.75,
                average_nav: 45.75,
                current_nav: 48.50
            }
        ];

        let count = 0;
        for (const memberId of ICICI_CONFIG.mf_members) {
            const memberInfo = ICICI_MEMBER_MAPPING[memberId];
            
            for (const mf of demoMFData) {
                // Check if already exists
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.folio_number === mf.folio && 
                    inv.broker_platform.includes('ICICI') &&
                    inv.investment_type === 'mutualFunds'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name,
                        invested_amount: mf.quantity * mf.average_nav,
                        current_value: mf.quantity * mf.current_nav,
                        broker_platform: `ICICI Securities MF (${memberInfo.name})`,
                        icici_data: mf,
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

        localStorage.setItem('icici_last_sync', new Date().toISOString());
        
        const memberNames = ICICI_CONFIG.mf_members.map(id => ICICI_MEMBER_MAPPING[id].name).join(', ');
        showICICIMessage(`Demo: Imported ${count} mutual fund holdings for ${memberNames}`, 'success');
        await loadDashboardData();
        renderInvestmentTabContent('mutualFunds');

    } catch (error) {
        console.error('Error importing ICICI MF:', error);
        showICICIMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

// Import all ICICI holdings
async function iciciImportAll() {
    try {
        if (!localStorage.getItem('icici_demo_connected')) {
            showICICIMessage('Please connect to ICICI Securities first', 'warning');
            return;
        }

        showICICIMessage('Importing all holdings from ICICI Securities...', 'info');
        
        // Import equity first
        await iciciImportEquity();
        
        // Then import mutual funds
        await iciciImportMF();
        
        showICICIMessage('Demo: Successfully imported all ICICI Securities holdings', 'success');

    } catch (error) {
        console.error('Error importing all ICICI holdings:', error);
        showICICIMessage(`Failed to import all holdings: ${error.message}`, 'error');
    }
}

// Price update function (placeholder)
async function iciciUpdatePrices() {
    try {
        if (!localStorage.getItem('icici_demo_connected')) {
            showICICIMessage('Please connect to ICICI Securities first', 'warning');
            return;
        }

        showICICIMessage('Price updates will be available when ICICI API integration is complete', 'info');
        
        // Simulate price update
        let updatedCount = 0;
        for (const inv of investments.filter(i => i.broker_platform.includes('ICICI'))) {
            // Simulate small price changes
            const priceChange = (Math.random() - 0.5) * 0.08; // ±4% change
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

        localStorage.setItem('icici_last_sync', new Date().toISOString());
        showICICIMessage(`Demo: Updated ${updatedCount} ICICI holdings`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error updating ICICI prices:', error);
        showICICIMessage(`Failed to update prices: ${error.message}`, 'error');
    }
}

// Settings modal
function showICICISettings() {
    const oldModal = document.getElementById('icici_settings_modal');
    if (oldModal) oldModal.remove();

    const equityMembersList = ICICI_CONFIG.equity_members.map(id => ICICI_MEMBER_MAPPING[id].name).join(', ');
    const mfMembersList = ICICI_CONFIG.mf_members.map(id => ICICI_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="icici_settings_modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>💼 ICICI Securities Settings</h3>
                    <button class="btn-close" onclick="closeICICIModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🚧 Development Status</h4>
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <p><strong>⚠️ Under Development</strong></p>
                            <p>ICICI Securities API integration is currently being developed. Demo functionality is available for testing.</p>
                            <p><strong>Expected Release:</strong> Q4 2025</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🔗 Connection</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="connectICICI()" class="btn btn-primary">Connect (Demo)</button>
                            <button onclick="disconnectICICI()" class="btn btn-secondary">Disconnect</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo connection for testing purposes</p>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📊 Account Mapping (from accounts.xlsx)</h4>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Equity Holdings:</strong> ${equityMembersList}</p>
                            <p><strong>Mutual Fund Holdings:</strong> ${mfMembersList}</p>
                            <p style="font-size: 12px; color: #718096; margin-top: 10px;">Note: Smruthi Pradeep uses ICICI Securities for both equity and mutual funds</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📥 Import Options (Demo)</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="iciciImportAll()" class="btn btn-success" style="background: #805ad5;">📥 Import All (Demo)</button>
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="iciciImportEquity()" class="btn btn-success">📈 Import Equity (Demo)</button>
                            <button onclick="iciciImportMF()" class="btn btn-info">📊 Import MF (Demo)</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo data will be used for testing</p>
                    </div>

                    <div class="setting-group">
                        <h4>ℹ️ Status</h4>
                        <div id="icici-modal-status">
                            <p>Status: <span id="icici-modal-connection">Checking...</span></p>
                            <p>Last Sync: <span id="icici-modal-sync">Never</span></p>
                            <p>Mode: <span style="color: #ed8936;">Development/Demo</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateICICIModalStatus();
}

function updateICICIModalStatus() {
    const connectionSpan = document.getElementById('icici-modal-connection');
    const syncSpan = document.getElementById('icici-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('icici_demo_connected');
        connectionSpan.textContent = connected ? '✅ Connected (Demo)' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('icici_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = syncDate.toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

function updateICICIConnectionStatus() {
    const statusEl = document.getElementById('icici-connection-status');
    if (statusEl) {
        const connected = localStorage.getItem('icici_demo_connected');
        if (connected) {
            statusEl.textContent = '🟡 Demo Connected';
            statusEl.style.color = '#ed8936';
        } else {
            statusEl.textContent = '❌ Not Connected';
            statusEl.style.color = '#dc3545';
        }
    }
}

function closeICICIModal() {
    const modal = document.getElementById('icici_settings_modal');
    if (modal) modal.remove();
}

// Make functions globally available
window.connectICICI = connectICICI;
window.disconnectICICI = disconnectICICI;
window.iciciImportAll = iciciImportAll;
window.iciciImportEquity = iciciImportEquity;
window.iciciImportMF = iciciImportMF;
window.iciciUpdatePrices = iciciUpdatePrices;
window.showICICISettings = showICICISettings;

// Initialize on load
window.addEventListener('load', () => {
    updateICICIConnectionStatus();
    logICICI('ICICI Securities integration loaded (Development Mode)');
});

console.log('✅ ICICI Securities integration with member mapping loaded');
