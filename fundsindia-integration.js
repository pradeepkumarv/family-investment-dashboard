// fundsindia-integration.js - FundsIndia integration with member mapping

// FundsIndia member mapping from accounts.xlsx
const FUNDSINDIA_MEMBER_MAPPING = {
    // Pradeep Kumar V - has FundsIndia for MF
    'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49': {
        name: 'Pradeep Kumar V',
        demat: [],
        mutualFunds: ['FundsIndia']
    }
};

const FUNDSINDIA_CONFIG = {
    base_url: 'https://api.fundsindia.com', // This will need to be updated with actual FundsIndia API
    // FundsIndia members mapping - only supports MF
    mf_members: ['bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'] // Only Pradeep has FundsIndia MF
};

// State variables
let fundsindiaAccessToken = null;
let fundsindiaAutoRefreshInterval = null;

// Utilities
function logFundsIndia(msg, type='info') {
    const emoji = {info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'}[type];
    console.log(`${emoji} [${new Date().toISOString()}] FUNDSINDIA: ${msg}`);
}

function showFundsIndiaMessage(msg, type='info') {
    if (typeof showMessage === 'function') showMessage(`FundsIndia: ${msg}`, type);
    else console.log(msg);
}

// Authentication functions (placeholder)
async function connectFundsIndia() {
    showFundsIndiaMessage('FundsIndia integration is under development. Connection will be available soon!', 'info');
    
    // Simulate connection for demo
    setTimeout(() => {
        localStorage.setItem('fundsindia_demo_connected', 'true');
        updateFundsIndiaConnectionStatus();
        showFundsIndiaMessage('Demo connection established (Development Mode)', 'success');
    }, 1000);
}

function disconnectFundsIndia() {
    localStorage.removeItem('fundsindia_demo_connected');
    localStorage.removeItem('fundsindia_access_token');
    localStorage.removeItem('fundsindia_user_data');
    clearInterval(fundsindiaAutoRefreshInterval);
    fundsindiaAccessToken = null;
    
    updateFundsIndiaConnectionStatus();
    showFundsIndiaMessage('Disconnected from FundsIndia', 'info');
}

// Import mutual funds function (placeholder implementation)
async function fundsindiaImportMF() {
    try {
        if (!localStorage.getItem('fundsindia_demo_connected')) {
            showFundsIndiaMessage('Please connect to FundsIndia first', 'warning');
            return;
        }

        showFundsIndiaMessage('FundsIndia mutual fund import is under development', 'info');
        
        // Demo data for Pradeep Kumar V
        const demoMFData = [
            {
                fund_name: 'SBI Small Cap Fund - Regular Plan - Growth',
                folio: 'FUNDSINDIA123456',
                fund_house: 'SBI Mutual Fund',
                quantity: 2000.25,
                average_nav: 75.50,
                current_nav: 85.25,
                scheme_code: 'SBI001'
            },
            {
                fund_name: 'Axis Long Term Equity Fund - Regular Plan - Growth',
                folio: 'FUNDSINDIA789012',
                fund_house: 'Axis Mutual Fund',
                quantity: 1500.75,
                average_nav: 45.25,
                current_nav: 52.75,
                scheme_code: 'AXIS002'
            },
            {
                fund_name: 'Kotak Emerging Equity Fund - Regular Plan - Growth',
                folio: 'FUNDSINDIA345678',
                fund_house: 'Kotak Mahindra Mutual Fund',
                quantity: 1750.50,
                average_nav: 65.75,
                current_nav: 72.25,
                scheme_code: 'KOTAK003'
            },
            {
                fund_name: 'Franklin India Smaller Companies Fund - Growth',
                folio: 'FUNDSINDIA901234',
                fund_house: 'Franklin Templeton Mutual Fund',
                quantity: 1200.25,
                average_nav: 95.50,
                current_nav: 108.75,
                scheme_code: 'FRANKLIN004'
            }
        ];

        let count = 0;
        for (const memberId of FUNDSINDIA_CONFIG.mf_members) {
            const memberInfo = FUNDSINDIA_MEMBER_MAPPING[memberId];
            
            for (const mf of demoMFData) {
                // Check if already exists
                if (!investments.some(inv => 
                    inv.member_id === memberId && 
                    inv.folio_number === mf.folio && 
                    inv.broker_platform.includes('FundsIndia') &&
                    inv.investment_type === 'mutualFunds'
                )) {
                    await addInvestmentData({
                        member_id: memberId,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name,
                        invested_amount: mf.quantity * mf.average_nav,
                        current_value: mf.quantity * mf.current_nav,
                        broker_platform: `FundsIndia MF (${memberInfo.name})`,
                        fundsindia_data: mf,
                        fund_name: mf.fund_name,
                        folio_number: mf.folio,
                        scheme_code: mf.scheme_code,
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

        localStorage.setItem('fundsindia_last_sync', new Date().toISOString());
        
        const memberNames = FUNDSINDIA_CONFIG.mf_members.map(id => FUNDSINDIA_MEMBER_MAPPING[id].name).join(', ');
        showFundsIndiaMessage(`Demo: Imported ${count} mutual fund holdings for ${memberNames}`, 'success');
        await loadDashboardData();
        renderInvestmentTabContent('mutualFunds');

    } catch (error) {
        console.error('Error importing FundsIndia MF:', error);
        showFundsIndiaMessage(`Failed to import mutual funds: ${error.message}`, 'error');
    }
}

// Price update function (placeholder)
async function fundsindiaUpdatePrices() {
    try {
        if (!localStorage.getItem('fundsindia_demo_connected')) {
            showFundsIndiaMessage('Please connect to FundsIndia first', 'warning');
            return;
        }

        showFundsIndiaMessage('Price updates will be available when FundsIndia API integration is complete', 'info');
        
        // Simulate price update
        let updatedCount = 0;
        for (const inv of investments.filter(i => i.broker_platform.includes('FundsIndia'))) {
            // Simulate small price changes for MF NAVs
            const priceChange = (Math.random() - 0.5) * 0.06; // ±3% change
            const newValue = inv.current_value * (1 + priceChange);
            
            const invIndex = investments.findIndex(i => i.id === inv.id);
            if (invIndex !== -1) {
                investments[invIndex].current_value = newValue;
                // Update NAV as well
                if (inv.mf_quantity && inv.mf_quantity > 0) {
                    investments[invIndex].mf_nav = newValue / inv.mf_quantity;
                }
                investments[invIndex].last_updated = new Date().toISOString();
            }
            
            if (typeof updateInvestmentData === 'function') {
                await updateInvestmentData(inv.id, {
                    current_value: newValue,
                    mf_nav: inv.mf_quantity > 0 ? newValue / inv.mf_quantity : inv.mf_nav,
                    last_updated: new Date().toISOString()
                });
            }
            updatedCount++;
        }

        localStorage.setItem('fundsindia_last_sync', new Date().toISOString());
        showFundsIndiaMessage(`Demo: Updated ${updatedCount} FundsIndia holdings`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }

    } catch (error) {
        console.error('Error updating FundsIndia prices:', error);
        showFundsIndiaMessage(`Failed to update prices: ${error.message}`, 'error');
    }
}

// Settings modal
function showFundsIndiaSettings() {
    const oldModal = document.getElementById('fundsindia_settings_modal');
    if (oldModal) oldModal.remove();

    const mfMembersList = FUNDSINDIA_CONFIG.mf_members.map(id => FUNDSINDIA_MEMBER_MAPPING[id].name).join(', ');

    const modalContent = `
        <div id="fundsindia_settings_modal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>💰 FundsIndia Settings</h3>
                    <button class="btn-close" onclick="closeFundsIndiaModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🚧 Development Status</h4>
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <p><strong>⚠️ Under Development</strong></p>
                            <p>FundsIndia API integration is currently being developed. Demo functionality is available for testing.</p>
                            <p><strong>Expected Release:</strong> Q4 2025</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>🔗 Connection</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="connectFundsIndia()" class="btn btn-primary">Connect (Demo)</button>
                            <button onclick="disconnectFundsIndia()" class="btn btn-secondary">Disconnect</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo connection for testing purposes</p>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📊 Account Mapping (from accounts.xlsx)</h4>
                        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Mutual Fund Holdings:</strong> ${mfMembersList}</p>
                            <p style="font-size: 12px; color: #718096; margin-top: 10px;">Note: FundsIndia specializes in mutual funds only. No equity trading available.</p>
                        </div>
                    </div>
                    
                    <div class="setting-group" style="margin-bottom: 20px;">
                        <h4>📥 Import Options (Demo)</h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <button onclick="fundsindiaImportMF()" class="btn btn-info">📊 Import MF Holdings (Demo)</button>
                        </div>
                        <p style="font-size: 12px; color: #718096;">Demo data will be used for testing. FundsIndia only supports mutual fund investments.</p>
                    </div>

                    <div class="setting-group">
                        <h4>ℹ️ Status</h4>
                        <div id="fundsindia-modal-status">
                            <p>Status: <span id="fundsindia-modal-connection">Checking...</span></p>
                            <p>Last Sync: <span id="fundsindia-modal-sync">Never</span></p>
                            <p>Mode: <span style="color: #ed8936;">Development/Demo</span></p>
                            <p>Service: <span style="color: #38b2ac;">Mutual Funds Only</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateFundsIndiaModalStatus();
}

function updateFundsIndiaModalStatus() {
    const connectionSpan = document.getElementById('fundsindia-modal-connection');
    const syncSpan = document.getElementById('fundsindia-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('fundsindia_demo_connected');
        connectionSpan.textContent = connected ? '✅ Connected (Demo)' : '❌ Disconnected';
        connectionSpan.style.color = connected ? '#28a745' : '#dc3545';
    }
    
    if (syncSpan) {
        const lastSync = localStorage.getItem('fundsindia_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncSpan.textContent = syncDate.toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

function updateFundsIndiaConnectionStatus() {
    const statusEl = document.getElementById('fundsindia-connection-status');
    if (statusEl) {
        const connected = localStorage.getItem('fundsindia_demo_connected');
        if (connected) {
            statusEl.textContent = '🟡 Demo Connected';
            statusEl.style.color = '#ed8936';
        } else {
            statusEl.textContent = '❌ Not Connected';
            statusEl.style.color = '#dc3545';
        }
    }
}

function closeFundsIndiaModal() {
    const modal = document.getElementById('fundsindia_settings_modal');
    if (modal) modal.remove();
}

// Make functions globally available
window.connectFundsIndia = connectFundsIndia;
window.disconnectFundsIndia = disconnectFundsIndia;
window.fundsindiaImportMF = fundsindiaImportMF;
window.fundsindiaUpdatePrices = fundsindiaUpdatePrices;
window.showFundsIndiaSettings = showFundsIndiaSettings;

// Initialize on load
window.addEventListener('load', () => {
    updateFundsIndiaConnectionStatus();
    logFundsIndia('FundsIndia integration loaded (Development Mode)');
});

console.log('✅ FundsIndia integration with member mapping loaded');
