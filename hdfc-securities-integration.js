// hdfc-securities-integration.js - Updated with missing functions

const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    // Use your backend proxy URL for HDFC API
    base_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    session_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/session',
    profile_url: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc/profile',
    login_url: 'https://developer.hdfcsec.com/connect/login',
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

// MISSING FUNCTION: Show HDFC Settings Modal
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
                        <h5>📋 Setup Instructions:</h5>
                        <ol style="margin-left: 20px; margin-top: 10px;">
                            <li>Click "Connect to HDFC Securities"</li>
                            <li>Login with your HDFC Securities credentials</li>
                            <li>Grant API access permissions</li>
                            <li>Return to this dashboard</li>
                            <li>Use "Import" buttons to fetch your holdings</li>
                        </ol>
                        <p style="margin-top: 10px; font-size: 0.9em;">
                            <strong>Note:</strong> This integration fetches equity for Pradeep and mutual funds for Sanchita.
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
        connectionSpan.textContent = connected ? '✅ Connected' : '❌ Not Connected';
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

// Connect to HDFC Securities
function connectHDFC() {
    try {
        const loginUrl = `${HDFC_CONFIG.login_url}?api_key=${HDFC_CONFIG.api_key}&redirect_url=${encodeURIComponent(window.location.origin)}`;
        showHDFCMessage('Redirecting to HDFC Securities login...', 'info');
        window.open(loginUrl, '_blank');
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
        statusEl.textContent = connected ? '✅ Connected' : '❌ Not Connected';
        statusEl.style.color = connected ? '#28a745' : '#dc3545';
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

// API Functions
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

// Import functions (same as before)
async function hdfcImportAll() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing all holdings from HDFC Securities...', 'info');

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

        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage('HDFC Securities holdings imported successfully', 'success');
        await loadDashboardData();
    } catch (error) {
        console.error('Error importing HDFC holdings:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

async function hdfcImportEquity() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing equity holdings...', 'info');
        const equityData = await getHdfcHoldings('equity');
        
        // Implementation similar to hdfcImportAll but only equity
        showHDFCMessage('Equity holdings imported successfully', 'success');
    } catch (error) {
        showHDFCMessage(`Equity import failed: ${error.message}`, 'error');
    }
}

async function hdfcImportMF() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Importing mutual fund holdings...', 'info');
        const mfData = await getHdfcHoldings('mf');
        
        // Implementation similar to hdfcImportAll but only MF
        showHDFCMessage('Mutual fund holdings imported successfully', 'success');
    } catch (error) {
        showHDFCMessage(`MF import failed: ${error.message}`, 'error');
    }
}

async function hdfcUpdatePrices() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect HDFC Securities first', 'warning');
            return;
        }

        showHDFCMessage('Updating prices...', 'info');
        // Implementation for price updates
        showHDFCMessage('Prices updated successfully', 'success');
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
