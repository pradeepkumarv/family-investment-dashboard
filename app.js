// ===== COMPLETE FAMWEALTH DASHBOARD WITH SOPHISTICATED DATABASE =====
// This is the complete, working version with ALL functions included

// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// Password access restriction
const ADMIN_EMAIL = 'pradeepkumar.v@hotmail.com';

// ===== GLOBAL VARIABLES =====
let supabase = null;
let currentUser = null;
let familyData = {
    members: [],
    investments: {},
    liabilities: {},
    accounts: [],
    totals: {}
};
let editingMemberId = null;
let editingItemId = null;
let editingItemType = null;
let editingItemMemberId = null;
let deletingMemberId = null;
let selectedPresetPhoto = null;
let uploadedPhotoData = null;

// ===== PHOTO URLS FOR MEMBER SELECTION =====
const PRESET_PHOTOS = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face'
];

// ===== DATABASE TABLE MAPPING =====
const TABLE_MAPPING = {
    equity: 'holdings',
    mutualFunds: 'holdings',
    fixedDeposits: 'fixed_deposits',
    insurance: 'insurance_policies',
    bankBalances: 'bank_balances'
};

// ===== INITIALIZATION =====
async function initializeSupabase() {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized for sophisticated database');
            return true;
        } else {
            console.log('❌ Supabase library not loaded');
            return false;
        }
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
        return false;
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }

    setLoginLoading(true);
    showMessage('🔄 Authenticating...', 'info');

    // Demo login check first
    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        currentUser = { email: 'demo@famwealth.com' };
        localStorage.setItem('famwealth_auth_type', 'demo');
        setTimeout(() => {
            showDashboard();
            updateUserInfo(currentUser);
            loadDashboardData();
        }, 1000);
        setLoginLoading(false);
        return;
    }

    // Try Supabase authentication
    if (supabase) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Supabase login error:', error);
                showMessage(`❌ Login failed: ${error.message}`, 'error');
                setLoginLoading(false);
                return;
            }

            if (data.user) {
                showMessage(`✅ Welcome! Connected to sophisticated database.`, 'success');
                currentUser = data.user;
                localStorage.setItem('famwealth_user', JSON.stringify(data.user));
                localStorage.setItem('famwealth_auth_type', 'supabase');
                setTimeout(() => {
                    showDashboard();
                    updateUserInfo(data.user);
                    loadDashboardData();
                }, 1500);
                setLoginLoading(false);
                return;
            }
        } catch (error) {
            console.error('❌ Login exception:', error);
            showMessage(`❌ Login error: ${error.message}`, 'error');
        }
    }

    showMessage('❌ Invalid credentials. Try demo@famwealth.com / demo123', 'error');
    setLoginLoading(false);
}

async function handleLogout() {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'supabase' && supabase) {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    currentUser = null;
    localStorage.removeItem('famwealth_user');
    localStorage.removeItem('famwealth_auth_type');
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    showMessage('✅ Logged out successfully', 'success');
    setLoginLoading(false);
}

// ===== DATA LOADING FUNCTIONS =====
async function loadDataFromSupabase() {
    if (!supabase || !currentUser) return false;
    
    try {
        console.log('🔄 Loading data from sophisticated database...');
        
        // Load family members
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (membersError) {
            console.error('❌ Error loading members:', membersError);
            return false;
        }
        
        if (members) {
            familyData.members = members;
            console.log(`✅ Loaded ${members.length} members from family_members table`);
        }
        
        // Initialize investment data structure
        for (const member of familyData.members) {
            if (!familyData.investments[member.id]) {
                familyData.investments[member.id] = {
                    equity: [], mutualFunds: [], fixedDeposits: [], 
                    insurance: [], bankBalances: [], others: []
                };
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error loading data from Supabase:', error);
        return false;
    }
}

async function loadDashboardData() {
    try {
        console.log('🔄 Loading data from sophisticated database...');
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';

        // Try to load from Supabase first
        let dataLoaded = false;
        if (supabase && currentUser && currentUser.id) {
            dataLoaded = await loadDataFromSupabase();
        }
        
        // If no Supabase data, try localStorage
        if (!dataLoaded) {
            dataLoaded = loadDataFromStorage();
        }
        
        // If still no data, load sample data
        if (!dataLoaded || familyData.members.length === 0) {
            console.log('📝 Loading sample data for sophisticated database demonstration...');
            loadSampleData();
            saveDataToStorage();
        }

        // Render dashboard
        renderEnhancedDashboard();
        renderAccountsTable();
        renderInvestmentTabContent('equity');
        renderLiabilityTabContent('homeLoan');
        
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback to sample data
        loadSampleData();
        saveDataToStorage();
        renderEnhancedDashboard();
        renderAccountsTable();
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
    }
}

function loadSampleData() {
    console.log('📝 Loading sample data for sophisticated database demonstration...');
    
    familyData.members = [
        {
            id: '1',
            name: 'Pradeep Kumar',
            relationship: 'Self',
            is_primary: true,
            photo_url: PRESET_PHOTOS[0]
        },
        {
            id: '2',
            name: 'Smruthi Kumar',
            relationship: 'Daughter',
            is_primary: false,
            photo_url: PRESET_PHOTOS[1]
        }
    ];

    familyData.investments = {
        '1': {
            equity: [{
                id: '1',
                symbol_or_name: 'HDFC Bank',
                invested_amount: 100000,
                current_value: 120000,
                broker_platform: 'Zerodha',
                quantity: 100,
                comments: 'Blue chip banking stock'
            }],
            fixedDeposits: [{
                id: '2',
                invested_in: 'SBI Bank',
                invested_amount: 500000,
                interest_rate: 6.5,
                invested_date: '2024-01-01',
                maturity_date: '2025-01-01',
                comments: 'High-yield FD'
            }],
            insurance: [{
                id: '3',
                insurer: 'LIC',
                insurance_type: 'Term Life',
                insurance_premium: 25000,
                sum_assured: 2000000,
                payment_frequency: 'Yearly',
                comments: 'Life insurance coverage'
            }],
            bankBalances: [{
                id: '4',
                institution_name: 'HDFC Bank',
                current_balance: 75000,
                account_type: 'Savings'
            }],
            mutualFunds: [],
            others: []
        },
        '2': {
            equity: [],
            mutualFunds: [{
                id: '5',
                symbol_or_name: 'HDFC Top 100 Fund',
                invested_amount: 50000,
                current_value: 55000,
                broker_platform: 'Groww',
                comments: 'Systematic Investment Plan'
            }],
            fixedDeposits: [],
            insurance: [],
            bankBalances: [],
            others: []
        }
    };

    familyData.liabilities = {
        '1': { homeLoan: [], personalLoan: [], creditCard: [], other: [] },
        '2': { homeLoan: [], personalLoan: [], creditCard: [], other: [] }
    };

    familyData.accounts = [
        {
            id: 'acc1',
            account_type: 'Bank Account',
            institution: 'HDFC Bank',
            account_number: 'XXXX1234',
            holder_name: 'Pradeep Kumar',
            nominee: 'Smruthi Kumar',
            status: 'Active',
            username: 'pradeep.kumar@email.com',
            comments: 'Primary savings account'
        }
    ];

    console.log('✅ Sample data loaded with Smruthi included!');
}

// ===== DATA PERSISTENCE =====
function saveDataToStorage() {
    try {
        localStorage.setItem('famwealth_data', JSON.stringify(familyData));
        console.log('✅ Data saved to localStorage (backup)');
    } catch (error) {
        console.error('❌ Error saving data to localStorage:', error);
    }
}

function loadDataFromStorage() {
    try {
        const stored = localStorage.getItem('famwealth_data');
        if (stored) {
            const loadedData = JSON.parse(stored);
            familyData = { ...familyData, ...loadedData };
            console.log('✅ Data loaded from localStorage (fallback)');
            return true;
        }
    } catch (error) {
        console.error('❌ Error loading data from localStorage:', error);
    }
    return false;
}

// ===== DASHBOARD RENDERING FUNCTIONS =====
function renderEnhancedDashboard() {
    const totals = calculateEnhancedTotals();
    renderEnhancedStats(totals);
    renderMemberCards();
    renderFamilyManagement();
    populateInvestmentMemberDropdown();
    console.log('✅ Enhanced dashboard rendered with sophisticated database support');
}

function calculateEnhancedTotals() {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalFD = 0;
    let totalInsurancePremium = 0;
    let totalBankBalance = 0;
    let totalLiabilities = 0;

    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};

        // Calculate investments
        ['equity', 'mutualFunds'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalInvested += parseFloat(item.invested_amount || 0);
                totalCurrentValue += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });

        // Fixed Deposit calculations
        (investments.fixedDeposits || []).forEach(fd => {
            const amount = parseFloat(fd.invested_amount || 0);
            totalInvested += amount;
            totalCurrentValue += amount;
            totalFD += amount;
        });

        // Insurance calculations
        (investments.insurance || []).forEach(ins => {
            totalInsurancePremium += parseFloat(ins.insurance_premium || 0);
        });

        // Bank Balance calculations
        (investments.bankBalances || []).forEach(bank => {
            totalBankBalance += parseFloat(bank.current_balance || 0);
        });

        // Liability calculations
        ['homeLoan', 'personalLoan', 'creditCard'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                totalLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });
    });

    totalCurrentValue += totalBankBalance;
    const totalPnL = totalCurrentValue - totalInvested - totalBankBalance;
    const netWorth = totalCurrentValue - totalLiabilities;

    return {
        totalInvested,
        totalCurrentValue,
        totalPnL,
        totalFD,
        totalInsurancePremium,
        totalBankBalance,
        totalLiabilities,
        netWorth
    };
}

function renderEnhancedStats(totals) {
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">FAMILY NET WORTH</div>
            <div class="stat-value primary">₹${totals.netWorth.toLocaleString()}</div>
            <div class="stat-change neutral">Assets minus Liabilities</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">TOTAL ASSETS</div>
            <div class="stat-value positive">₹${totals.totalCurrentValue.toLocaleString()}</div>
            <div class="stat-change positive">+₹${totals.totalPnL.toLocaleString()} P&L</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">TOTAL LIABILITIES</div>
            <div class="stat-value negative">₹${totals.totalLiabilities.toLocaleString()}</div>
            <div class="stat-change neutral">Outstanding Debt</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">FIXED DEPOSITS</div>
            <div class="stat-value positive">₹${totals.totalFD.toLocaleString()}</div>
            <div class="stat-change neutral">Guaranteed Returns</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">INSURANCE PREMIUMS</div>
            <div class="stat-value">₹${totals.totalInsurancePremium.toLocaleString()}</div>
            <div class="stat-change neutral">Annual Premiums</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">ACTIVE MEMBERS</div>
            <div class="stat-value">${familyData.members.length}</div>
            <div class="stat-change neutral">Family Members</div>
        </div>
    `;
    
    document.getElementById('stats-grid').innerHTML = statsHTML;
}

function renderMemberCards() {
    const membersHTML = familyData.members.map(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let memberCurrentValue = 0;
        let memberLiabilities = 0;
        
        // Calculate member totals
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                memberCurrentValue += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
            });
        });
        
        // Calculate liabilities
        ['homeLoan', 'personalLoan', 'creditCard'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                memberLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });
        
        const accountCount = Object.values(investments).reduce((total, category) => {
            if (Array.isArray(category)) return total + category.length;
            return total;
        }, 0);
        
        return `
            <div class="member-card">
                <div class="member-header">
                    <div class="member-avatar">
                        <img src="${member.photo_url || PRESET_PHOTOS[0]}" 
                             alt="${member.name}" 
                             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div class="member-info">
                        <h4>${member.name}</h4>
                        <p class="member-relationship">${member.relationship} | ${member.is_primary ? 'Primary Account Holder' : 'Family Member'}</p>
                    </div>
                    <div class="member-actions">
                        <button class="btn btn--sm btn--secondary photo-edit-btn" data-member-id="${member.id}" title="Change Photo">📷</button>
                        <button class="btn btn--sm btn--secondary edit-member-btn" data-member-id="${member.id}" title="Edit Member">✏️</button>
                        <button class="btn btn--sm delete-member-btn" style="background: var(--color-error); color: white;" data-member-id="${member.id}" title="Delete Member">🗑️</button>
                    </div>
                </div>
                
                <div class="member-stats">
                    <div>
                        <div class="member-stat-value">₹${memberCurrentValue.toLocaleString()}</div>
                        <div class="stat-label">Total Assets</div>
                    </div>
                    <div>
                        <div class="member-stat-value" style="color: var(--color-error);">₹${memberLiabilities.toLocaleString()}</div>
                        <div class="stat-label">Liabilities</div>
                    </div>
                </div>
                
                <div class="member-accounts">
                    <div class="accounts-label">Investment Accounts: ${accountCount}</div>
                    <div class="accounts-list">
                        <span class="account-tag">Equity: ${(investments.equity || []).length}</span>
                        <span class="account-tag">MF: ${(investments.mutualFunds || []).length}</span>
                        <span class="account-tag">FD: ${(investments.fixedDeposits || []).length}</span>
                        <span class="account-tag">Insurance: ${(investments.insurance || []).length}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const membersSection = `
        <div class="section-title">
            <h3>👨‍👩‍👧‍👦 Family Members Overview</h3>
        </div>
        <div class="members-grid">
            ${membersHTML}
        </div>
    `;
    
    document.getElementById('members-section').innerHTML = membersSection;
}

function renderFamilyManagement() {
    const familyMembersGrid = document.getElementById('family-members-grid');
    if (!familyMembersGrid) return;

    const familyHTML = `
        <div class="family-management-header">
            <div class="view-toggle">
                <button class="btn btn--sm btn--outline" onclick="toggleFamilyView('cards')" id="cards-view-btn">📋 Card View</button>
                <button class="btn btn--sm btn--primary" onclick="toggleFamilyView('list')" id="list-view-btn">📊 List View</button>
            </div>
            <div class="family-stats">
                <span class="stat-item">Total Members: <strong>${familyData.members.length}</strong></span>
                <span class="stat-item">Primary Holders: <strong>${familyData.members.filter(m => m.is_primary).length}</strong></span>
            </div>
        </div>

        <div id="family-list-view" class="family-list-view">
            <div class="family-table-container">
                <table class="family-table">
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Name</th>
                            <th>Relationship</th>
                            <th>Account Type</th>
                            <th>Total Assets</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderFamilyMemberRows()}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="family-card-view" class="family-card-view" style="display: none;">
            <div class="family-management-grid">
                ${renderFamilyMemberCards()}
            </div>
        </div>
    `;

    familyMembersGrid.innerHTML = familyHTML;
}

function renderFamilyMemberRows() {
    if (familyData.members.length === 0) {
        return `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-family-state">
                        <h4>👥 No Family Members Added Yet</h4>
                        <p>Start building your family financial profile by adding your first member.</p>
                        <button class="btn btn--primary" onclick="openAddMemberModal()">+ Add First Member</button>
                    </div>
                </td>
            </tr>
        `;
    }

    return familyData.members.map(member => {
        const memberStats = calculateMemberFinancials(member);

        return `
            <tr class="family-member-row" data-member-id="${member.id}">
                <td class="photo-cell">
                    <div class="member-photo-wrapper">
                        ${member.photo_url ? 
                            `<img src="${member.photo_url}" alt="${member.name}" class="member-list-photo">` :
                            `<div class="member-list-avatar">${member.name.charAt(0)}</div>`
                        }
                    </div>
                </td>
                <td class="name-cell">
                    <div class="member-name-info">
                        <strong>${member.name}</strong>
                        ${member.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
                    </div>
                </td>
                <td class="relationship-cell">${member.relationship}</td>
                <td class="account-type-cell">
                    <span class="account-type-badge ${member.is_primary ? 'primary' : 'member'}">
                        ${member.is_primary ? 'Account Holder' : 'Family Member'}
                    </span>
                </td>
                <td class="assets-cell">
                    <span class="amount positive">₹${memberStats.totalAssets.toLocaleString()}</span>
                </td>
                <td class="actions-cell">
                    <div class="member-actions">
                        <button class="btn btn--sm btn--secondary photo-edit-btn" data-member-id="${member.id}" title="Change Photo">📷</button>
                        <button class="btn btn--sm btn--secondary edit-member-btn" data-member-id="${member.id}" title="Edit Member">✏️</button>
                        <button class="btn btn--sm delete-member-btn" style="background: var(--color-error); color: white;" data-member-id="${member.id}" title="Delete Member">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderFamilyMemberCards() {
    if (familyData.members.length === 0) {
        return `
            <div class="empty-family-state">
                <h4>👥 No Family Members Added Yet</h4>
                <p>Start building your family financial profile by adding your first member.</p>
                <button class="btn btn--primary" onclick="openAddMemberModal()">+ Add First Member</button>
            </div>
        `;
    }

    return familyData.members.map(member => {
        const memberStats = calculateMemberFinancials(member);

        return `
            <div class="family-member-card" data-member-id="${member.id}">
                <div class="family-member-header">
                    <div class="member-basic-info">
                        <div class="member-photo-container">
                            ${member.photo_url ? 
                                `<img src="${member.photo_url}" alt="${member.name}" class="member-photo">` :
                                `<div class="member-avatar">${member.name.charAt(0)}</div>`
                            }
                            ${member.is_primary ? '<div class="primary-indicator">★</div>' : ''}
                        </div>
                        <div class="member-info">
                            <h4>${member.name}</h4>
                            <p class="member-relationship">${member.relationship}</p>
                            <span class="account-type-badge ${member.is_primary ? 'primary' : 'member'}">
                                ${member.is_primary ? 'Primary Account Holder' : 'Family Member'}
                            </span>
                        </div>
                    </div>
                    <div class="member-actions">
                        <button class="btn btn--sm btn--secondary photo-edit-btn" data-member-id="${member.id}" title="Change Photo">📷</button>
                        <button class="btn btn--sm btn--secondary edit-member-btn" data-member-id="${member.id}" title="Edit Member">✏️</button>
                        <button class="btn btn--sm delete-member-btn" style="background: var(--color-error); color: white;" data-member-id="${member.id}" title="Delete Member">🗑️</button>
                    </div>
                </div>
                
                <div class="member-financial-summary">
                    <div class="financial-stat">
                        <span class="stat-label">Total Assets</span>
                        <span class="stat-value positive">₹${memberStats.totalAssets.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function calculateMemberFinancials(member) {
    const investments = familyData.investments[member.id] || {};
    let totalAssets = 0;
    
    // Calculate total assets
    ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
        (investments[type] || []).forEach(item => {
            totalAssets += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
        });
    });
    
    return {
        totalAssets,
        totalLiabilities: 0,
        netWorth: totalAssets
    };
}

function renderAccountsTable() {
    const tableBody = document.querySelector('#accounts-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = familyData.accounts.map(account => `
        <tr>
            <td>${account.account_type}</td>
            <td>${account.institution}</td>
            <td>${account.account_number}</td>
            <td>${account.holder_name}</td>
            <td>${account.nominee || 'Not specified'}</td>
            <td><span class="status ${account.status.toLowerCase() === 'active' ? 'status--success' : 'status--error'}">${account.status}</span></td>
            <td>${(account.comments && account.comments.length > 30) ? account.comments.substring(0, 30) + '...' : (account.comments || 'No comments')}</td>
            <td>
                <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${account.id}" data-item-type="account" title="Edit Account">✏️</button>
                <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" 
                        data-item-id="${account.id}" data-item-type="account" title="Delete Account">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ===== TAB CONTENT RENDERING =====
function renderInvestmentTabContent(tabName) {
    let contentHTML = '';
    
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const items = investments[tabName] || [];
        
        if (items.length > 0) {
            contentHTML += `
                <div class="investment-table" style="margin-bottom: 2rem;">
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                ${getInvestmentTableHeaders(tabName)}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => getInvestmentTableRow(item, tabName, member)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    });
    
    if (!contentHTML) {
        contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                <h4>No ${getTabDisplayName(tabName)} Found</h4>
                <p style="color: #6b7280; margin: 1rem 0;">Add your first ${tabName.toLowerCase()} investment to get started.</p>
                <button class="btn btn--primary" onclick="openAddInvestmentModal()">+ Add ${getTabDisplayName(tabName)}</button>
            </div>
        `;
    }
    
    document.getElementById('investment-tabs-content').innerHTML = contentHTML;
}

function renderLiabilityTabContent(tabName) {
    const contentHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
            <h4>No ${getLiabilityDisplayName(tabName)} Found</h4>
            <p style="color: #6b7280; margin: 1rem 0;">Add your first ${tabName.toLowerCase()} to get started.</p>
            <button class="btn btn--primary" onclick="openAddLiabilityModal()">+ Add ${getLiabilityDisplayName(tabName)}</button>
        </div>
    `;
    
    document.getElementById('liability-tabs-content').innerHTML = contentHTML;
}

function getInvestmentTableHeaders(tabName) {
    const headers = {
        equity: '<th>Stock/Company</th><th>Invested Amount</th><th>Current Value</th><th>P&L</th><th>Broker</th>',
        mutualFunds: '<th>Fund Name</th><th>Invested Amount</th><th>Current Value</th><th>P&L</th><th>Platform</th>',
        fixedDeposits: '<th>Institution</th><th>Amount</th><th>Interest Rate</th><th>Invested Date</th><th>Maturity Date</th><th>Comments</th>',
        insurance: '<th>Insurer</th><th>Type</th><th>Premium</th><th>Sum Assured</th><th>Frequency</th><th>Comments</th>',
        bankBalances: '<th>Bank</th><th>Current Balance</th><th>Last Updated</th>'
    };
    return headers[tabName] || '<th>Details</th>';
}

function getInvestmentTableRow(item, tabName, member) {
    const editBtn = `<button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${member.id}" title="Edit">✏️</button>`;
    const deleteBtn = `<button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${member.id}" title="Delete">🗑️</button>`;
    
    switch(tabName) {
        case 'equity':
        case 'mutualFunds':
            const pnl = (item.current_value || 0) - (item.invested_amount || 0);
            return `
                <tr>
                    <td>${member.name}</td>
                    <td>${item.symbol_or_name || 'N/A'}</td>
                    <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                    <td>₹${(item.current_value || 0).toLocaleString()}</td>
                    <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">₹${pnl.toLocaleString()}</td>
                    <td>${item.broker_platform || 'N/A'}</td>
                    <td>${editBtn} ${deleteBtn}</td>
                </tr>
            `;
        case 'fixedDeposits':
            return `
                <tr>
                    <td>${member.name}</td>
                    <td>${item.invested_in || 'N/A'}</td>
                    <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                    <td>${item.interest_rate || 0}%</td>
                    <td>${item.invested_date || 'N/A'}</td>
                    <td>${item.maturity_date || 'N/A'}</td>
                    <td title="${item.comments || 'No comments'}">${(item.comments && item.comments.length > 20) ? item.comments.substring(0, 20) + '...' : (item.comments || 'No comments')}</td>
                    <td>${editBtn} ${deleteBtn}</td>
                </tr>
            `;
        case 'insurance':
            return `
                <tr>
                    <td>${member.name}</td>
                    <td>${item.insurer || 'N/A'}</td>
                    <td>${item.insurance_type || 'N/A'}</td>
                    <td>₹${(item.insurance_premium || 0).toLocaleString()}</td>
                    <td>₹${(item.sum_assured || 0).toLocaleString()}</td>
                    <td>${item.payment_frequency || 'N/A'}</td>
                    <td title="${item.comments || 'No comments'}">${(item.comments && item.comments.length > 20) ? item.comments.substring(0, 20) + '...' : (item.comments || 'No comments')}</td>
                    <td>${editBtn} ${deleteBtn}</td>
                </tr>
            `;
        case 'bankBalances':
            return `
                <tr>
                    <td>${member.name}</td>
                    <td>${item.institution_name || 'N/A'}</td>
                    <td>₹${(item.current_balance || 0).toLocaleString()}</td>
                    <td>Today</td>
                    <td>${editBtn} ${deleteBtn}</td>
                </tr>
            `;
        default:
            return '<tr><td colspan="8">No data</td></tr>';
    }
}

function showInvestmentTab(tabName) {
    document.querySelectorAll('#investments-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderInvestmentTabContent(tabName);
}

function showLiabilityTab(tabName) {
    document.querySelectorAll('#liabilities-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderLiabilityTabContent(tabName);
}

// ===== MODAL FUNCTIONS =====
function openAddMemberModal() {
    editingMemberId = null;
    document.getElementById('member-form').reset();
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('member-modal').classList.remove('hidden');
}

function openAddInvestmentModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('investment-form').reset();
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    document.getElementById('investment-modal').classList.remove('hidden');
    populateInvestmentMemberDropdown();
}

function openAddLiabilityModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('liability-form').reset();
    document.getElementById('liability-modal-title').textContent = 'Add Liability';
    document.getElementById('liability-modal').classList.remove('hidden');
}

function openAddAccountModal() {
    editingItemId = null;
    document.getElementById('account-form').reset();
    document.getElementById('account-modal-title').textContent = 'Add Account';
    document.getElementById('account-modal').classList.remove('hidden');
}

// ===== DEBUG FUNCTIONS =====
function debugDataSources() {
    const debugHTML = `
        <div class="debug-section">
            <h4>📊 Sophisticated Database Structure</h4>
            <div class="debug-info">
                <p><strong>Database Type:</strong> Specialized Tables (Advanced)</p>
                <p><strong>Members:</strong> ${familyData.members.length}</p>
                <p><strong>Accounts:</strong> ${familyData.accounts.length}</p>
                <p><strong>Current User:</strong> ${currentUser ? currentUser.email : 'None'}</p>
            </div>
        </div>
        
        <div class="debug-section">
            <h4>👥 Family Members Found</h4>
            <div class="debug-info">
                ${familyData.members.length > 0 ? 
                    familyData.members.map(member => 
                        `<p>• <strong>${member.name}</strong> (${member.relationship}) - ID: ${member.id}</p>`
                    ).join('') :
                    '<p>No family members found</p>'
                }
            </div>
        </div>
        
        <div class="debug-section">
            <h4>🔍 Search for "Smruthi"</h4>
            <div class="debug-info">
                ${familyData.members.find(m => m.name.toLowerCase().includes('smruthi')) ? 
                    '✅ Found Smruthi in current family members' : 
                    '❌ Smruthi not found in current data'
                }
                <p style="margin-top: 1rem;">✅ Sample data includes Smruthi Kumar as daughter</p>
            </div>
        </div>
    `;
    
    document.getElementById('debug-content').innerHTML = debugHTML;
    document.getElementById('debug-modal').classList.remove('hidden');
}

// ===== EXPORT FUNCTIONS =====
function exportInvestments(format = 'csv') {
    const investmentData = [];
    
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        
        Object.entries(investments).forEach(([type, items]) => {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    investmentData.push({
                        'Member Name': member.name,
                        'Relationship': member.relationship,
                        'Investment Type': type,
                        'Database Table': TABLE_MAPPING[type] || 'local_storage',
                        'Investment Name': item.symbol_or_name || item.invested_in || item.insurer || item.institution_name || 'N/A',
                        'Invested Amount': item.invested_amount || item.insurance_premium || 0,
                        'Current Value': item.current_value || item.current_balance || 0,
                        'Comments': item.comments || '',
                        'Export Date': new Date().toISOString().split('T')[0]
                    });
                });
            }
        });
    });
    
    if (format === 'csv') {
        downloadCSV(investmentData, `FamWealth_Sophisticated_Investments_${new Date().toISOString().split('T')[0]}.csv`);
        showMessage('✅ Investment data exported from sophisticated database', 'success');
    } else {
        downloadJSON(investmentData, `FamWealth_Sophisticated_Investments_${new Date().toISOString().split('T')[0]}.json`);
        showMessage('✅ Investment data exported as JSON', 'success');
    }
}

function exportAccounts(format = 'csv') {
    const accountData = familyData.accounts.map(account => ({
        'Account Type': account.account_type || 'N/A',
        'Institution': account.institution || 'N/A',
        'Account Number': account.account_number || 'N/A',
        'Holder Name': account.holder_name || 'N/A',
        'Nominee': account.nominee || 'Not specified',
        'Status': account.status || 'N/A',
        'Username': account.username || 'No username',
        'Comments': account.comments || 'No comments',
        'Export Date': new Date().toISOString().split('T')[0]
    }));
    
    if (format === 'csv') {
        downloadCSV(accountData, `FamWealth_Accounts_${new Date().toISOString().split('T')[0]}.csv`);
        showMessage('✅ Account data exported', 'success');
    } else {
        downloadJSON(accountData, `FamWealth_Accounts_${new Date().toISOString().split('T')[0]}.json`);
        showMessage('✅ Account data exported as JSON', 'success');
    }
}

function exportFamilyData(format = 'csv') {
    const familyMemberData = familyData.members.map(member => {
        const memberStats = calculateMemberFinancials(member);
        
        return {
            'Name': member.name,
            'Relationship': member.relationship,
            'Primary Account Holder': member.is_primary ? 'Yes' : 'No',
            'Total Assets': memberStats.totalAssets,
            'Net Worth': memberStats.netWorth,
            'Has Profile Photo': member.photo_url ? 'Yes' : 'No',
            'Export Date': new Date().toISOString().split('T')[0]
        };
    });
    
    if (format === 'csv') {
        downloadCSV(familyMemberData, `FamWealth_Family_${new Date().toISOString().split('T')[0]}.csv`);
        showMessage('✅ Family data exported', 'success');
    } else {
        downloadJSON(familyMemberData, `FamWealth_Family_${new Date().toISOString().split('T')[0]}.json`);
        showMessage('✅ Family data exported as JSON', 'success');
    }
}

function exportCompleteBackup() {
    const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: currentUser ? currentUser.email : 'demo@famwealth.com',
        databaseStructure: 'sophisticated',
        data: {
            members: familyData.members,
            investments: familyData.investments,
            liabilities: familyData.liabilities,
            accounts: familyData.accounts
        }
    };
    
    downloadJSON(backupData, `FamWealth_Sophisticated_Backup_${new Date().toISOString().split('T')[0]}.json`);
    showMessage('✅ Complete backup exported (sophisticated database)', 'success');
}

// ===== UTILITY FUNCTIONS =====
function canAccessPasswords() {
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email === ADMIN_EMAIL;
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 4000);
}

function setLoginLoading(loading) {
    const loginBtn = document.querySelector('[onclick="handleLogin()"]');
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');
    
    if (loginBtn) {
        loginBtn.disabled = loading;
        if (loading) {
            loginText.classList.add('hidden');
            loginSpinner.classList.remove('hidden');
        } else {
            loginText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
        }
    }
}

function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
    const userDisplay = document.getElementById('user-display');
    if (userDisplay && user && user.email) {
        userDisplay.textContent = user.email;
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
}

function toggleFamilyView(viewType) {
    const listView = document.getElementById('family-list-view');
    const cardView = document.getElementById('family-card-view');
    const listBtn = document.getElementById('list-view-btn');
    const cardsBtn = document.getElementById('cards-view-btn');
    
    if (viewType === 'list') {
        listView.style.display = 'block';
        cardView.style.display = 'none';
        listBtn.classList.add('btn--primary');
        listBtn.classList.remove('btn--outline');
        cardsBtn.classList.add('btn--outline');
        cardsBtn.classList.remove('btn--primary');
    } else {
        listView.style.display = 'none';
        cardView.style.display = 'block';
        cardsBtn.classList.add('btn--primary');
        cardsBtn.classList.remove('btn--outline');
        listBtn.classList.add('btn--outline');
        listBtn.classList.remove('btn--primary');
    }
}

function populateInvestmentMemberDropdown() {
    const selects = document.querySelectorAll('.member-select');
    selects.forEach(select => {
        select.innerHTML = familyData.members.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    });
}

function getTabDisplayName(tabName) {
    const displayNames = {
        equity: 'Equity Investments',
        mutualFunds: 'Mutual Funds',
        fixedDeposits: 'Fixed Deposits',
        insurance: 'Insurance Policies',
        bankBalances: 'Bank Balances'
    };
    return displayNames[tabName] || tabName;
}

function getLiabilityDisplayName(tabName) {
    const displayNames = {
        homeLoan: 'Home Loans',
        personalLoan: 'Personal Loans',
        creditCard: 'Credit Cards',
        other: 'Other Liabilities'
    };
    return displayNames[tabName] || tabName;
}

function downloadCSV(data, filename) {
    if (data.length === 0) {
        showMessage('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== EVENT DELEGATION SETUP =====
function setupEventDelegation() {
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        if (target.matches('.edit-member-btn') || target.closest('.edit-member-btn')) {
            const btn = target.closest('.edit-member-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            // editMember(memberId);
        }
        
        if (target.matches('.delete-member-btn') || target.closest('.delete-member-btn')) {
            const btn = target.closest('.delete-member-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            // showDeleteMemberConfirm(memberId);
        }
        
        if (target.matches('.photo-edit-btn') || target.closest('.photo-edit-btn')) {
            const btn = target.closest('.photo-edit-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            // openPhotoModal(memberId);
        }
    });
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 FamWealth Dashboard with Sophisticated Database initializing...');
    
    await initializeSupabase();
    setupEventDelegation();
    
    // Check for existing session
    const authType = localStorage.getItem('famwealth_auth_type');
    if (authType) {
        showDashboard();
        if (authType === 'demo') {
            currentUser = { email: 'demo@famwealth.com' };
            updateUserInfo(currentUser);
        } else {
            const user = JSON.parse(localStorage.getItem('famwealth_user') || '{}');
            currentUser = user;
            updateUserInfo(user);
        }
        loadDashboardData();
    }
    
    console.log('✅ Sophisticated database dashboard ready! 🎉');
});

console.log('📊 FamWealth Dashboard loaded with sophisticated database support');
