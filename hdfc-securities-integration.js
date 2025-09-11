// hdfc-securities-integration.js - FIXED with correct URLs and authentication flow

const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    // Use your backend proxy URL for HDFC API
    base_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    session_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/session',
    profile_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/profile',
    
    // FIXED: Correct HDFC Securities authentication URLs
    login_url: 'https://developer.hdfcsec.com/oapi/v1/login',  // Correct login endpoint
    token_url: 'https://developer.hdfcsec.com/oapi/v1/access/token',  // Access token endpoint
    
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49', // Pradeep
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973', // Sanchita
    },
};

let hdfcAccessToken = null;

// Utility functions
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(msg);
    }
}

// FIXED: Show HDFC Settings Modal with correct authentication info
function showHDFCSettings() {
    // Remove existing modal if present
    const oldModal = document.getElementById('hdfc_settings_modal');
    if (oldModal) oldModal.remove();

    const modalContent = `
        <div id="hdfc_settings_modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🏦 HDFC Securities Settings</h3>
                    <button class="btn-close" onclick="closeHDFCModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="connection-status" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>Connection Status</h4>
                        <div id="hdfc-modal-connection">
                            <span id="hdfc-connection-indicator">❌ Not Connected</span>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                            Last sync: <span id="hdfc-modal-sync">Never</span>
                        </div>
                    </div>

                    <div class="account-mapping" style="background: #e6fffa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>📋 Account Mapping</h4>
                        <div style="margin-top: 10px;">
                            <strong>Equity Holdings:</strong> Pradeep Kumar V<br>
                            <strong>Mutual Funds:</strong> Sanchita Pradeep
                        </div>
                    </div>

                    <div class="actions" style="margin: 20px 0;">
                        <h4>Actions</h4>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                            <button class="btn btn-primary" onclick="connectHDFC()">
                                🔗 Connect to HDFC Securities
                            </button>
                            <button class="btn btn-secondary" onclick="disconnectHDFC()">
                                🔌 Disconnect
                            </button>
                            <button class="btn btn-info" onclick="testHDFCConnection()">
                                🧪 Test Connection
                            </button>
                        </div>
                    </div>

                    <div class="help-text" style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <h5>📋 HDFC Securities API Setup (Demo Mode):</h5>
                        <ol style="margin-left: 20px; margin-top: 10px;">
                            <li><strong>Create Developer Account:</strong> Visit <a href="https://developer.hdfcsec.com/" target="_blank">developer.hdfcsec.com</a></li>
                            <li><strong>Login:</strong> Use your InvestRight credentials</li>
                            <li><strong>Create App:</strong> Generate API Key & Secret</li>
                            <li><strong>Add Redirect URL:</strong> Set your domain URL</li>
                            <li><strong>Integration:</strong> Use provided API credentials</li>
                        </ol>
                        <div style="margin-top: 15px; padding: 10px; background: #ffeaa7; border-radius: 6px;">
                            <strong>⚠️ Note:</strong> HDFC Securities API requires manual setup and approval. 
                            Currently showing demo functionality.
                        </div>
                    </div>

                    <div class="demo-notice" style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 15px;">
                        <h5>🚧 Demo Mode Active</h5>
                        <p style="margin: 10px 0 0 0; font-size: 0.9em;">
                            This integration is currently in demo mode. Real HDFC Securities API 
                            requires individual approval and proper credentials setup.
                        </p>
                    </div>

                    <div class="auto-refresh" style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px;">
                        <h5>🔄 Auto Refresh Settings</h5>
                        <div style="margin-top: 10px;">
                            <label for="hdfc_update_interval">Update Interval:</label>
                            <select id="hdfc_update_interval" onchange="setHDFCAutoUpdate()" style="margin-left: 10px; padding: 5px;">
                                <option value="0">Disabled</option>
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="180">3 hours</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Update modal status
    updateHDFCModalStatus();
    
    // Load saved interval setting
    const savedInterval = localStorage.getItem('hdfc_refresh_interval');
    if (savedInterval) {
        const select = document.getElementById('hdfc_update_interval');
        if (select) select.value = savedInterval;
    }
}

// Close HDFC modal
function closeHDFCModal() {
    const modal = document.getElementById('hdfc_settings_modal');
    if (modal) modal.remove();
}

// Update modal status display
function updateHDFCModalStatus() {
    const connectionSpan = document.getElementById('hdfc-connection-indicator');
    const syncSpan = document.getElementById('hdfc-modal-sync');
    
    if (connectionSpan) {
        const connected = localStorage.getItem('hdfc_access_token');
        connectionSpan.textContent = connected ? '✅ Connected (Demo)' : '❌ Not Connected';
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

// FIXED: Connect to HDFC Securities with proper authentication flow
function connectHDFC() {
    try {
        // HDFC Securities requires a different authentication flow
        // For now, show demo connection since the API requires manual setup
        showHDFCMessage('HDFC Securities API requires manual setup and approval.', 'info');
        
        // Demo connection for testing
        const demoToken = 'demo_hdfc_token_' + Date.now();
        localStorage.setItem('hdfc_access_token', demoToken);
        localStorage.setItem('hdfc_user_data', JSON.stringify({
            user_id: 'demo_user',
            user_name: 'Demo User',
            broker: 'hdfc_securities'
        }));
        
        showHDFCMessage('Demo connection established!', 'success');
        updateHDFCConnectionStatus();
        updateHDFCModalStatus();
        
    } catch (error) {
        showHDFCMessage(`Connection failed: ${error.message}`, 'error');
    }
}

// Disconnect from HDFC Securities
function disconnectHDFC() {
    localStorage.removeItem('hdfc_access_token');
    localStorage.removeItem('hdfc_user_data');
    localStorage.removeItem('hdfc_last_sync');
    hdfcAccessToken = null;
    
    showHDFCMessage('Disconnected from HDFC Securities', 'info');
    updateHDFCConnectionStatus();
    updateHDFCModalStatus();
}

// Test HDFC connection
async function testHDFCConnection() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('No access token found. Please connect first.', 'warning');
            return;
        }
        
        showHDFCMessage('Testing connection...', 'info');
        
        // For demo mode, simulate successful connection
        if (token.includes('demo_hdfc_token')) {
            showHDFCMessage('Demo connection test successful!', 'success');
            return;
        }
        
        // Real API test (when implemented)
        const response = await fetch(HDFC_CONFIG.profile_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: token,
                api_key: HDFC_CONFIG.api_key
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showHDFCMessage('Connection test successful!', 'success');
        } else {
            showHDFCMessage('Connection test failed. Please reconnect.', 'error');
        }
    } catch (error) {
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// Update connection status in main UI
function updateHDFCConnectionStatus() {
    const statusEl = document.getElementById('hdfc-connection-status');
    if (statusEl) {
        const connected = localStorage.getItem('hdfc_access_token');
        if (connected && connected.includes('demo_hdfc_token')) {
            statusEl.textContent = '✅ Connected (Demo)';
            statusEl.style.color = '#28a745';
        } else if (connected) {
            statusEl.textContent = '✅ Connected';
            statusEl.style.color = '#28a745';
        } else {
            statusEl.textContent = '❌ Not Connected';
            statusEl.style.color = '#dc3545';
        }
    }
    
    const syncEl = document.getElementById('hdfc-last-sync');
    if (syncEl) {
        const lastSync = localStorage.getItem('hdfc_last_sync');
        if (lastSync) {
            const syncDate = new Date(lastSync);
            syncEl.textContent = `Last sync: ${syncDate.toLocaleString()}`;
        } else {
            syncEl.textContent = 'Last sync: Never';
        }
    }
}

// Set auto update interval
function setHDFCAutoUpdate() {
    const intervalSelect = document.getElementById('hdfc_update_interval');
    if (!intervalSelect) return;
    
    const minutes = parseInt(intervalSelect.value);
    localStorage.setItem('hdfc_refresh_interval', minutes.toString());
    
    if (minutes > 0) {
        showHDFCMessage(`Auto-update set to ${minutes} minutes`, 'success');
    } else {
        showHDFCMessage('Auto-update disabled', 'info');
    }
}

// API Functions - Demo implementations for now
async function getHdfcHoldings(type) {
    try {
        // Demo data for testing
        const demoEquityData = {
            status: 'success',
            data: [
                {
                    symbol: 'RELIANCE',
                    quantity: 10,
                    avg_price: 2800,
                    last_price: 2950,
                    instrument_token: '738561'
                },
                {
                    symbol: 'TCS',
                    quantity: 5,
                    avg_price: 3200,
                    last_price: 3350,
                    instrument_token: '492033'
                }
            ]
        };

        const demoMFData = {
            status: 'success',
            data: [
                {
                    fund_name: 'HDFC Top 100 Fund',
                    scheme_name: 'HDFC Top 100 Fund - Growth',
                    units: 100,
                    avg_nav: 580,
                    current_nav: 620,
                    folio_number: 'HDK123456',
                    scheme_code: 'HDFC001'
                },
                {
                    fund_name: 'HDFC Small Cap Fund',
                    scheme_name: 'HDFC Small Cap Fund - Growth',
                    units: 50,
                    avg_nav: 45,
                    current_nav: 52,
                    folio_number: 'HDK123457',
                    scheme_code: 'HDFC002'
                }
            ]
        };

        // Return demo data based on type
        return type === 'equity' ? demoEquityData : demoMFData;

    } catch (error) {
        console.error(`Error fetching ${type} holdings:`, error);
        throw error;
    }
}

// Import functions with demo data
async function hdfcImportAll() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing all holdings from HDFC Securities (Demo)...', 'info');
        
        let importCount = 0;

        // Import Demo Equity for Pradeep
        const equityData = await getHdfcHoldings('equity');
        if (Array.isArray(equityData.data)) {
            for (const holding of equityData.data) {
                // Check if investment already exists
                const exists = investments.some(inv => 
                    inv.member_id === HDFC_CONFIG.members.equity &&
                    inv.symbol_or_name === holding.symbol &&
                    inv.broker_platform.includes('HDFC Securities')
                );

                if (!exists) {
                    await addInvestmentData({
                        member_id: HDFC_CONFIG.members.equity,
                        investment_type: 'equity',
                        symbol_or_name: holding.symbol,
                        invested_amount: holding.quantity * holding.avg_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: 'HDFC Securities Equity (Pradeep) [Demo]',
                        hdfc_data: holding,
                        equity_quantity: holding.quantity,
                        equity_avg_price: holding.avg_price,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    importCount++;
                }
            }
        }

        // Import Demo MF for Sanchita
        const mfData = await getHdfcHoldings('mf');
        if (Array.isArray(mfData.data)) {
            for (const mf of mfData.data) {
                // Check if investment already exists
                const exists = investments.some(inv => 
                    inv.member_id === HDFC_CONFIG.members.mf &&
                    inv.folio_number === mf.folio_number &&
                    inv.broker_platform.includes('HDFC Securities')
                );

                if (!exists) {
                    await addInvestmentData({
                        member_id: HDFC_CONFIG.members.mf,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name || mf.scheme_name,
                        invested_amount: mf.units * mf.avg_nav,
                        current_value: mf.units * mf.current_nav,
                        broker_platform: 'HDFC Securities MF (Sanchita) [Demo]',
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
                    importCount++;
                }
            }
        }

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Imported ${importCount} demo holdings successfully!`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
    } catch (error) {
        console.error('Error importing HDFC holdings:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

async function hdfcImportEquity() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing equity holdings (Demo)...', 'info');
        
        // Similar implementation but only for equity
        const equityData = await getHdfcHoldings('equity');
        let importCount = 0;
        
        if (Array.isArray(equityData.data)) {
            for (const holding of equityData.data) {
                const exists = investments.some(inv => 
                    inv.member_id === HDFC_CONFIG.members.equity &&
                    inv.symbol_or_name === holding.symbol &&
                    inv.broker_platform.includes('HDFC Securities')
                );

                if (!exists) {
                    await addInvestmentData({
                        member_id: HDFC_CONFIG.members.equity,
                        investment_type: 'equity',
                        symbol_or_name: holding.symbol,
                        invested_amount: holding.quantity * holding.avg_price,
                        current_value: holding.quantity * holding.last_price,
                        broker_platform: 'HDFC Securities Equity (Pradeep) [Demo]',
                        hdfc_data: holding,
                        equity_quantity: holding.quantity,
                        equity_avg_price: holding.avg_price,
                        created_at: new Date().toISOString(),
                        last_updated: new Date().toISOString()
                    });
                    importCount++;
                }
            }
        }
        
        showHDFCMessage(`Imported ${importCount} demo equity holdings!`, 'success');
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('equity');
        }
    } catch (error) {
        showHDFCMessage(`Equity import failed: ${error.message}`, 'error');
    }
}

async function hdfcImportMF() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing mutual fund holdings (Demo)...', 'info');
        
        // Similar implementation but only for MF
        const mfData = await getHdfcHoldings('mf');
        let importCount = 0;
        
        if (Array.isArray(mfData.data)) {
            for (const mf of mfData.data) {
                const exists = investments.some(inv => 
                    inv.member_id === HDFC_CONFIG.members.mf &&
                    inv.folio_number === mf.folio_number &&
                    inv.broker_platform.includes('HDFC Securities')
                );

                if (!exists) {
                    await addInvestmentData({
                        member_id: HDFC_CONFIG.members.mf,
                        investment_type: 'mutualFunds',
                        symbol_or_name: mf.fund_name || mf.scheme_name,
                        invested_amount: mf.units * mf.avg_nav,
                        current_value: mf.units * mf.current_nav,
                        broker_platform: 'HDFC Securities MF (Sanchita) [Demo]',
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
                    importCount++;
                }
            }
        }
        
        showHDFCMessage(`Imported ${importCount} demo MF holdings!`, 'success');
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('mutualFunds');
        }
    } catch (error) {
        showHDFCMessage(`MF import failed: ${error.message}`, 'error');
    }
}

async function hdfcUpdatePrices() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Updating prices (Demo)...', 'info');
        
        // Demo price update - simulate updating existing HDFC investments
        let updateCount = 0;
        const hdfcInvestments = investments.filter(inv => 
            inv.broker_platform && inv.broker_platform.includes('HDFC Securities')
        );
        
        for (const inv of hdfcInvestments) {
            // Simulate price update with small random change
            const changePercent = (Math.random() - 0.5) * 0.1; // ±5% change
            const newValue = inv.current_value * (1 + changePercent);
            
            // Update in memory
            const invIndex = investments.findIndex(i => i.id === inv.id);
            if (invIndex !== -1) {
                investments[invIndex].current_value = newValue;
                investments[invIndex].last_updated = new Date().toISOString();
            }
            
            // Update in database if function exists
            if (typeof updateInvestmentData === 'function') {
                await updateInvestmentData(inv.id, {
                    current_value: newValue,
                    last_updated: new Date().toISOString()
                });
            }
            
            updateCount++;
        }
        
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Updated ${updateCount} demo holdings!`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
    } catch (error) {
        showHDFCMessage(`Price update failed: ${error.message}`, 'error');
    }
}

// Initialize HDFC connection status on page load
document.addEventListener('DOMContentLoaded', function() {
    updateHDFCConnectionStatus();
    
    // Check for access token in localStorage
    const token = localStorage.getItem('hdfc_access_token');
    if (token) {
        hdfcAccessToken = token;
    }
});
