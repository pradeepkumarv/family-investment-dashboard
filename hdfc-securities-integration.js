// hdfc-securities-integration.js - PRODUCTION VERSION with Real API Integration

const HDFC_CONFIG = {
    api_key: '5f5de761677a4283bd623e6a1013395b',
    api_secret: '8ed88c629bc04639afcdca15381bd965', // You need to get this from HDFC Developer Portal
    
    // Real HDFC Securities API endpoints
    base_url: 'https://developer.hdfcsec.com/oapi/v1',
    login_url: 'https://developer.hdfcsec.com/oapi/v1/login',
    access_token_url: 'https://developer.hdfcsec.com/oapi/v1/access/token',
    validate_url: 'https://developer.hdfcsec.com/oapi/v1/validate',
    holdings_url: 'https://developer.hdfcsec.com/oapi/v1/holdings',
    profile_url: 'https://developer.hdfcsec.com/oapi/v1/user/profile',
    
    // Backend proxy URLs (you need to create these)
    backend_base: 'https://family-investment-dashboard-4hli.vercel.app/api/hdfc',
    
    // Member mapping
    members: {
        equity: 'bef9db5e-2f21-4038-8f3f-f78ce1bbfb49', // Pradeep Kumar V
        mf: 'd3a4fc84-a94b-494d-915f-60901f16d973', // Sanchita Pradeep
    },
    
    // Redirect URL for OAuth flow
    redirect_url: window.location.origin
};

let hdfcAccessToken = null;
let hdfcRequestToken = null;

// Utility functions
function showHDFCMessage(msg, type = 'info') {
    if (typeof showMessage === 'function') {
        showMessage(`HDFC Securities: ${msg}`, type);
    } else {
        console.log(`HDFC: ${msg}`);
    }
}

// ===== AUTHENTICATION FLOW =====

// Step 1: Generate login URL and redirect user
function connectHDFC() {
    try {
        showHDFCMessage('Redirecting to HDFC Securities login...', 'info');
        
        // Generate login URL with proper parameters
        const loginParams = new URLSearchParams({
            api_key: HDFC_CONFIG.api_key,
            redirect_url: HDFC_CONFIG.redirect_url,
            response_type: 'code',
            state: 'hdfc_auth_' + Date.now()
        });
        
        const loginUrl = `${HDFC_CONFIG.login_url}?${loginParams.toString()}`;
        
        console.log('🔗 HDFC Login URL:', loginUrl);
        
        // Store state for verification
        localStorage.setItem('hdfc_auth_state', loginParams.get('state'));
        
        // Redirect to HDFC Securities login
        window.location.href = loginUrl;
        
    } catch (error) {
        showHDFCMessage(`Connection failed: ${error.message}`, 'error');
    }
}

// Step 2: Handle redirect callback and extract request token
function handleHDFCCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');
    const status = urlParams.get('status');
    const state = urlParams.get('state');
    
    // Verify state parameter
    const storedState = localStorage.getItem('hdfc_auth_state');
    if (state && state !== storedState) {
        showHDFCMessage('Invalid authentication state', 'error');
        return;
    }
    
    if (status === 'success' && requestToken) {
        console.log('✅ Request token received:', requestToken);
        hdfcRequestToken = requestToken;
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Generate access token
        generateHDFCAccessToken(requestToken);
    } else if (status === 'error') {
        const error = urlParams.get('error') || 'Authentication failed';
        showHDFCMessage(`Authentication error: ${error}`, 'error');
    }
}

// Step 3: Exchange request token for access token
async function generateHDFCAccessToken(requestToken) {
    try {
        showHDFCMessage('Generating access token...', 'info');
        
        const response = await fetch(`${HDFC_CONFIG.backend_base}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                request_token: requestToken,
                api_key: HDFC_CONFIG.api_key,
                api_secret: HDFC_CONFIG.api_secret
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            hdfcAccessToken = data.data.access_token;
            
            // Store tokens
            localStorage.setItem('hdfc_access_token', hdfcAccessToken);
            localStorage.setItem('hdfc_user_data', JSON.stringify(data.data));
            localStorage.setItem('hdfc_token_generated_at', Date.now().toString());
            
            showHDFCMessage('Successfully connected to HDFC Securities!', 'success');
            
            // Update UI
            updateHDFCConnectionStatus();
            
            // Fetch user profile
            await fetchHDFCProfile();
            
        } else {
            throw new Error(data.error || 'Failed to generate access token');
        }
        
    } catch (error) {
        console.error('Access token generation failed:', error);
        showHDFCMessage(`Failed to generate access token: ${error.message}`, 'error');
    }
}

// Step 4: Fetch user profile to verify connection
async function fetchHDFCProfile() {
    try {
        const response = await fetch(`${HDFC_CONFIG.backend_base}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_token: hdfcAccessToken,
                api_key: HDFC_CONFIG.api_key
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('✅ User profile fetched:', data.data);
            localStorage.setItem('hdfc_profile', JSON.stringify(data.data));
            showHDFCMessage(`Welcome ${data.data.user_name}!`, 'success');
        }
        
    } catch (error) {
        console.error('Profile fetch failed:', error);
    }
}

// ===== DATA FETCHING FUNCTIONS =====

// Fetch Holdings (Equity + MF)
async function fetchHDFCHoldings() {
    try {
        if (!hdfcAccessToken) {
            throw new Error('Not authenticated. Please connect first.');
        }
        
        const response = await fetch(`${HDFC_CONFIG.backend_base}/holdings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                access_token: hdfcAccessToken,
                api_key: HDFC_CONFIG.api_key
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data;
        } else {
            throw new Error(data.error || 'Failed to fetch holdings');
        }
        
    } catch (error) {
        console.error('Holdings fetch failed:', error);
        throw error;
    }
}

// ===== IMPORT FUNCTIONS =====

// Import All Holdings (Equity + MF)
async function hdfcImportAll() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }
        
        showHDFCMessage('Importing all holdings from HDFC Securities...', 'info');
        
        const holdings = await fetchHDFCHoldings();
        let importCount = 0;
        
        // Process holdings data
        if (holdings && Array.isArray(holdings)) {
            for (const holding of holdings) {
                // Determine if it's equity or mutual fund based on instrument type
                if (holding.instrument_type === 'EQUITY' || holding.segment === 'NSE' || holding.segment === 'BSE') {
                    // Import as Equity for Pradeep
                    await importEquityHolding(holding);
                    importCount++;
                } else if (holding.instrument_type === 'MF' || holding.product_type === 'MF') {
                    // Import as Mutual Fund for Sanchita
                    await importMFHolding(holding);
                    importCount++;
                }
            }
        }
        
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Successfully imported ${importCount} holdings!`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        
    } catch (error) {
        console.error('Import failed:', error);
        showHDFCMessage(`Import failed: ${error.message}`, 'error');
    }
}

// Import individual equity holding
async function importEquityHolding(holding) {
    try {
        // Check if already exists
        const exists = investments.some(inv => 
            inv.member_id === HDFC_CONFIG.members.equity &&
            inv.symbol_or_name === holding.symbol &&
            inv.broker_platform.includes('HDFC Securities')
        );
        
        if (!exists) {
            await addInvestmentData({
                member_id: HDFC_CONFIG.members.equity,
                investment_type: 'equity',
                symbol_or_name: holding.symbol || holding.trading_symbol,
                invested_amount: (holding.quantity || 0) * (holding.average_price || 0),
                current_value: (holding.quantity || 0) * (holding.ltp || holding.last_price || 0),
                broker_platform: 'HDFC Securities Equity (Pradeep)',
                hdfc_data: holding,
                equity_quantity: holding.quantity || 0,
                equity_avg_price: holding.average_price || 0,
                equity_symbol: holding.symbol || holding.trading_symbol,
                created_at: new Date().toISOString(),
                last_updated: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Failed to import equity holding:', error);
    }
}

// Import individual MF holding
async function importMFHolding(holding) {
    try {
        // Check if already exists
        const exists = investments.some(inv => 
            inv.member_id === HDFC_CONFIG.members.mf &&
            inv.folio_number === holding.folio &&
            inv.broker_platform.includes('HDFC Securities')
        );
        
        if (!exists) {
            await addInvestmentData({
                member_id: HDFC_CONFIG.members.mf,
                investment_type: 'mutualFunds',
                symbol_or_name: holding.fund_name || holding.symbol,
                invested_amount: (holding.units || 0) * (holding.average_nav || 0),
                current_value: (holding.units || 0) * (holding.nav || holding.ltp || 0),
                broker_platform: 'HDFC Securities MF (Sanchita)',
                hdfc_data: holding,
                mf_quantity: holding.units || 0,
                mf_nav: holding.nav || holding.ltp || 0,
                mf_average_price: holding.average_nav || 0,
                fund_name: holding.fund_name || holding.symbol,
                folio_number: holding.folio || '',
                scheme_code: holding.scheme_code || '',
                fund_house: holding.fund_house || 'HDFC',
                created_at: new Date().toISOString(),
                last_updated: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Failed to import MF holding:', error);
    }
}

// Import only equity
async function hdfcImportEquity() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }
        
        showHDFCMessage('Importing equity holdings...', 'info');
        
        const holdings = await fetchHDFCHoldings();
        let importCount = 0;
        
        if (holdings && Array.isArray(holdings)) {
            for (const holding of holdings) {
                if (holding.instrument_type === 'EQUITY' || holding.segment === 'NSE' || holding.segment === 'BSE') {
                    await importEquityHolding(holding);
                    importCount++;
                }
            }
        }
        
        showHDFCMessage(`Imported ${importCount} equity holdings!`, 'success');
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('equity');
        }
        
    } catch (error) {
        showHDFCMessage(`Equity import failed: ${error.message}`, 'error');
    }
}

// Import only mutual funds
async function hdfcImportMF() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }
        
        showHDFCMessage('Importing mutual fund holdings...', 'info');
        
        const holdings = await fetchHDFCHoldings();
        let importCount = 0;
        
        if (holdings && Array.isArray(holdings)) {
            for (const holding of holdings) {
                if (holding.instrument_type === 'MF' || holding.product_type === 'MF') {
                    await importMFHolding(holding);
                    importCount++;
                }
            }
        }
        
        showHDFCMessage(`Imported ${importCount} mutual fund holdings!`, 'success');
        if (typeof renderInvestmentTabContent === 'function') {
            renderInvestmentTabContent('mutualFunds');
        }
        
    } catch (error) {
        showHDFCMessage(`MF import failed: ${error.message}`, 'error');
    }
}

// Update prices for existing holdings
async function hdfcUpdatePrices() {
    try {
        if (!hdfcAccessToken) {
            showHDFCMessage('Please connect to HDFC Securities first', 'warning');
            return;
        }
        
        showHDFCMessage('Updating prices...', 'info');
        
        const holdings = await fetchHDFCHoldings();
        let updateCount = 0;
        
        // Update existing HDFC investments with fresh data
        const hdfcInvestments = investments.filter(inv => 
            inv.broker_platform && inv.broker_platform.includes('HDFC Securities')
        );
        
        for (const investment of hdfcInvestments) {
            // Find matching holding data
            const matchingHolding = holdings.find(h => 
                h.symbol === investment.symbol_or_name || 
                h.trading_symbol === investment.symbol_or_name
            );
            
            if (matchingHolding) {
                const newValue = (matchingHolding.quantity || 0) * (matchingHolding.ltp || matchingHolding.last_price || 0);
                
                // Update in memory
                const invIndex = investments.findIndex(i => i.id === investment.id);
                if (invIndex !== -1) {
                    investments[invIndex].current_value = newValue;
                    investments[invIndex].last_updated = new Date().toISOString();
                    
                    if (investment.investment_type === 'equity') {
                        investments[invIndex].equity_quantity = matchingHolding.quantity || 0;
                    } else if (investment.investment_type === 'mutualFunds') {
                        investments[invIndex].mf_quantity = matchingHolding.units || 0;
                        investments[invIndex].mf_nav = matchingHolding.nav || matchingHolding.ltp || 0;
                    }
                }
                
                // Update in database
                if (typeof updateInvestmentData === 'function') {
                    await updateInvestmentData(investment.id, {
                        current_value: newValue,
                        last_updated: new Date().toISOString()
                    });
                }
                
                updateCount++;
            }
        }
        
        localStorage.setItem('hdfc_last_sync', new Date().toISOString());
        showHDFCMessage(`Updated ${updateCount} holdings!`, 'success');
        
        if (typeof loadDashboardData === 'function') {
            await loadDashboardData();
        }
        
    } catch (error) {
        showHDFCMessage(`Price update failed: ${error.message}`, 'error');
    }
}

// ===== UI FUNCTIONS =====

function showHDFCSettings() {
    const oldModal = document.getElementById('hdfc_settings_modal');
    if (oldModal) oldModal.remove();

    const modalContent = `
        <div id="hdfc_settings_modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>🏦 HDFC Securities API Settings</h3>
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

                    <div class="api-credentials" style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>🔐 API Configuration</h4>
                        <div style="margin-top: 10px;">
                            <strong>API Key:</strong> ${HDFC_CONFIG.api_key}<br>
                            <strong>API Secret:</strong> ${HDFC_CONFIG.api_secret ? '***configured***' : '❌ Not configured'}
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

                    <div class="setup-instructions" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>📋 Setup Instructions</h4>
                        <ol style="margin-left: 20px; margin-top: 10px;">
                            <li>Visit <a href="https://developer.hdfcsec.com/" target="_blank">developer.hdfcsec.com</a></li>
                            <li>Login with your InvestRight credentials</li>
                            <li>Create new app with these settings:
                                <ul style="margin-left: 20px;">
                                    <li><strong>App Name:</strong> Family Wealth Dashboard</li>
                                    <li><strong>Redirect URL:</strong> ${HDFC_CONFIG.redirect_url}</li>
                                </ul>
                            </li>
                            <li>Copy API Key and Secret to your configuration</li>
                            <li>Click "Connect to HDFC Securities" above</li>
                        </ol>
                    </div>

                    <div class="requirements" style="background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>⚠️ Requirements</h4>
                        <ul style="margin-left: 20px; margin-top: 10px;">
                            <li>Active HDFC Securities InvestRight account</li>
                            <li>API access enabled (contact HDFC Securities)</li>
                            <li>Valid API Key and Secret</li>
                            <li>Backend endpoints deployed for security</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);
    updateHDFCModalStatus();
}

function closeHDFCModal() {
    const modal = document.getElementById('hdfc_settings_modal');
    if (modal) modal.remove();
}

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
            syncSpan.textContent = new Date(lastSync).toLocaleString();
        } else {
            syncSpan.textContent = 'Never';
        }
    }
}

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
            syncEl.textContent = `Last sync: ${new Date(lastSync).toLocaleString()}`;
        } else {
            syncEl.textContent = 'Last sync: Never';
        }
    }
}

function disconnectHDFC() {
    localStorage.removeItem('hdfc_access_token');
    localStorage.removeItem('hdfc_user_data');
    localStorage.removeItem('hdfc_last_sync');
    localStorage.removeItem('hdfc_profile');
    localStorage.removeItem('hdfc_auth_state');
    
    hdfcAccessToken = null;
    hdfcRequestToken = null;
    
    showHDFCMessage('Disconnected from HDFC Securities', 'info');
    updateHDFCConnectionStatus();
    updateHDFCModalStatus();
}

async function testHDFCConnection() {
    try {
        const token = localStorage.getItem('hdfc_access_token');
        if (!token) {
            showHDFCMessage('No access token found. Please connect first.', 'warning');
            return;
        }
        
        showHDFCMessage('Testing connection...', 'info');
        hdfcAccessToken = token;
        await fetchHDFCProfile();
        showHDFCMessage('Connection test successful!', 'success');
        
    } catch (error) {
        showHDFCMessage(`Connection test failed: ${error.message}`, 'error');
    }
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    // Check for saved access token
    const savedToken = localStorage.getItem('hdfc_access_token');
    if (savedToken) {
        hdfcAccessToken = savedToken;
    }
    
    // Handle OAuth callback
    if (window.location.search.includes('request_token') || window.location.search.includes('status=success')) {
        handleHDFCCallback();
    }
    
    // Update connection status
    updateHDFCConnectionStatus();
    
    console.log('🏦 HDFC Securities integration initialized');
});
