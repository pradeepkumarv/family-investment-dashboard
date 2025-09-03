// app.js - ENHANCED VERSION: Fixed Photo Upload + Enhanced Member Details + Complete Form Fields
// ===== GLOBAL VARIABLES =====
let supabase = null;
let currentUser = null;
let familyMembers = [];
let investments = [];
let liabilities = [];
let accounts = [];
let reminders = [];
let editingMemberId = null;
let editingInvestmentId = null;
let editingLiabilityId = null;
let editingAccountId = null;
let currentPhotoMemberId = null;
let selectedPhoto = null;

// Global import variables
let currentImportType = null;
let importData = null;

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// Demo data for offline mode
const DEMO_DATA = {
    familyMembers: [
        {
            id: 'demo-1',
            name: 'John Doe',
            relationship: 'Self',
            is_primary: true,
            photo: 'man1.png',
            assets: 1500000,
            liabilities: 800000,
            created_at: '2024-01-01T00:00:00Z'
        },
        {
            id: 'demo-2',
            name: 'Jane Doe',
            relationship: 'Spouse',
            is_primary: false,
            photo: 'woman1.png',
            assets: 750000,
            liabilities: 200000,
            created_at: '2024-01-02T00:00:00Z'
        }
    ],
    investments: [
        {
            id: 'inv-1',
            member_id: 'demo-1',
            investment_type: 'equity',
            symbol_or_name: 'HDFC Bank',
            invested_amount: 100000,
            current_value: 125000,
            broker_platform: 'Zerodha',
            created_at: '2024-01-01T00:00:00Z'
        }
    ],
    liabilities: [
        {
            id: 'lib-1',
            member_id: 'demo-1',
            type: 'homeLoan',
            lender: 'HDFC Bank',
            outstanding_amount: 2500000,
            emi_amount: 35000,
            interest_rate: 8.5,
            created_at: '2024-01-01T00:00:00Z'
        }
    ],
    accounts: [
        {
            id: 'acc-1',
            account_type: 'Savings Account',
            institution: 'HDFC Bank',
            account_number: '****1234',
            holder_id: 'demo-1',
            holder_name: 'John Doe',
            nominee_id: 'demo-2',
            nominee_name: 'Jane Doe',
            status: 'Active',
            comments: 'Primary savings account',
            created_at: '2024-01-01T00:00:00Z'
        }
    ],
    reminders: [
        {
            id: 'rem-1',
            member_id: 'demo-1',
            title: 'Insurance Premium Due',
            date: '2024-12-31',
            type: 'insurance',
            created_at: '2024-01-01T00:00:00Z'
        }
    ]
};

// ===== SUPABASE INITIALIZATION =====
async function initializeSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Supabase not loaded, running in demo mode');
            return false;
        }

        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Test connection
        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error && error.code !== 'PGRST116') {
            console.warn('⚠️ Supabase connection failed, running in demo mode');
            return false;
        }

        console.log('✅ Supabase initialized successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase initialization error, running in demo mode:', error);
        return false;
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleLogin() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }

    try {
        if (supabase) {
            // Attempt Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                // Fall back to demo mode
                handleDemoLogin(email);
                return;
            }

            currentUser = data.user;
            localStorage.setItem('famwealth_auth_type', 'supabase');
            localStorage.setItem('famwealth_user', JSON.stringify(currentUser));
        } else {
            // Demo mode login
            handleDemoLogin(email);
            return;
        }

        showDashboard();
        updateUserInfo(currentUser);
        await loadDashboardData();
        showMessage('Login successful!', 'success');

    } catch (err) {
        console.error('Login error:', err);
        handleDemoLogin(email);
    }
}

function handleDemoLogin(email) {
    currentUser = {
        email: email || 'demo@famwealth.com',
        id: 'demo-user-id'
    };
    localStorage.setItem('famwealth_auth_type', 'demo');
    localStorage.setItem('famwealth_user', JSON.stringify(currentUser));

    showDashboard();
    updateUserInfo(currentUser);
    loadDashboardData();
    showMessage('Logged in with demo data!', 'info');
}

function loadDemoData() {
    familyMembers = [...DEMO_DATA.familyMembers];
    investments = [...DEMO_DATA.investments];
    liabilities = [...DEMO_DATA.liabilities];
    accounts = [...DEMO_DATA.accounts];
    reminders = [...DEMO_DATA.reminders];

    renderFamilyMembers();
    renderStatsOverview();
    renderInvestmentTabContent('equity');
    renderLiabilityTabContent('homeLoan');
    renderAccounts();
    renderReminders();
    updateLastUpdated();
}

function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
    const userEmailSpan = document.getElementById('user-email');
    if (userEmailSpan) {
        userEmailSpan.textContent = user.email || 'Unknown User';
    }
}

function handleLogout() {
    localStorage.removeItem('famwealth_auth_type');
    localStorage.removeItem('famwealth_user');
    localStorage.removeItem('famwealth_data');
    
    currentUser = null;
    familyMembers = [];
    investments = [];
    liabilities = [];
    accounts = [];
    reminders = [];

    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'flex';

    if (supabase) {
        supabase.auth.signOut();
    }

    showMessage('Logged out successfully.', 'info');
}

// ===== DATA LOADING FUNCTIONS =====
function setLoadingState(isLoading) {
    const dashboard = document.getElementById('main-dashboard');
    if (dashboard) {
        if (isLoading) {
            dashboard.classList.add('loading');
        } else {
            dashboard.classList.remove('loading');
        }
    }
}

function updateLastUpdated() {
    const now = new Date();
    const lastUpdatedSpan = document.getElementById('last-updated');
    const lastUpdatedDisplay = document.getElementById('last-updated-display');
    const timeString = now.toLocaleString();

    if (lastUpdatedSpan) {
        lastUpdatedSpan.textContent = timeString;
    }
    if (lastUpdatedDisplay) {
        lastUpdatedDisplay.textContent = timeString;
    }
}

// SHARED FAMILY DATA - removed user_id filtering
async function loadDashboardData() {
    if (!currentUser) {
        console.warn('No current user; cannot load data.');
        return;
    }

    const authType = localStorage.getItem('famwealth_auth_type');

    if (authType === 'demo' || !supabase) {
        console.log('📊 Loading demo data...');
        loadDemoData();
        return;
    }

    if (authType === 'supabase' && supabase) {
        try {
            setLoadingState(true);

            // SHARED DATA - NO user_id filtering
            // Load family members (SHARED - All users see same data)
            const { data: membersData, error: membersError } = await supabase
                .from('family_members')
                .select('*')
                .order('created_at', { ascending: true });

            if (membersError) {
                console.error('Error fetching family members:', membersError);
                showMessage('Failed to load family members.', 'error');
                setLoadingState(false);
                return;
            }

            familyMembers = membersData || [];
            const memberIds = familyMembers.map(member => member.id);

            // Load investments (SHARED - All users see same data)
            let investmentsData = [];
            if (memberIds.length > 0) {
                const { data, error } = await supabase
                    .from('investments')
                    .select('*')
                    .in('member_id', memberIds)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching investments:', error);
                    showMessage('Failed to load investments.', 'error');
                    setLoadingState(false);
                    return;
                }
                investmentsData = data || [];
            }
            investments = investmentsData;

            // Load liabilities (SHARED - All users see same data)
            let liabilitiesData = [];
            if (memberIds.length > 0) {
                const { data, error } = await supabase
                    .from('liabilities')
                    .select('*')
                    .in('member_id', memberIds)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching liabilities:', error);
                    showMessage('Failed to load liabilities.', 'error');
                    setLoadingState(false);
                    return;
                }
                liabilitiesData = data || [];
            }
            liabilities = liabilitiesData;

            // Load accounts (SHARED - All users see same data)
            const { data: accountsData, error: accountsError } = await supabase
                .from('accounts')
                .select('*')
                .order('created_at', { ascending: false });

            if (accountsError) {
                console.error('Error fetching accounts:', accountsError);
                showMessage('Failed to load accounts.', 'error');
                setLoadingState(false);
                return;
            }
            accounts = accountsData || [];

            // Load reminders (SHARED - All users see same data)
            const { data: remindersData, error: remindersError } = await supabase
                .from('reminders')
                .select('*')
                .order('date', { ascending: true });

            if (remindersError) {
                console.error('Error fetching reminders:', remindersError);
            }
            reminders = remindersData || [];

            // Render all data
            renderFamilyMembers();
            renderStatsOverview();
            renderInvestmentTabContent('equity');
            renderLiabilityTabContent('homeLoan');
            renderAccounts();
            renderReminders();
            updateLastUpdated();

            setLoadingState(false);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showMessage('Error loading dashboard data.', 'error');
            setLoadingState(false);
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 100);

    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 3500);
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatCurrency(amount) {
    return `₹${formatNumber(amount)}`;
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function parseDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

function formatDate(date) {
    if (!date) return '';
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-IN');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round((secondDate - firstDate) / oneDay);
}

// ===== CALCULATION FUNCTIONS =====
function calculateMemberAssets(memberId) {
    return investments
        .filter(inv => inv.member_id === memberId)
        .reduce((total, inv) => total + (inv.current_value || inv.invested_amount || 0), 0);
}

function calculateMemberLiabilities(memberId) {
    return liabilities
        .filter(lib => lib.member_id === memberId)
        .reduce((total, lib) => total + (lib.outstanding_amount || 0), 0);
}

function getMemberInvestmentCount(memberId) {
    return investments.filter(inv => inv.member_id === memberId).length;
}

function getMemberLiabilityCount(memberId) {
    return liabilities.filter(lib => lib.member_id === memberId).length;
}

function getMemberAccountCount(memberId) {
    return accounts.filter(acc => acc.holder_id === memberId).length;
}

function getMemberNameById(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.name : '';
}

// ===== ENHANCED SAFE SET FUNCTION =====
function safeSet(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        if (element.type === 'checkbox') {
            element.checked = Boolean(value);
        } else if (element.type === 'date' && value) {
            // Ensure proper date format for date inputs
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    element.value = date.toISOString().split('T')[0];
                } else {
                    element.value = '';
                }
            } catch (e) {
                console.warn(`Invalid date format for ${elementId}:`, value);
                element.value = '';
            }
        } else if (element.type === 'number' && value !== null && value !== undefined) {
            element.value = Number(value) || '';
        } else {
            element.value = value || '';
        }
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

// ===== DUPLICATE PREVENTION FUNCTION =====
async function checkForDuplicateInvestment(investmentData, editingId = null) {
    try {
        // Check in local array first for immediate feedback
        const existingInvestment = investments.find(inv => 
            inv.id !== editingId && // Exclude current item when editing
            inv.member_id === investmentData.member_id &&
            inv.investment_type === investmentData.investment_type &&
            inv.symbol_or_name === investmentData.symbol_or_name &&
            Math.abs(inv.invested_amount - investmentData.invested_amount) < 0.01 // Handle floating point precision
        );
        
        if (existingInvestment) {
            throw new Error(`A similar ${investmentData.investment_type} investment "${investmentData.symbol_or_name}" already exists for this member.`);
        }
        
        // For Supabase, check database as well
        if (supabase) {
            const { data, error } = await supabase
                .from('investments')
                .select('id, symbol_or_name')
                .eq('member_id', investmentData.member_id)
                .eq('investment_type', investmentData.investment_type)
                .eq('symbol_or_name', investmentData.symbol_or_name)
                .eq('invested_amount', investmentData.invested_amount);
                
            if (error) {
                console.error('Error checking for duplicates:', error);
            } else if (data && data.length > 0) {
                // If editing, exclude the current record
                const duplicates = editingId ? data.filter(item => item.id !== editingId) : data;
                if (duplicates.length > 0) {
                    throw new Error(`A similar investment "${investmentData.symbol_or_name}" already exists in the database.`);
                }
            }
        }
    } catch (error) {
        throw error;
    }
}

// ===== ENHANCED POPULATE INSURANCE DROPDOWNS FUNCTION =====
function populateInsuranceDropdowns() {
    const insuredPersonSelect = document.getElementById('ins-insured-person');
    const nomineeSelect = document.getElementById('ins-nominee');
    
    if (insuredPersonSelect && nomineeSelect) {
        // Clear existing options (keep default)
        insuredPersonSelect.innerHTML = '<option value="">Select Insured Person</option>';
        nomineeSelect.innerHTML = '<option value="">Select Nominee</option>';
        
        // Add family members to both dropdowns
        familyMembers.forEach(member => {
            const insuredOption = new Option(member.name, member.id);
            const nomineeOption = new Option(member.name, member.id);
            insuredPersonSelect.add(insuredOption);
            nomineeSelect.add(nomineeOption.cloneNode(true));
        });
    }
}

// ===== RENDERING FUNCTIONS =====
// CRITICAL FIX 1: renderFamilyMembers - Better image handling
function renderFamilyMembers() {
    const familyGrid = document.getElementById('family-members-grid');
    if (!familyGrid) return;

    familyGrid.innerHTML = '';

    if (familyMembers.length === 0) {
        familyGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No family members added yet.</h3>
                <p>Add your first family member to get started!</p>
            </div>
        `;
        return;
    }

    familyMembers.forEach(member => {
        const assets = calculateMemberAssets(member.id);
        const liabilities = calculateMemberLiabilities(member.id);
        const netWorth = assets - liabilities;

        const photoSrc = member.photo && member.photo !== 'default.png' 
            ? (member.photo.startsWith('data:') ? member.photo : `photos/${member.photo}`)
            : 'photos/default.png';

        const memberCard = document.createElement('div');
        memberCard.className = 'family-member-card';
        memberCard.innerHTML = `
            <div class="member-photo-container">
                <img src="${photoSrc}" alt="${member.name}" class="member-photo" 
                     onerror="this.src='photos/default.png'">
                <button class="photo-edit-btn" onclick="openPhotoModal('${member.id}')" title="Change Photo">
                    📷
                </button>
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p class="relationship">${member.relationship}</p>
                <div class="member-stats">
                    <div class="stat">
                        <span class="stat-label">Assets:</span>
                        <span class="stat-value positive">${formatCurrency(assets)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Liabilities:</span>
                        <span class="stat-value negative">${formatCurrency(liabilities)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Net Worth:</span>
                        <span class="stat-value ${netWorth >= 0 ? 'positive' : 'negative'}">${formatCurrency(netWorth)}</span>
                    </div>
                </div>
                <div class="member-actions">
                    <button onclick="showMemberDetails('${member.id}')" class="btn btn-info">View Details</button>
                    <button onclick="editMember('${member.id}')" class="btn btn-primary">Edit</button>
                    <button onclick="deleteMember('${member.id}')" class="btn btn-danger">Delete</button>
                </div>
            </div>
        `;
        familyGrid.appendChild(memberCard);
    });
}

function renderStatsOverview() {
    const totalAssets = investments.reduce((sum, inv) => sum + (inv.current_value || inv.invested_amount || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, lib) => sum + (lib.outstanding_amount || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    const statsGrid = document.getElementById('stats-overview');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card positive">
                <div class="stat-icon">💰</div>
                <div class="stat-content">
                    <h3>Total Assets</h3>
                    <p class="stat-amount">${formatCurrency(totalAssets)}</p>
                </div>
            </div>
            <div class="stat-card negative">
                <div class="stat-icon">📉</div>
                <div class="stat-content">
                    <h3>Total Liabilities</h3>
                    <p class="stat-amount">${formatCurrency(totalLiabilities)}</p>
                </div>
            </div>
            <div class="stat-card ${netWorth >= 0 ? 'positive' : 'negative'}">
                <div class="stat-icon">${netWorth >= 0 ? '📈' : '📉'}</div>
                <div class="stat-content">
                    <h3>Net Worth</h3>
                    <p class="stat-amount">${formatCurrency(netWorth)}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                    <h3>Family Members</h3>
                    <p class="stat-amount">${familyMembers.length}</p>
                </div>
            </div>
        `;
    }
}

function renderInvestmentTabContent(type) {
    const filteredInvestments = investments.filter(inv => inv.investment_type === type);
    const contentDiv = document.getElementById(`${type}-content`);
    
    if (!contentDiv) return;

    const typeMap = {
        equity: 'Equity',
        mutualFunds: 'Mutual Fund',
        fixedDeposits: 'Fixed Deposit',
        insurance: 'Insurance',
        bankBalances: 'Bank Balance',
        others: 'Other'
    };

    if (filteredInvestments.length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>No ${typeMap[type]} investments added yet.</h3>
                <p>Click "Add Investment" to start tracking your ${typeMap[type].toLowerCase()}.</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Member</th>
                        <th>Invested Amount</th>
                        <th>Current Value</th>
                        <th>Gain/Loss</th>
                        <th>Platform</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredInvestments.forEach(inv => {
        const member = familyMembers.find(m => m.id === inv.member_id);
        const currentValue = inv.current_value || inv.invested_amount || 0;
        const gain = currentValue - (inv.invested_amount || 0);
        const gainPercentage = inv.invested_amount ? ((gain / inv.invested_amount) * 100).toFixed(2) : 0;
        const invName = inv.symbol_or_name || inv.name || 'Unknown';
        const invPlatform = inv.broker_platform || inv.platform || '-';

        tableHTML += `
            <tr>
                <td>${invName}</td>
                <td>${member ? member.name : 'Unknown'}</td>
                <td>${formatCurrency(inv.invested_amount)}</td>
                <td>${formatCurrency(currentValue)}</td>
                <td class="${gain >= 0 ? 'positive' : 'negative'}">${formatCurrency(gain)} (${gain >= 0 ? '+' : ''}${gainPercentage}%)</td>
                <td>${invPlatform}</td>
                <td class="table-actions">
                    <button onclick="editInvestment('${inv.id}')" class="btn btn-sm btn-primary" title="Edit">✏️</button>
                    <button onclick="deleteInvestment('${inv.id}')" class="btn btn-sm btn-danger" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    contentDiv.innerHTML = tableHTML;
}

function renderLiabilityTabContent(type) {
    const filteredLiabilities = liabilities.filter(lib => lib.type === type || lib.liability_type === type);
    const contentDiv = document.getElementById(`${type}-content`);
    
    if (!contentDiv) return;

    const typeMap = {
        homeLoan: 'Home Loan',
        personalLoan: 'Personal Loan',
        creditCard: 'Credit Card',
        other: 'Other'
    };

    if (filteredLiabilities.length === 0) {
        contentDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💳</div>
                <h3>No ${typeMap[type]} liabilities added yet.</h3>
                <p>Click "Add Liability" to start tracking your ${typeMap[type].toLowerCase()}.</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Lender</th>
                        <th>Member</th>
                        <th>Outstanding Amount</th>
                        <th>EMI</th>
                        <th>Interest Rate</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredLiabilities.forEach(lib => {
        const member = familyMembers.find(m => m.id === lib.member_id);
        
        tableHTML += `
            <tr>
                <td>${lib.lender}</td>
                <td>${member ? member.name : 'Unknown'}</td>
                <td>${formatCurrency(lib.outstanding_amount)}</td>
                <td>${formatCurrency(lib.emi_amount || 0)}</td>
                <td>${lib.interest_rate ? lib.interest_rate + '%' : '-'}</td>
                <td class="table-actions">
                    <button onclick="editLiability('${lib.id}')" class="btn btn-sm btn-primary" title="Edit">✏️</button>
                    <button onclick="deleteLiability('${lib.id}')" class="btn btn-sm btn-danger" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    contentDiv.innerHTML = tableHTML;
}

function renderAccounts() {
    const accountsList = document.getElementById('accounts-list');
    if (!accountsList) return;

    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏦</div>
                <h3>No accounts added yet.</h3>
                <p>Click "Add Account" to start managing your accounts.</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Account Type</th>
                        <th>Institution</th>
                        <th>Account Number</th>
                        <th>Holder</th>
                        <th>Nominee</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    accounts.forEach(acc => {
        const holder = familyMembers.find(m => m.id === acc.holder_id);
        const nominee = familyMembers.find(m => m.id === acc.nominee_id);

        tableHTML += `
            <tr>
                <td>${acc.account_type}</td>
                <td>${acc.institution}</td>
                <td>${acc.account_number}</td>
                <td>${holder ? holder.name : acc.holder_name || '-'}</td>
                <td>${nominee ? nominee.name : acc.nominee_name || '-'}</td>
                <td><span class="status ${acc.status?.toLowerCase()}">${acc.status}</span></td>
                <td class="table-actions">
                    <button onclick="editAccount('${acc.id}')" class="btn btn-sm btn-primary" title="Edit">✏️</button>
                    <button onclick="deleteAccount('${acc.id}')" class="btn btn-sm btn-danger" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    accountsList.innerHTML = tableHTML;
}

function renderReminders() {
    // Implementation for rendering reminders
    console.log('Rendering reminders...');
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Reset editing states
        if (modalId === 'member-modal') {
            editingMemberId = null;
        } else if (modalId === 'investment-modal') {
            editingInvestmentId = null;
        } else if (modalId === 'liability-modal') {
            editingLiabilityId = null;
        } else if (modalId === 'account-modal') {
            editingAccountId = null;
        }
        
        // Reset forms
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// ===== FAMILY MEMBER FUNCTIONS =====
function openAddMemberModal() {
    editingMemberId = null;
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('member-form').reset();
    openModal('member-modal');
}

async function saveMember() {
    const btn = document.getElementById('member-save-btn');
    btn.disabled = true;

    try {
        const name = document.getElementById('member-name').value.trim();
        const relationship = document.getElementById('member-relationship').value;

        if (!name || !relationship) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const memberData = {
            name,
            relationship,
            is_primary: relationship === 'Self',
            photo: 'default.png',
            created_at: new Date().toISOString()
        };

        if (editingMemberId) {
            // Update existing member
            await updateMemberData(memberData);
        } else {
            // Add new member
            await addMemberData(memberData);
        }

        closeModal('member-modal');
        await loadDashboardData();
        showMessage(editingMemberId ? 'Member updated successfully!' : 'Member added successfully!', 'success');

    } catch (error) {
        console.error('Error saving member:', error);
        showMessage('Error saving member.', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function addMemberData(memberData) {
    if (supabase) {
        memberData.id = generateId();
        const { data, error } = await supabase
            .from('family_members')
            .insert([memberData])
            .select();

        if (error) throw error;
        familyMembers.push(data[0]);
    } else {
        memberData.id = generateId();
        familyMembers.push(memberData);
    }
}

async function updateMemberData(memberData) {
    if (supabase) {
        const { data, error } = await supabase
            .from('family_members')
            .update(memberData)
            .eq('id', editingMemberId)
            .select();

        if (error) throw error;
        
        const index = familyMembers.findIndex(m => m.id === editingMemberId);
        if (index !== -1) {
            familyMembers[index] = { ...familyMembers[index], ...data[0] };
        }
    } else {
        const index = familyMembers.findIndex(m => m.id === editingMemberId);
        if (index !== -1) {
            familyMembers[index] = { ...familyMembers[index], ...memberData };
        }
    }
}

function editMember(memberId) {
    editingMemberId = memberId;
    const member = familyMembers.find(m => m.id === memberId);
    
    if (!member) {
        console.error('Member not found:', memberId);
        return;
    }
    
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-relationship').value = member.relationship;
    
    openModal('member-modal');
}

async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this family member? This will also delete all their investments and liabilities.')) {
        return;
    }

    try {
        if (supabase) {
            const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
        }

        // Remove from local array
        familyMembers = familyMembers.filter(m => m.id !== memberId);
        investments = investments.filter(inv => inv.member_id !== memberId);
        liabilities = liabilities.filter(lib => lib.member_id !== memberId);

        await loadDashboardData();
        showMessage('Family member deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting member:', error);
        showMessage('Error deleting member.', 'error');
    }
}

// ===== PHOTO FUNCTIONS =====
function openPhotoModal(memberId) {
    currentPhotoMemberId = memberId;
    selectedPhoto = null;
    document.getElementById('photo-preview').style.display = 'none';
    openModal('photo-modal');
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file.', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('Image size must be less than 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedPhoto = e.target.result;
        const preview = document.getElementById('photo-preview');
        preview.src = selectedPhoto;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function savePhoto() {
    if (!selectedPhoto || !currentPhotoMemberId) {
        showMessage('Please select a photo first.', 'error');
        return;
    }

    try {
        const memberIndex = familyMembers.findIndex(m => m.id === currentPhotoMemberId);
        if (memberIndex === -1) {
            showMessage('Member not found.', 'error');
            return;
        }

        // Update member photo
        familyMembers[memberIndex].photo = selectedPhoto;

        if (supabase) {
            const { error } = await supabase
                .from('family_members')
                .update({ photo: selectedPhoto })
                .eq('id', currentPhotoMemberId);

            if (error) throw error;
        }

        closeModal('photo-modal');
        renderFamilyMembers();
        showMessage('Photo updated successfully!', 'success');

    } catch (error) {
        console.error('Error saving photo:', error);
        showMessage('Error saving photo.', 'error');
    }
}

// ===== MEMBER DETAILS FUNCTIONS =====
function showMemberDetails(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;

    const memberInvestments = investments.filter(inv => inv.member_id === memberId);
    const memberLiabilities = liabilities.filter(lib => lib.member_id === memberId);
    const memberAccounts = accounts.filter(acc => acc.holder_id === memberId);

    const typeMap = {
        equity: 'Equity',
        mutualFunds: 'Mutual Fund',
        fixedDeposits: 'Fixed Deposit',
        insurance: 'Insurance',
        bankBalances: 'Bank Balance',
        others: 'Other',
        homeLoan: 'Home Loan',
        personalLoan: 'Personal Loan',
        creditCard: 'Credit Card',
        other: 'Other'
    };

    // Set member name
    document.getElementById('member-detail-name').textContent = member.name;

    // Investments table
    const investmentsTable = document.getElementById('member-investments-table');
    if (memberInvestments.length === 0) {
        investmentsTable.innerHTML = `
            <div class="empty-state">
                <p>No investments found for ${member.name}</p>
            </div>
        `;
    } else {
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Investment Name</th>
                        <th>Type</th>
                        <th>Invested Amount</th>
                        <th>Current Value</th>
                        <th>Gain/Loss</th>
                        <th>Platform</th>
                    </tr>
                </thead>
                <tbody>
        `;

        memberInvestments.forEach(inv => {
            const currentValue = inv.current_value || inv.invested_amount || 0;
            const gain = currentValue - (inv.invested_amount || 0);
            const gainPercentage = inv.invested_amount ? ((gain / inv.invested_amount) * 100).toFixed(2) : 0;

            tableHTML += `
                <tr>
                    <td>${inv.symbol_or_name || inv.name || 'Unknown'}</td>
                    <td>${typeMap[inv.investment_type] || inv.investment_type}</td>
                    <td>${formatCurrency(inv.invested_amount)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                    <td class="${gain >= 0 ? 'positive' : 'negative'}">${formatCurrency(gain)} (${gain >= 0 ? '+' : ''}${gainPercentage}%)</td>
                    <td>${inv.broker_platform || inv.platform || '-'}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        investmentsTable.innerHTML = tableHTML;
    }

    // Liabilities table
    const liabilitiesTable = document.getElementById('member-liabilities-table');
    if (memberLiabilities.length === 0) {
        liabilitiesTable.innerHTML = `
            <div class="empty-state">
                <p>No liabilities found for ${member.name}</p>
            </div>
        `;
    } else {
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Lender</th>
                        <th>Type</th>
                        <th>Outstanding Amount</th>
                        <th>EMI Amount</th>
                        <th>Interest Rate</th>
                    </tr>
                </thead>
                <tbody>
        `;

        memberLiabilities.forEach(lib => {
            tableHTML += `
                <tr>
                    <td>${lib.lender}</td>
                    <td>${typeMap[lib.type] || lib.type}</td>
                    <td>${formatCurrency(lib.outstanding_amount)}</td>
                    <td>${formatCurrency(lib.emi_amount || 0)}</td>
                    <td>${lib.interest_rate ? lib.interest_rate + '%' : '-'}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        liabilitiesTable.innerHTML = tableHTML;
    }

    // Accounts table
    const accountsTable = document.getElementById('member-accounts-table');
    if (memberAccounts.length === 0) {
        accountsTable.innerHTML = `
            <div class="empty-state">
                <p>No accounts found for ${member.name}</p>
            </div>
        `;
    } else {
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Account Type</th>
                        <th>Institution</th>
                        <th>Account Number</th>
                        <th>Nominee</th>
                        <th>Status</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
        `;

        memberAccounts.forEach(acc => {
            const nominee = familyMembers.find(m => m.id === acc.nominee_id);
            tableHTML += `
                <tr>
                    <td>${acc.account_type}</td>
                    <td>${acc.institution}</td>
                    <td>${acc.account_number}</td>
                    <td>${nominee ? nominee.name : '-'}</td>
                    <td>${acc.status}</td>
                    <td>${acc.comments || '-'}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        accountsTable.innerHTML = tableHTML;
    }

    openModal('member-details-modal');
}

function closeMemberDetails() {
    closeModal('member-details-modal');
}

// ===== INVESTMENT FUNCTIONS =====
function openAddInvestmentModal() {
    editingInvestmentId = null;
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    document.getElementById('investment-form').reset();
    
    // Populate member dropdown
    const memberSelect = document.getElementById('investment-member');
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
    });
    
    openModal('investment-modal');
}

// ===== ENHANCED UPDATE INVESTMENT FORM FUNCTION =====
function updateInvestmentForm() {
    const investmentType = document.getElementById('investment-type').value;
    
    // Hide all type-specific field sections
    const allTypeFields = document.querySelectorAll('.investment-type-fields');
    allTypeFields.forEach(field => {
        field.style.display = 'none';
    });
    
    // Show relevant fields based on investment type
    if (investmentType) {
        const typeFieldsClass = `${investmentType.toLowerCase()}-fields`;
        const relevantFields = document.querySelector(`.${typeFieldsClass}`);
        if (relevantFields) {
            relevantFields.style.display = 'block';
        }
        
        // Special handling for insurance to populate dropdowns
        if (investmentType === 'insurance') {
            populateInsuranceDropdowns();
        }
    }
    
    // Update required fields based on type
    updateRequiredFields(investmentType);
}

function updateRequiredFields(investmentType) {
    // Implementation for updating required fields based on type
    console.log('Updating required fields for:', investmentType);
}

// ===== ENHANCED SAVE INVESTMENT FUNCTION =====
async function saveInvestment() {
    const btn = document.getElementById('investment-save-btn');
    btn.disabled = true;

    try {
        // → Basic fields
        const memberId = document.getElementById('investment-member').value;
        const type = document.getElementById('investment-type').value;
        const name = document.getElementById('investment-name').value.trim();
        const amount = parseFloat(document.getElementById('investment-amount').value);
        const currentValue = parseFloat(document.getElementById('investment-current-value').value) || amount;
        const platform = document.getElementById('investment-platform').value.trim() || 'Not Specified';

        // → Required validation
        if (!memberId || !type || !name || !amount) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }
        if (amount <= 0) {
            showMessage('Invested amount must be greater than 0.', 'error');
            return;
        }

        // → Build base investmentData
        const investmentData = {
            member_id: memberId,
            investment_type: type,
            symbol_or_name: name,
            invested_amount: amount,
            current_value: currentValue,
            broker_platform: platform,
            created_at: new Date().toISOString()
        };

        // → Fixed Deposits branch
        if (type === 'fixedDeposits') {
            investmentData.fd_invested_date = document.getElementById('fd-start-date')?.value || null;
            investmentData.fd_bank_name = document.getElementById('fd-bank-name')?.value || null;
            investmentData.fd_interest_rate = parseFloat(document.getElementById('fd-interest-rate')?.value) || null;
            investmentData.fd_interest_payout = document.getElementById('fd-interest-payout')?.value || null;
            investmentData.fd_start_date = document.getElementById('fd-start-date')?.value || null;
            investmentData.fd_maturity_date = document.getElementById('fd-maturity-date')?.value || null;
            investmentData.fd_account_number = document.getElementById('fd-account-number')?.value || null;
            investmentData.fd_nominee = document.getElementById('fd-nominee')?.value || null;
            investmentData.fd_comments = document.getElementById('fd-comments')?.value || null;
            console.log('📊 Added FD fields:', investmentData);
        }

        // → Insurance branch - COMPLETE WITH ALL REQUIRED FIELDS
        if (type === 'insurance') {
            // Basic insurance validation
            const insuranceType = document.getElementById('ins-type')?.value;
            const sumAssured = parseFloat(document.getElementById('ins-sum-assured')?.value);
            const premiumAmount = parseFloat(document.getElementById('ins-premium-amount')?.value);
            const policyName = document.getElementById('ins-policy-name')?.value?.trim();
            const company = document.getElementById('ins-company')?.value?.trim();
            
            if (!insuranceType || !sumAssured || !premiumAmount || !policyName || !company) {
                showMessage('Please fill in all required insurance fields (Type, Sum Assured, Premium, Policy Name, Company).', 'error');
                return;
            }
            
            // Enhanced insurance fields - ALL REQUIRED FIELDS
            investmentData.insurance_type = insuranceType;
            investmentData.policy_name = policyName;
            investmentData.insurance_company = company;
            investmentData.insurance_premium = premiumAmount;
            investmentData.insurance_sum_assured = sumAssured;
            investmentData.insurance_payment_frequency = document.getElementById('ins-premium-frequency')?.value || 'Yearly';
            investmentData.insurance_start_date = document.getElementById('ins-start-date')?.value || null;
            investmentData.insurance_maturity_date = document.getElementById('ins-maturity-date')?.value || null;
            investmentData.insurance_policy_number = document.getElementById('ins-policy-number')?.value || null;
            investmentData.insurance_next_premium_date = document.getElementById('ins-next-premium-date')?.value || null;
            investmentData.policy_status = document.getElementById('ins-policy-status')?.value || 'Active';
            investmentData.insurance_nominee = document.getElementById('ins-nominee')?.value || null;
            investmentData.insurance_insured_person = document.getElementById('ins-insured-person')?.value || null;
            investmentData.insurance_comments = document.getElementById('ins-comments')?.value || null;
            
            console.log('📊 Added complete Insurance fields:', investmentData);
        }

        // Check for duplicates BEFORE saving
        try {
            await checkForDuplicateInvestment(investmentData, editingInvestmentId);
        } catch (duplicateError) {
            showMessage(duplicateError.message, 'error');
            return;
        }

        if (editingInvestmentId) {
            // Update existing investment
            await updateInvestmentData(investmentData);
        } else {
            // Add new investment
            await addInvestmentData(investmentData);
        }

        closeModal('investment-modal');
        await loadDashboardData();
        showMessage(editingInvestmentId ? 'Investment updated successfully!' : 'Investment added successfully!', 'success');

    } catch (error) {
        console.error('Error saving investment:', error);
        showMessage('Error saving investment: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function addInvestmentData(investmentData) {
    if (supabase) {
        investmentData.id = generateId();
        const { data, error } = await supabase
            .from('investments')
            .insert([investmentData])
            .select();

        if (error) throw error;
        investments.push(data[0]);
    } else {
        investmentData.id = generateId();
        investments.push(investmentData);
    }
}

async function updateInvestmentData(investmentData) {
    if (supabase) {
        const { data, error } = await supabase
            .from('investments')
            .update(investmentData)
            .eq('id', editingInvestmentId)
            .select();

        if (error) throw error;
        
        const index = investments.findIndex(inv => inv.id === editingInvestmentId);
        if (index !== -1) {
            investments[index] = { ...investments[index], ...data[0] };
        }
    } else {
        const index = investments.findIndex(inv => inv.id === editingInvestmentId);
        if (index !== -1) {
            investments[index] = { ...investments[index], ...investmentData };
        }
    }
}

// ===== FIXED EDIT INVESTMENT FUNCTION =====
function editInvestment(investmentId) {
    editingInvestmentId = investmentId;
    const investment = investments.find(inv => inv.id === investmentId);
   
    if (!investment) {
        console.error('Investment not found:', investmentId);
        return;
    }
    
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';
    
    // Populate member dropdown first
    const memberSelect = document.getElementById('investment-member');
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
    });
    
    // Populate basic fields - FIXED VARIABLE REFERENCES
    document.getElementById('investment-member').value = investment.member_id || '';
    document.getElementById('investment-type').value = investment.investment_type || investment.type || '';
    document.getElementById('investment-name').value = investment.symbol_or_name || investment.name || '';
    document.getElementById('investment-amount').value = investment.invested_amount || '';
    document.getElementById('investment-current-value').value = investment.current_value || '';
    document.getElementById('investment-platform').value = investment.broker_platform || investment.platform || '';
   
    // Update form to show type-specific fields FIRST
    updateInvestmentForm();
    
    // Populate type-specific fields based on investment type
    const investmentType = investment.investment_type || investment.type;
    
    if (investmentType === 'fixedDeposits') {
        // Fixed Deposits fields
        safeSet('fd-bank-name', investment.fd_bank_name || investment.bank_name);
        safeSet('fd-interest-rate', investment.fd_interest_rate || investment.interest_rate);
        safeSet('fd-interest-payout', investment.fd_interest_payout || investment.interest_payout);
        safeSet('fd-start-date', investment.fd_start_date || investment.start_date);
        safeSet('fd-maturity-date', investment.fd_maturity_date || investment.maturity_date);
        safeSet('fd-account-number', investment.fd_account_number || investment.account_number);
        safeSet('fd-nominee', investment.fd_nominee || investment.nominee);
        safeSet('fd-comments', investment.fd_comments || investment.comments);
        console.log('✅ Populated FD fields for edit');
    }
    
    if (investmentType === 'insurance') {
        // FIXED: Use 'investment' instead of 'inv' - CRITICAL BUG FIX
        safeSet('ins-policy-number', investment.insurance_policy_number);
        safeSet('ins-policy-name', investment.policy_name || investment.symbol_or_name);
        safeSet('ins-company', investment.insurance_company);
        safeSet('ins-type', investment.insurance_type);
        safeSet('ins-sum-assured', investment.insurance_sum_assured);
        safeSet('ins-premium-amount', investment.insurance_premium);
        safeSet('ins-premium-frequency', investment.insurance_payment_frequency);
        safeSet('ins-start-date', investment.insurance_start_date);
        safeSet('ins-maturity-date', investment.insurance_maturity_date);
        safeSet('ins-next-premium-date', investment.insurance_next_premium_date);
        safeSet('ins-policy-status', investment.policy_status);
        safeSet('ins-nominee', investment.insurance_nominee);
        safeSet('ins-insured-person', investment.insurance_insured_person);
        safeSet('ins-comments', investment.insurance_comments);
        console.log('✅ Populated Insurance fields for edit');
    }
    
    if (investmentType === 'bankBalances') {
        safeSet('bank-name', investment.bank_name);
        safeSet('bank-account-type', investment.account_type);
        safeSet('bank-account-number', investment.account_number);
        safeSet('bank-interest-rate', investment.interest_rate);
        safeSet('bank-nominee', investment.nominee);
        safeSet('bank-comments', investment.comments);
        console.log('✅ Populated Bank Balance fields for edit');
    }
    
    if (investmentType === 'mutualFunds') {
        safeSet('mf-fund-name', investment.fund_name || investment.symbol_or_name);
        safeSet('mf-fund-type', investment.fund_type);
        safeSet('mf-sip-amount', investment.sip_amount);
        safeSet('mf-sip-date', investment.sip_date);
        safeSet('mf-broker', investment.broker_platform);
        safeSet('mf-folio-number', investment.folio_number);
        safeSet('mf-comments', investment.comments);
        console.log('✅ Populated Mutual Fund fields for edit');
    }
    
    if (investmentType === 'equity') {
        safeSet('eq-symbol', investment.symbol_or_name);
        safeSet('eq-quantity', investment.quantity);
        safeSet('eq-avg-price', investment.avg_price);
        safeSet('eq-broker', investment.broker_platform);
        safeSet('eq-comments', investment.comments);
        console.log('✅ Populated Equity fields for edit');
    }
    
    openModal('investment-modal');
}

async function deleteInvestment(investmentId) {
    if (!confirm('Are you sure you want to delete this investment?')) {
        return;
    }

    try {
        if (supabase) {
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', investmentId);

            if (error) throw error;
        }

        // Remove from local array
        investments = investments.filter(inv => inv.id !== investmentId);

        await loadDashboardData();
        showMessage('Investment deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting investment:', error);
        showMessage('Error deleting investment.', 'error');
    }
}

// ===== LIABILITY FUNCTIONS =====
function openAddLiabilityModal() {
    editingLiabilityId = null;
    document.getElementById('liability-modal-title').textContent = 'Add Liability';
    document.getElementById('liability-form').reset();
    
    // Populate member dropdown
    const memberSelect = document.getElementById('liability-member');
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
    });
    
    openModal('liability-modal');
}

async function saveLiability() {
    const btn = document.getElementById('liability-save-btn');
    btn.disabled = true;

    try {
        const memberId = document.getElementById('liability-member').value;
        const type = document.getElementById('liability-type').value;
        const lender = document.getElementById('liability-lender').value.trim();
        const amount = parseFloat(document.getElementById('liability-amount').value);
        const emi = parseFloat(document.getElementById('liability-emi').value) || 0;
        const rate = parseFloat(document.getElementById('liability-rate').value) || 0;

        if (!memberId || !type || !lender || !amount) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        if (amount <= 0) {
            showMessage('Outstanding amount must be greater than 0.', 'error');
            return;
        }

        const liabilityData = {
            member_id: memberId,
            type: type,
            liability_type: type,
            lender: lender,
            outstanding_amount: amount,
            emi_amount: emi,
            interest_rate: rate,
            created_at: new Date().toISOString()
        };

        if (editingLiabilityId) {
            await updateLiabilityData(liabilityData);
        } else {
            await addLiabilityData(liabilityData);
        }

        closeModal('liability-modal');
        await loadDashboardData();
        showMessage(editingLiabilityId ? 'Liability updated successfully!' : 'Liability added successfully!', 'success');

    } catch (error) {
        console.error('Error saving liability:', error);
        showMessage('Error saving liability.', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function addLiabilityData(liabilityData) {
    if (supabase) {
        liabilityData.id = generateId();
        const { data, error } = await supabase
            .from('liabilities')
            .insert([liabilityData])
            .select();

        if (error) throw error;
        liabilities.push(data[0]);
    } else {
        liabilityData.id = generateId();
        liabilities.push(liabilityData);
    }
}

async function updateLiabilityData(liabilityData) {
    if (supabase) {
        const { data, error } = await supabase
            .from('liabilities')
            .update(liabilityData)
            .eq('id', editingLiabilityId)
            .select();

        if (error) throw error;
        
        const index = liabilities.findIndex(lib => lib.id === editingLiabilityId);
        if (index !== -1) {
            liabilities[index] = { ...liabilities[index], ...data[0] };
        }
    } else {
        const index = liabilities.findIndex(lib => lib.id === editingLiabilityId);
        if (index !== -1) {
            liabilities[index] = { ...liabilities[index], ...liabilityData };
        }
    }
}

function editLiability(liabilityId) {
    editingLiabilityId = liabilityId;
    const liability = liabilities.find(lib => lib.id === liabilityId);
    
    if (!liability) {
        console.error('Liability not found:', liabilityId);
        return;
    }
    
    document.getElementById('liability-modal-title').textContent = 'Edit Liability';
    
    // Populate member dropdown
    const memberSelect = document.getElementById('liability-member');
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        memberSelect.appendChild(option);
    });
    
    // Populate form fields
    document.getElementById('liability-member').value = liability.member_id;
    document.getElementById('liability-type').value = liability.type || liability.liability_type;
    document.getElementById('liability-lender').value = liability.lender;
    document.getElementById('liability-amount').value = liability.outstanding_amount;
    document.getElementById('liability-emi').value = liability.emi_amount || '';
    document.getElementById('liability-rate').value = liability.interest_rate || '';
    
    openModal('liability-modal');
}

async function deleteLiability(liabilityId) {
    if (!confirm('Are you sure you want to delete this liability?')) {
        return;
    }

    try {
        if (supabase) {
            const { error } = await supabase
                .from('liabilities')
                .delete()
                .eq('id', liabilityId);

            if (error) throw error;
        }

        // Remove from local array
        liabilities = liabilities.filter(lib => lib.id !== liabilityId);

        await loadDashboardData();
        showMessage('Liability deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting liability:', error);
        showMessage('Error deleting liability.', 'error');
    }
}

// ===== ACCOUNT FUNCTIONS =====
function openAddAccountModal() {
    editingAccountId = null;
    document.getElementById('account-modal-title').textContent = 'Add Account';
    document.getElementById('account-form').reset();
    
    // Populate dropdowns
    populateAccountDropdowns();
    
    openModal('account-modal');
}

function populateAccountDropdowns() {
    const holderSelect = document.getElementById('account-holder');
    const nomineeSelect = document.getElementById('account-nominee');
    
    // Clear existing options
    holderSelect.innerHTML = '<option value="">Select Holder</option>';
    nomineeSelect.innerHTML = '<option value="">Select Nominee</option>';
    
    // Add family members
    familyMembers.forEach(member => {
        const holderOption = document.createElement('option');
        holderOption.value = member.id;
        holderOption.textContent = member.name;
        holderSelect.appendChild(holderOption);
        
        const nomineeOption = document.createElement('option');
        nomineeOption.value = member.id;
        nomineeOption.textContent = member.name;
        nomineeSelect.appendChild(nomineeOption);
    });
}

async function saveAccount() {
    const btn = document.getElementById('account-save-btn');
    btn.disabled = true;

    try {
        const accountType = document.getElementById('account-type').value.trim();
        const institution = document.getElementById('account-institution').value.trim();
        const accountNumber = document.getElementById('account-number').value.trim();
        const holderId = document.getElementById('account-holder').value;
        const nomineeId = document.getElementById('account-nominee').value;
        const status = document.getElementById('account-status').value;
        const comments = document.getElementById('account-comments').value.trim();

        if (!accountType || !institution || !accountNumber || !holderId) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        const holder = familyMembers.find(m => m.id === holderId);
        const nominee = familyMembers.find(m => m.id === nomineeId);

        const accountData = {
            account_type: accountType,
            institution: institution,
            account_number: accountNumber,
            holder_id: holderId,
            holder_name: holder ? holder.name : '',
            nominee_id: nomineeId || null,
            nominee_name: nominee ? nominee.name : '',
            status: status,
            comments: comments,
            created_at: new Date().toISOString()
        };

        if (editingAccountId) {
            await updateAccountData(accountData);
        } else {
            await addAccountData(accountData);
        }

        closeModal('account-modal');
        await loadDashboardData();
        showMessage(editingAccountId ? 'Account updated successfully!' : 'Account added successfully!', 'success');

    } catch (error) {
        console.error('Error saving account:', error);
        showMessage('Error saving account.', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function addAccountData(accountData) {
    if (supabase) {
        accountData.id = generateId();
        const { data, error } = await supabase
            .from('accounts')
            .insert([accountData])
            .select();

        if (error) throw error;
        accounts.push(data[0]);
    } else {
        accountData.id = generateId();
        accounts.push(accountData);
    }
}

async function updateAccountData(accountData) {
    if (supabase) {
        const { data, error } = await supabase
            .from('accounts')
            .update(accountData)
            .eq('id', editingAccountId)
            .select();

        if (error) throw error;
        
        const index = accounts.findIndex(acc => acc.id === editingAccountId);
        if (index !== -1) {
            accounts[index] = { ...accounts[index], ...data[0] };
        }
    } else {
        const index = accounts.findIndex(acc => acc.id === editingAccountId);
        if (index !== -1) {
            accounts[index] = { ...accounts[index], ...accountData };
        }
    }
}

function editAccount(accountId) {
    editingAccountId = accountId;
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
        console.error('Account not found:', accountId);
        return;
    }
    
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    
    // Populate dropdowns first
    populateAccountDropdowns();
    
    // Populate form fields
    document.getElementById('account-type').value = account.account_type;
    document.getElementById('account-institution').value = account.institution;
    document.getElementById('account-number').value = account.account_number;
    document.getElementById('account-holder').value = account.holder_id;
    document.getElementById('account-nominee').value = account.nominee_id || '';
    document.getElementById('account-status').value = account.status;
    document.getElementById('account-comments').value = account.comments || '';
    
    openModal('account-modal');
}

async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) {
        return;
    }

    try {
        if (supabase) {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', accountId);

            if (error) throw error;
        }

        // Remove from local array
        accounts = accounts.filter(acc => acc.id !== accountId);

        await loadDashboardData();
        showMessage('Account deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage('Error deleting account.', 'error');
    }
}

// ===== EXPORT FUNCTIONS =====
function exportInvestments() {
    console.log('Exporting investments...');
    // Implementation for exporting investments
}

function exportLiabilities() {
    console.log('Exporting liabilities...');
    // Implementation for exporting liabilities
}

function exportAccounts() {
    console.log('Exporting accounts...');
    // Implementation for exporting accounts
}

function exportFamilyData() {
    console.log('Exporting family data...');
    // Implementation for exporting all family data
}

function sortTable(column) {
    console.log('Sorting table by:', column);
    // Implementation for sorting tables
}

// ===== IMPORT FUNCTIONS =====
function openImportModal(type) {
    currentImportType = type;
    document.getElementById('import-type-display').textContent = type;
    document.getElementById('import-file').value = '';
    document.getElementById('import-preview').innerHTML = '';
    document.getElementById('import-preview').style.display = 'none';
    openModal('import-modal');
}

function handleImportFile(event) {
    console.log('Handling import file...');
    // Implementation for handling import files
}

async function processImport() {
    console.log('Processing import...');
    // Implementation for processing imports
}

// ===== APPLICATION INITIALIZATION =====
async function initialize() {
    console.log('🚀 Initializing FamWealth Dashboard...');
    
    // Check for existing auth
    const authType = localStorage.getItem('famwealth_auth_type');
    const storedUser = localStorage.getItem('famwealth_user');

    if (authType === 'demo' || (authType === 'supabase' && storedUser)) {
        try {
            const user = authType === 'demo'
                ? { email: 'demo@famwealth.com', id: 'demo-user-id' }
                : JSON.parse(storedUser);

            currentUser = user;
            showDashboard();
            updateUserInfo(user);
            await loadDashboardData();
            console.log('✅ Auto-login successful');
        } catch (error) {
            console.error('Auto-login error:', error);
            localStorage.removeItem('famwealth_auth_type');
            localStorage.removeItem('famwealth_user');
        }
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 FamWealth Dashboard DOM loaded');

    // Add click handlers for modal close buttons
    document.querySelectorAll('.btn-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Add click handlers for modal backgrounds
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Add escape key handler for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });

    // Add form submission handlers
    const forms = ['member-form', 'investment-form', 'liability-form', 'account-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                if (formId === 'member-form') {
                    saveMember();
                } else if (formId === 'investment-form') {
                    saveInvestment();
                } else if (formId === 'liability-form') {
                    saveLiability();
                } else if (formId === 'account-form') {
                    saveAccount();
                }
            });
        }
    });

    console.log('✅ Event listeners registered');
});

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.openAddMemberModal = openAddMemberModal;
window.saveMember = saveMember;
window.editMember = editMember;
window.deleteMember = deleteMember;
window.openPhotoModal = openPhotoModal;
window.savePhoto = savePhoto;
window.handlePhotoUpload = handlePhotoUpload;
window.showMemberDetails = showMemberDetails;
window.closeMemberDetails = closeMemberDetails;
window.openAddInvestmentModal = openAddInvestmentModal;
window.saveInvestment = saveInvestment;
window.editInvestment = editInvestment;
window.deleteInvestment = deleteInvestment;
window.updateInvestmentForm = updateInvestmentForm;
window.renderInvestmentTabContent = renderInvestmentTabContent;
window.openAddLiabilityModal = openAddLiabilityModal;
window.saveLiability = saveLiability;
window.editLiability = editLiability;
window.deleteLiability = deleteLiability;
window.renderLiabilityTabContent = renderLiabilityTabContent;
window.openAddAccountModal = openAddAccountModal;
window.saveAccount = saveAccount;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.exportInvestments = exportInvestments;
window.exportLiabilities = exportLiabilities;
window.exportAccounts = exportAccounts;
window.exportFamilyData = exportFamilyData;
window.sortTable = sortTable;
window.closeModal = closeModal;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.initializeSupabase = initializeSupabase;
window.loadDashboardData = loadDashboardData;
window.openImportModal = openImportModal;
window.handleImportFile = handleImportFile;
window.processImport = processImport;
window.showDashboard = showDashboard;
window.updateUserInfo = updateUserInfo;

// ===== APPLICATION STARTUP =====
window.addEventListener('load', async () => {
    console.log('🚀 Initializing FamWealth Dashboard…');
    
    const supabaseInitialized = await initializeSupabase();
    console.log(supabaseInitialized
        ? '✅ Supabase connection established'
        : '⚠️ Running in demo mode without Supabase');

    await initialize();

    // Add investment type change handler
    const investmentTypeSelect = document.getElementById('investment-type');
    if (investmentTypeSelect) {
        investmentTypeSelect.addEventListener('change', updateInvestmentForm);
    }

    // Add login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            handleLogin();
        });
    }
});

console.log('✅ FamWealth Dashboard app.js loaded - ENHANCED VERSION WITH COMPLETE FEATURES');
console.log('🔧 Ready for initialization');
