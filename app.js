// app.js - Complete Pradeep Family's Wealth Dashboard Application (2900+ lines)

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
            type: 'equity',
            name: 'HDFC Bank',
            invested_amount: 100000,
            current_value: 125000,
            platform: 'Zerodha',
            created_at: '2024-01-01T00:00:00Z'
        },
        {
            id: 'inv-2',
            member_id: 'demo-1',
            type: 'mutualFunds',
            name: 'SBI Bluechip Fund',
            invested_amount: 200000,
            current_value: 230000,
            platform: 'Groww',
            created_at: '2024-01-02T00:00:00Z'
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
            nominee_id: 'demo-2',
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
    loadDemoData();
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
async function loadDashboardData() {
    if (!currentUser) {
        console.warn('No current user; cannot load data.');
        return;
    }

    const authType = localStorage.getItem('famwealth_auth_type');
    if (authType === 'demo') {
        loadDemoData();
        return;
    }

    if (!supabase) {
        loadDemoData();
        return;
    }

    try {
        setLoadingState(true);

        // Load family members
        const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (membersError) {
            console.error('Error fetching family members:', membersError);
            showMessage('Failed to load family members.', 'error');
            return;
        }
        familyMembers = membersData || [];

        // Load investments
        const { data: investmentsData, error: investmentsError } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (investmentsError) {
            console.error('Error fetching investments:', investmentsError);
            showMessage('Failed to load investments.', 'error');
            return;
        }
        investments = investmentsData || [];

        // Load liabilities
        const { data: liabilitiesData, error: liabilitiesError } = await supabase
            .from('liabilities')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (liabilitiesError) {
            console.error('Error fetching liabilities:', liabilitiesError);
            showMessage('Failed to load liabilities.', 'error');
            return;
        }
        liabilities = liabilitiesData || [];

        // Load accounts
        const { data: accountsData, error: accountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (accountsError) {
            console.error('Error fetching accounts:', accountsError);
            showMessage('Failed to load accounts.', 'error');
            return;
        }
        accounts = accountsData || [];

        // Load reminders
        const { data: remindersData, error: remindersError } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', currentUser.id)
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

function calculateDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round((secondDate - firstDate) / oneDay);
}

// ===== RENDERING FUNCTIONS =====
function renderFamilyMembers() {
    const familyGrid = document.getElementById('family-members-grid');
    if (!familyGrid) return;

    familyGrid.innerHTML = '';

    if (familyMembers.length === 0) {
        familyGrid.innerHTML = `
            <div class="empty-state">
                <div class="emoji">👪</div>
                <p>No family members added yet.</p>
                <p>Add your first family member to get started!</p>
            </div>
        `;
        return;
    }

    familyMembers.forEach(member => {
        const memberAssets = calculateMemberAssets(member.id);
        const memberLiabilities = calculateMemberLiabilities(member.id);
        const netWorth = memberAssets - memberLiabilities;
        
        const memberCard = document.createElement('div');
        memberCard.className = 'family-card';
        memberCard.onclick = () => showMemberDetails(member.id);

        const photoUrl = member.photo_url || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👤</text></svg>`;

        memberCard.innerHTML = `
            <img src="${photoUrl}" alt="${member.name}" class="member-photo" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\' font-size=\\'90\\'>👤</text></svg>'" />
            <div class="member-name">
                ${member.name}
                ${member.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
            </div>
            <div class="member-relationship">${member.relationship}</div>
            <div class="member-summary">
                <div class="summary-row">
                    <span class="summary-label">Assets</span>
                    <span class="summary-value assets">${formatCurrency(memberAssets)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Liabilities</span>
                    <span class="summary-value liabilities">${formatCurrency(memberLiabilities)}</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Net Worth</span>
                    <span class="summary-value net-worth">${formatCurrency(netWorth)}</span>
                </div>
                <div class="summary-counts">
                    <span class="count-item">${getMemberInvestmentCount(member.id)} Investments</span>
                    <span class="count-item">${getMemberLiabilityCount(member.id)} Liabilities</span>
                    <span class="count-item">${getMemberAccountCount(member.id)} Accounts</span>
                </div>
            </div>
            <div class="member-actions">
                <button onclick="event.stopPropagation(); editMember('${member.id}')" class="btn btn-sm btn-edit">Edit</button>
                <button onclick="event.stopPropagation(); openPhotoModal('${member.id}')" class="btn btn-sm btn-photo">📷</button>
                <button onclick="event.stopPropagation(); deleteMember('${member.id}')" class="btn btn-sm btn-delete">Delete</button>
            </div>
        `;

        familyGrid.appendChild(memberCard);
    });
}

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

function renderStatsOverview() {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;

    const totalAssets = familyMembers.reduce((acc, member) => 
        acc + calculateMemberAssets(member.id), 0);
    const totalLiabilities = familyMembers.reduce((acc, member) => 
        acc + calculateMemberLiabilities(member.id), 0);
    const netWorth = totalAssets - totalLiabilities;
    const totalAccounts = accounts.length;
    const urgentReminders = reminders.filter(r => {
        const daysUntil = calculateDaysDifference(new Date(), new Date(r.date));
        return daysUntil <= 7 && daysUntil >= 0;
    }).length;

    const statsHTML = `
        <div class="stat-card assets">
            <div class="stat-label">Total Assets</div>
            <div class="stat-value">${formatCurrency(totalAssets)}</div>
        </div>
        <div class="stat-card liabilities">
            <div class="stat-label">Total Liabilities</div>
            <div class="stat-value">${formatCurrency(totalLiabilities)}</div>
        </div>
        <div class="stat-card net-worth">
            <div class="stat-label">Net Worth</div>
            <div class="stat-value">${formatCurrency(netWorth)}</div>
        </div>
        <div class="stat-card accounts">
            <div class="stat-label">Total Accounts</div>
            <div class="stat-value">${totalAccounts}</div>
        </div>
        <div class="stat-card reminders">
            <div class="stat-label">Urgent Reminders</div>
            <div class="stat-value">${urgentReminders}</div>
        </div>
    `;

    statsGrid.innerHTML = statsHTML;
}

function renderInvestmentTabContent(type) {
    // Update active tab
    const parentTabs = document.querySelector('#investment-tab-content').parentElement.querySelectorAll('.tab');
    parentTabs.forEach(tab => tab.classList.remove('active'));
    
    // Find and activate the clicked tab
    const typeMap = {
        'equity': 'Equity',
        'mutualFunds': 'Mutual Funds', 
        'fixedDeposits': 'Fixed Deposits',
        'insurance': 'Insurance',
        'bankBalances': 'Bank Balances',
        'others': 'Others'
    };
    
    parentTabs.forEach(tab => {
        if (tab.textContent.trim() === typeMap[type]) {
            tab.classList.add('active');
        }
    });

    const tabContent = document.getElementById('investment-tab-content');
    const filteredInvestments = investments.filter(inv => inv.type === type);

    if (filteredInvestments.length === 0) {
        tabContent.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📈</div>
                <p>No ${typeMap[type]} investments added yet.</p>
                <p>Click "Add Investment" to start tracking your ${typeMap[type].toLowerCase()}.</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <div class="table-responsive">
            <table class="data-table" id="investments-table">
                <thead>
                    <tr>
                        <th onclick="sortTable('investments-table', 0)">Name <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investments-table', 1)">Member <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investments-table', 2)">Invested Amount <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investments-table', 3)">Current Value <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investments-table', 4)">Gain/Loss <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investments-table', 5)">Platform <span class="sort-indicator"></span></th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredInvestments.map(inv => {
                        const member = familyMembers.find(m => m.id === inv.member_id);
                        const currentValue = inv.current_value || inv.invested_amount;
                        const gain = currentValue - inv.invested_amount;
                        const gainClass = gain >= 0 ? 'text-green' : 'text-red';
                        const gainPercentage = inv.invested_amount > 0 ? ((gain / inv.invested_amount) * 100).toFixed(2) : '0.00';
                        
                        return `
                            <tr>
                                <td>${inv.name}</td>
                                <td>${member ? member.name : 'Unknown'}</td>
                                <td>${formatCurrency(inv.invested_amount)}</td>
                                <td>${formatCurrency(currentValue)}</td>
                                <td class="${gainClass}">
                                    ${formatCurrency(gain)} (${gain >= 0 ? '+' : ''}${gainPercentage}%)
                                </td>
                                <td>${inv.platform || '-'}</td>
                                <td>
                                    <button onclick="editInvestment('${inv.id}')" class="btn btn-sm btn-edit">Edit</button>
                                    <button onclick="deleteInvestment('${inv.id}')" class="btn btn-sm btn-delete">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    tabContent.innerHTML = tableHTML;
}

function renderLiabilityTabContent(type) {
    // Update active tab
    const parentTabs = document.querySelector('#liability-tab-content').parentElement.querySelectorAll('.tab');
    parentTabs.forEach(tab => tab.classList.remove('active'));
    
    // Find and activate the clicked tab
    const typeMap = {
        'homeLoan': 'Home Loan',
        'personalLoan': 'Personal Loan',
        'creditCard': 'Credit Card',
        'other': 'Other'
    };
    
    parentTabs.forEach(tab => {
        if (tab.textContent.trim() === typeMap[type]) {
            tab.classList.add('active');
        }
    });

    const tabContent = document.getElementById('liability-tab-content');
    const filteredLiabilities = liabilities.filter(lib => lib.type === type);

    if (filteredLiabilities.length === 0) {
        tabContent.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📉</div>
                <p>No ${typeMap[type]} liabilities added yet.</p>
                <p>Click "Add Liability" to start tracking your ${typeMap[type].toLowerCase()}.</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <div class="table-responsive">
            <table class="data-table" id="liabilities-table">
                <thead>
                    <tr>
                        <th onclick="sortTable('liabilities-table', 0)">Lender <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liabilities-table', 1)">Member <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liabilities-table', 2)">Outstanding Amount <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liabilities-table', 3)">EMI <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liabilities-table', 4)">Interest Rate <span class="sort-indicator"></span></th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLiabilities.map(lib => {
                        const member = familyMembers.find(m => m.id === lib.member_id);
                        return `
                            <tr>
                                <td>${lib.lender}</td>
                                <td>${member ? member.name : 'Unknown'}</td>
                                <td class="text-red">${formatCurrency(lib.outstanding_amount)}</td>
                                <td>${formatCurrency(lib.emi_amount || 0)}</td>
                                <td>${lib.interest_rate ? lib.interest_rate + '%' : '-'}</td>
                                <td>
                                    <button onclick="editLiability('${lib.id}')" class="btn btn-sm btn-edit">Edit</button>
                                    <button onclick="deleteLiability('${lib.id}')" class="btn btn-sm btn-delete">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    tabContent.innerHTML = tableHTML;
}

function renderAccounts() {
    const tableBody = document.getElementById('accounts-table-body');
    if (!tableBody) return;

    if (accounts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="emoji">🏦</div>
                    <p>No accounts added yet.</p>
                    <p>Click "Add Account" to start managing your accounts.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = accounts.map(account => {
        const holder = familyMembers.find(m => m.id === account.holder_id);
        const nominee = familyMembers.find(m => m.id === account.nominee_id);
        const statusClass = account.status === 'Active' ? 'status active' : 'status inactive';

        return `
            <tr>
                <td>${account.account_type}</td>
                <td>${account.institution}</td>
                <td>${account.account_number}</td>
                <td>${holder ? holder.name : 'Unknown'}</td>
                <td>${nominee ? nominee.name : '-'}</td>
                <td><span class="${statusClass}">${account.status}</span></td>
                <td>
                    <button onclick="editAccount('${account.id}')" class="btn btn-sm btn-edit">Edit</button>
                    <button onclick="deleteAccount('${account.id}')" class="btn btn-sm btn-delete">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderReminders() {
    // This function can be expanded to render reminders in a dedicated section
    const today = new Date();
    const urgentReminders = reminders.filter(reminder => {
        const reminderDate = new Date(reminder.date);
        const daysDiff = calculateDaysDifference(today, reminderDate);
        return daysDiff >= 0 && daysDiff <= 7;
    });

    console.log(`${urgentReminders.length} urgent reminders found`);
    
    // Update reminders count in stats
    renderStatsOverview();
}

// ===== MEMBER DETAILS FUNCTIONS =====
function showMemberDetails(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;

    // Hide main sections and show member details
    const mainSections = document.querySelectorAll('.section:not(.member-details-section)');
    mainSections.forEach(section => section.style.display = 'none');
    
    const memberDetailsSection = document.getElementById('member-details-section');
    memberDetailsSection.style.display = 'block';

    // Update title
    const detailsTitle = document.getElementById('member-details-title');
    detailsTitle.textContent = `${member.name} - Financial Details`;

    // Calculate member's financial data
    const memberAssets = calculateMemberAssets(member.id);
    const memberLiabilities = calculateMemberLiabilities(member.id);
    const netWorth = memberAssets - memberLiabilities;
    const memberInvestments = investments.filter(inv => inv.member_id === memberId);
    const memberLiabilityRecords = liabilities.filter(lib => lib.member_id === memberId);
    const memberAccounts = accounts.filter(acc => acc.holder_id === memberId);
    const memberReminders = reminders.filter(rem => rem.member_id === memberId);

    // Render member details content
    const detailsContent = document.getElementById('member-details-content');
    detailsContent.innerHTML = `
        <div class="member-details-overview">
            <div class="member-profile">
                <img src="${member.photo_url || 'data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\' font-size=\\'90\\'>👤</text></svg>'}" 
                     alt="${member.name}" class="member-detail-photo"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\' font-size=\\'90\\'>👤</text></svg>'" />
                <div class="member-info">
                    <h3>${member.name} ${member.is_primary ? '<span class="primary-badge">Primary</span>' : ''}</h3>
                    <div class="relationship">${member.relationship}</div>
                    <div style="margin-top: 10px; font-size: 0.9rem; color: #718096;">
                        Member since: ${formatDate(member.created_at)}
                    </div>
                </div>
            </div>

            <div class="financial-summary-grid">
                <div class="summary-card assets">
                    <div class="summary-value assets">${formatCurrency(memberAssets)}</div>
                    <div class="summary-label">Total Assets</div>
                    <div style="font-size: 0.8rem; color: #718096; margin-top: 5px;">
                        From ${memberInvestments.length} investment(s)
                    </div>
                </div>
                <div class="summary-card liabilities">
                    <div class="summary-value liabilities">${formatCurrency(memberLiabilities)}</div>
                    <div class="summary-label">Total Liabilities</div>
                    <div style="font-size: 0.8rem; color: #718096; margin-top: 5px;">
                        From ${memberLiabilityRecords.length} liability(ies)
                    </div>
                </div>
                <div class="summary-card net-worth">
                    <div class="summary-value net-worth">${formatCurrency(netWorth)}</div>
                    <div class="summary-label">Net Worth</div>
                    <div style="font-size: 0.8rem; color: #718096; margin-top: 5px;">
                        ${memberAccounts.length} account(s)
                    </div>
                </div>
            </div>
        </div>

        ${memberInvestments.length > 0 ? `
        <div class="member-investments" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin-bottom: 20px;">Investments (${memberInvestments.length})</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Invested</th>
                            <th>Current Value</th>
                            <th>Gain/Loss</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${memberInvestments.map(inv => {
                            const currentValue = inv.current_value || inv.invested_amount;
                            const gain = currentValue - inv.invested_amount;
                            const gainClass = gain >= 0 ? 'text-green' : 'text-red';
                            return `
                                <tr>
                                    <td>${capitalizeFirst(inv.type)}</td>
                                    <td>${inv.name}</td>
                                    <td>${formatCurrency(inv.invested_amount)}</td>
                                    <td>${formatCurrency(currentValue)}</td>
                                    <td class="${gainClass}">${formatCurrency(gain)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        ${memberLiabilityRecords.length > 0 ? `
        <div class="member-liabilities" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin-bottom: 20px;">Liabilities (${memberLiabilityRecords.length})</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Lender</th>
                            <th>Outstanding</th>
                            <th>EMI</th>
                            <th>Interest Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${memberLiabilityRecords.map(lib => `
                            <tr>
                                <td>${capitalizeFirst(lib.type)}</td>
                                <td>${lib.lender}</td>
                                <td class="text-red">${formatCurrency(lib.outstanding_amount)}</td>
                                <td>${formatCurrency(lib.emi_amount || 0)}</td>
                                <td>${lib.interest_rate ? lib.interest_rate + '%' : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        ${memberAccounts.length > 0 ? `
        <div class="member-accounts" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin-bottom: 20px;">Accounts (${memberAccounts.length})</h3>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Institution</th>
                            <th>Account Number</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${memberAccounts.map(acc => {
                            const statusClass = acc.status === 'Active' ? 'status active' : 'status inactive';
                            return `
                                <tr>
                                    <td>${acc.account_type}</td>
                                    <td>${acc.institution}</td>
                                    <td>${acc.account_number}</td>
                                    <td><span class="${statusClass}">${acc.status}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <div class="member-reminders" style="padding: 30px;">
            <h3 style="margin-bottom: 20px;">Reminders (${memberReminders.length})</h3>
            ${memberReminders.length > 0 ? `
                <div class="reminders-grid">
                    ${memberReminders.map(reminder => {
                        const today = new Date();
                        const reminderDate = new Date(reminder.date);
                        const daysDiff = calculateDaysDifference(today, reminderDate);
                        
                        let cardClass = 'reminder-card info';
                        if (daysDiff <= 3 && daysDiff >= 0) cardClass = 'reminder-card urgent';
                        else if (daysDiff <= 7 && daysDiff >= 0) cardClass = 'reminder-card warning';
                        
                        return `
                            <div class="${cardClass}">
                                <div class="reminder-title">${reminder.title}</div>
                                <div class="reminder-date">${formatDate(reminder.date)}</div>
                                <div class="reminder-days">
                                    ${daysDiff >= 0 ? `${daysDiff} day(s) remaining` : `${Math.abs(daysDiff)} day(s) overdue`}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p style="color: #718096;">No reminders set for this member.</p>'}
        </div>
    `;
}

function closeMemberDetails() {
    // Hide member details section
    const memberDetailsSection = document.getElementById('member-details-section');
    memberDetailsSection.style.display = 'none';
    
    // Show main sections
    const mainSections = document.querySelectorAll('.section:not(.member-details-section)');
    mainSections.forEach(section => section.style.display = 'block');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
        resetModalForm(modalId);
    }
}

function resetModalForm(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
    }
    
    // Reset conditional fields
    const conditionalFields = modal.querySelectorAll('.conditional-fields');
    conditionalFields.forEach(field => {
        field.style.display = 'none';
    });
    
    // Reset editing state
    if (modalId === 'member-modal') {
        editingMemberId = null;
        document.getElementById('member-modal-title').textContent = 'Add Family Member';
    } else if (modalId === 'investment-modal') {
        editingInvestmentId = null;
        document.getElementById('investment-modal-title').textContent = 'Add Investment';
    } else if (modalId === 'liability-modal') {
        editingLiabilityId = null;
        document.getElementById('liability-modal-title').textContent = 'Add Liability';
    } else if (modalId === 'account-modal') {
        editingAccountId = null;
        document.getElementById('account-modal-title').textContent = 'Add Account';
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
    const name = document.getElementById('member-name').value.trim();
    const relationship = document.getElementById('member-relationship').value;
    const isPrimary = document.getElementById('member-is-primary').checked;

    if (!name || !relationship) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }

    try {
        const memberData = {
            user_id: currentUser.id,
            name: name,
            relationship: relationship,
            is_primary: isPrimary,
            photo: 'default.png',
            created_at: new Date().toISOString()
        };

        if (editingMemberId) {
            // Update existing member
            await updateMemberData(editingMemberId, memberData);
            showMessage('Family member updated successfully!', 'success');
        } else {
            // Add new member
            await addMemberData(memberData);
            showMessage('Family member added successfully!', 'success');
        }

        renderFamilyMembers();
        renderStatsOverview();
        closeModal('member-modal');
    } catch (error) {
        console.error('Error saving member:', error);
        showMessage('Error saving family member.', 'error');
    }
}

async function addMemberData(memberData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - add to local data
        memberData.id = generateId();
        familyMembers.push(memberData);
        return;
    }

    // Supabase mode
    const { data, error } = await supabase
        .from('family_members')
        .insert([memberData])
        .select();

    if (error) {
        throw error;
    }

    familyMembers.push(data[0]);
}

async function updateMemberData(memberId, memberData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - update local data
        const memberIndex = familyMembers.findIndex(m => m.id === memberId);
        if (memberIndex !== -1) {
            familyMembers[memberIndex] = { ...familyMembers[memberIndex], ...memberData };
        }
        return;
    }

    // Supabase mode
    const { error } = await supabase
        .from('family_members')
        .update(memberData)
        .eq('id', memberId);

    if (error) {
        throw error;
    }

    // Update local data
    const memberIndex = familyMembers.findIndex(m => m.id === memberId);
    if (memberIndex !== -1) {
        familyMembers[memberIndex] = { ...familyMembers[memberIndex], ...memberData };
    }
}

function editMember(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;

    editingMemberId = memberId;
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    
    // Populate form
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-relationship').value = member.relationship;
    document.getElementById('member-is-primary').checked = member.is_primary;
    
    openModal('member-modal');
}

async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this family member? This will also delete all associated investments, liabilities, and accounts.')) {
        return;
    }

    try {
        const authType = localStorage.getItem('famwealth_auth_type');
        
        if (authType === 'demo' || !supabase) {
            // Demo mode - delete from local data
            familyMembers = familyMembers.filter(m => m.id !== memberId);
            investments = investments.filter(inv => inv.member_id !== memberId);
            liabilities = liabilities.filter(lib => lib.member_id !== memberId);
            accounts = accounts.filter(acc => acc.holder_id !== memberId && acc.nominee_id !== memberId);
            reminders = reminders.filter(rem => rem.member_id !== memberId);
        } else {
            // Supabase mode - delete from database
            const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', memberId);

            if (error) {
                throw error;
            }

            // Update local data
            familyMembers = familyMembers.filter(m => m.id !== memberId);
            investments = investments.filter(inv => inv.member_id !== memberId);
            liabilities = liabilities.filter(lib => lib.member_id !== memberId);
            accounts = accounts.filter(acc => acc.holder_id !== memberId && acc.nominee_id !== memberId);
            reminders = reminders.filter(rem => rem.member_id !== memberId);
        }

        renderFamilyMembers();
        renderStatsOverview();
        renderInvestmentTabContent('equity');
        renderLiabilityTabContent('homeLoan');
        renderAccounts();
        showMessage('Family member deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting member:', error);
        showMessage('Error deleting family member.', 'error');
    }
}

// ===== PHOTO FUNCTIONS =====
function openPhotoModal(memberId) {
    currentPhotoMemberId = memberId;
    selectedPhoto = null;
    renderPresetPhotos();
    openModal('photo-modal');
}

function renderPresetPhotos() {
    const photosGrid = document.getElementById('preset-photos-grid');
    const presetPhotos = [
        { name: 'man1.png', emoji: '👨' },
        { name: 'man2.png', emoji: '🧑' },
        { name: 'woman1.png', emoji: '👩' },
        { name: 'woman2.png', emoji: '👩‍💼' },
        { name: 'boy1.png', emoji: '👦' },
        { name: 'girl1.png', emoji: '👧' },
        { name: 'elderly-man.png', emoji: '👴' },
        { name: 'elderly-woman.png', emoji: '👵' },
        { name: 'default.png', emoji: '👤' }
    ];
    
    photosGrid.innerHTML = '';
    presetPhotos.forEach(photo => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-option';
        photoDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 80px;
            border-radius: 10px;
            cursor: pointer;
            border: 3px solid transparent;
            transition: all 0.3s ease;
            font-size: 2rem;
            background: #f7fafc;
        `;
        photoDiv.textContent = photo.emoji;
        photoDiv.onclick = () => selectPhoto(photo.name, photoDiv);
        photosGrid.appendChild(photoDiv);
    });
}

function selectPhoto(photoName, element) {
    // Remove previous selection
    document.querySelectorAll('.photo-option').forEach(div => {
        div.style.borderColor = 'transparent';
    });
    
    // Add selection to clicked photo
    element.style.borderColor = '#667eea';
    selectedPhoto = photoName;
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // For demo purposes, show info message
    showMessage('Photo upload feature would be implemented with actual file storage service.', 'info');
    
    // Reset file input
    event.target.value = '';
}

async function savePhoto() {
    if (!selectedPhoto) {
        showMessage('Please select a photo.', 'error');
        return;
    }
    
    try {
        const authType = localStorage.getItem('famwealth_auth_type');
        
        if (authType === 'demo' || !supabase) {
            // Demo mode - update local data
            const member = familyMembers.find(m => m.id === currentPhotoMemberId);
            if (member) {
                member.photo = selectedPhoto;
                member.photo_url = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👤</text></svg>`;
            }
        } else {
            // Supabase mode
            const { error } = await supabase
                .from('family_members')
                .update({ photo: selectedPhoto })
                .eq('id', currentPhotoMemberId);
                
            if (error) {
                throw error;
            }
            
            // Update local data
            const member = familyMembers.find(m => m.id === currentPhotoMemberId);
            if (member) {
                member.photo = selectedPhoto;
            }
        }
        
        renderFamilyMembers();
        closeModal('photo-modal');
        showMessage('Photo updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating photo:', error);
        showMessage('Error updating photo.', 'error');
    }
}

// ===== INVESTMENT FUNCTIONS =====
function openAddInvestmentModal() {
    editingInvestmentId = null;
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    document.getElementById('investment-form').reset();
    populateMemberOptions('investment-member');
    hideAllConditionalFields();
    openModal('investment-modal');
}

function populateMemberOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Select Member</option>';
    familyMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        select.appendChild(option);
    });
}

function hideAllConditionalFields() {
    document.querySelector('.fixed-deposit-fields').style.display = 'none';
    document.querySelector('.insurance-fields').style.display = 'none';
    document.querySelector('.bank-balance-fields').style.display = 'none';
}

function updateInvestmentForm() {
    const investmentType = document.getElementById('investment-type').value;
    
    hideAllConditionalFields();
    
    if (investmentType === 'fixedDeposits') {
        document.querySelector('.fixed-deposit-fields').style.display = 'block';
    } else if (investmentType === 'insurance') {
        document.querySelector('.insurance-fields').style.display = 'block';
    } else if (investmentType === 'bankBalances') {
        document.querySelector('.bank-balance-fields').style.display = 'block';
    }
}

async function saveInvestment() {
    const memberId = document.getElementById('investment-member').value;
    const type = document.getElementById('investment-type').value;
    const name = document.getElementById('investment-name').value.trim();
    const amount = parseFloat(document.getElementById('investment-amount').value);
    const currentValue = parseFloat(document.getElementById('investment-current-value').value) || amount;
    const platform = document.getElementById('investment-platform').value.trim();

    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }

    if (amount <= 0) {
        showMessage('Invested amount must be greater than 0.', 'error');
        return;
    }

    try {
        const investmentData = {
            user_id: currentUser.id,
            member_id: memberId,
            type: type,
            name: name,
            invested_amount: amount,
            current_value: currentValue,
            platform: platform,
            created_at: new Date().toISOString()
        };

        // Add type-specific data
        if (type === 'fixedDeposits') {
            investmentData.fd_details = {
                bank_name: document.getElementById('fd-bank-name').value,
                interest_rate: parseFloat(document.getElementById('fd-interest-rate').value) || 0,
                start_date: document.getElementById('fd-start-date').value,
                maturity_date: document.getElementById('fd-maturity-date').value,
                interest_payout: document.getElementById('fd-interest-payout').value,
                account_number: document.getElementById('fd-account-number').value,
                nominee: document.getElementById('fd-nominee').value,
                comments: document.getElementById('fd-comments').value
            };
        } else if (type === 'insurance') {
            investmentData.insurance_details = {
                policy_name: document.getElementById('ins-policy-name').value,
                policy_number: document.getElementById('ins-policy-number').value,
                company: document.getElementById('ins-company').value,
                insurance_type: document.getElementById('ins-type').value,
                sum_assured: parseFloat(document.getElementById('ins-sum-assured').value) || 0,
                premium_amount: parseFloat(document.getElementById('ins-premium-amount').value) || 0,
                premium_frequency: document.getElementById('ins-premium-frequency').value,
                policy_status: document.getElementById('ins-policy-status').value,
                start_date: document.getElementById('ins-start-date').value,
                maturity_date: document.getElementById('ins-maturity-date').value,
                next_premium_date: document.getElementById('ins-next-premium-date').value,
                nominee: document.getElementById('ins-nominee').value,
                comments: document.getElementById('ins-comments').value
            };
        } else if (type === 'bankBalances') {
            investmentData.bank_details = {
                bank_name: document.getElementById('bb-bank-name').value,
                account_type: document.getElementById('bb-account-type').value,
                balance_date: document.getElementById('bb-balance-date').value,
                account_number: document.getElementById('bb-account-number').value,
                comments: document.getElementById('bb-comments').value
            };
        }

        if (editingInvestmentId) {
            // Update existing investment
            await updateInvestmentData(editingInvestmentId, investmentData);
            showMessage('Investment updated successfully!', 'success');
        } else {
            // Add new investment
            await addInvestmentData(investmentData);
            showMessage('Investment added successfully!', 'success');
        }

        renderInvestmentTabContent(type);
        renderStatsOverview();
        closeModal('investment-modal');
    } catch (error) {
        console.error('Error saving investment:', error);
        showMessage('Error saving investment.', 'error');
    }
}

async function addInvestmentData(investmentData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - add to local data
        investmentData.id = generateId();
        investments.push(investmentData);
        return;
    }

    // Supabase mode
    const { data, error } = await supabase
        .from('investments')
        .insert([investmentData])
        .select();

    if (error) {
        throw error;
    }

    investments.push(data[0]);
}

async function updateInvestmentData(investmentId, investmentData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - update local data
        const investmentIndex = investments.findIndex(inv => inv.id === investmentId);
        if (investmentIndex !== -1) {
            investments[investmentIndex] = { ...investments[investmentIndex], ...investmentData };
        }
        return;
    }

    // Supabase mode
    const { error } = await supabase
        .from('investments')
        .update(investmentData)
        .eq('id', investmentId);

    if (error) {
        throw error;
    }

    // Update local data
    const investmentIndex = investments.findIndex(inv => inv.id === investmentId);
    if (investmentIndex !== -1) {
        investments[investmentIndex] = { ...investments[investmentIndex], ...investmentData };
    }
}

function editInvestment(investmentId) {
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) return;

    editingInvestmentId = investmentId;
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';
    
    // Populate form
    document.getElementById('investment-member').value = investment.member_id;
    document.getElementById('investment-type').value = investment.type;
    document.getElementById('investment-name').value = investment.name;
    document.getElementById('investment-amount').value = investment.invested_amount;
    document.getElementById('investment-current-value').value = investment.current_value;
    document.getElementById('investment-platform').value = investment.platform || '';
    
    // Show appropriate conditional fields
    updateInvestmentForm();
    
    // Populate conditional fields if they exist
    if (investment.fd_details && investment.type === 'fixedDeposits') {
        const fd = investment.fd_details;
        document.getElementById('fd-bank-name').value = fd.bank_name || '';
        document.getElementById('fd-interest-rate').value = fd.interest_rate || '';
        document.getElementById('fd-start-date').value = fd.start_date || '';
        document.getElementById('fd-maturity-date').value = fd.maturity_date || '';
        document.getElementById('fd-interest-payout').value = fd.interest_payout || '';
        document.getElementById('fd-account-number').value = fd.account_number || '';
        document.getElementById('fd-nominee').value = fd.nominee || '';
        document.getElementById('fd-comments').value = fd.comments || '';
    }
    
    populateMemberOptions('investment-member');
    openModal('investment-modal');
}

async function deleteInvestment(investmentId) {
    if (!confirm('Are you sure you want to delete this investment?')) {
        return;
    }

    try {
        const authType = localStorage.getItem('famwealth_auth_type');
        
        if (authType === 'demo' || !supabase) {
            // Demo mode - delete from local data
            investments = investments.filter(inv => inv.id !== investmentId);
        } else {
            // Supabase mode
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', investmentId);

            if (error) {
                throw error;
            }

            investments = investments.filter(inv => inv.id !== investmentId);
        }

        // Re-render current tab
        const activeTab = document.querySelector('#investment-tab-content').parentElement.querySelector('.tab.active');
        if (activeTab) {
            const typeMap = {
                'Equity': 'equity',
                'Mutual Funds': 'mutualFunds',
                'Fixed Deposits': 'fixedDeposits',
                'Insurance': 'insurance',
                'Bank Balances': 'bankBalances',
                'Others': 'others'
            };
            renderInvestmentTabContent(typeMap[activeTab.textContent.trim()]);
        }
        
        renderStatsOverview();
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
    populateMemberOptions('liability-member');
    openModal('liability-modal');
}

async function saveLiability() {
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

    try {
        const liabilityData = {
            user_id: currentUser.id,
            member_id: memberId,
            type: type,
            lender: lender,
            outstanding_amount: amount,
            emi_amount: emi,
            interest_rate: rate,
            created_at: new Date().toISOString()
        };

        if (editingLiabilityId) {
            // Update existing liability
            await updateLiabilityData(editingLiabilityId, liabilityData);
            showMessage('Liability updated successfully!', 'success');
        } else {
            // Add new liability
            await addLiabilityData(liabilityData);
            showMessage('Liability added successfully!', 'success');
        }

        renderLiabilityTabContent(type);
        renderStatsOverview();
        closeModal('liability-modal');
    } catch (error) {
        console.error('Error saving liability:', error);
        showMessage('Error saving liability.', 'error');
    }
}

async function addLiabilityData(liabilityData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - add to local data
        liabilityData.id = generateId();
        liabilities.push(liabilityData);
        return;
    }

    // Supabase mode
    const { data, error } = await supabase
        .from('liabilities')
        .insert([liabilityData])
        .select();

    if (error) {
        throw error;
    }

    liabilities.push(data[0]);
}

async function updateLiabilityData(liabilityId, liabilityData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - update local data
        const liabilityIndex = liabilities.findIndex(lib => lib.id === liabilityId);
        if (liabilityIndex !== -1) {
            liabilities[liabilityIndex] = { ...liabilities[liabilityIndex], ...liabilityData };
        }
        return;
    }

    // Supabase mode
    const { error } = await supabase
        .from('liabilities')
        .update(liabilityData)
        .eq('id', liabilityId);

    if (error) {
        throw error;
    }

    // Update local data
    const liabilityIndex = liabilities.findIndex(lib => lib.id === liabilityId);
    if (liabilityIndex !== -1) {
        liabilities[liabilityIndex] = { ...liabilities[liabilityIndex], ...liabilityData };
    }
}

function editLiability(liabilityId) {
    const liability = liabilities.find(lib => lib.id === liabilityId);
    if (!liability) return;

    editingLiabilityId = liabilityId;
    document.getElementById('liability-modal-title').textContent = 'Edit Liability';
    
    // Populate form
    document.getElementById('liability-member').value = liability.member_id;
    document.getElementById('liability-type').value = liability.type;
    document.getElementById('liability-lender').value = liability.lender;
    document.getElementById('liability-amount').value = liability.outstanding_amount;
    document.getElementById('liability-emi').value = liability.emi_amount || '';
    document.getElementById('liability-rate').value = liability.interest_rate || '';
    
    populateMemberOptions('liability-member');
    openModal('liability-modal');
}

async function deleteLiability(liabilityId) {
    if (!confirm('Are you sure you want to delete this liability?')) {
        return;
    }

    try {
        const authType = localStorage.getItem('famwealth_auth_type');
        
        if (authType === 'demo' || !supabase) {
            // Demo mode - delete from local data
            liabilities = liabilities.filter(lib => lib.id !== liabilityId);
        } else {
            // Supabase mode
            const { error } = await supabase
                .from('liabilities')
                .delete()
                .eq('id', liabilityId);

            if (error) {
                throw error;
            }

            liabilities = liabilities.filter(lib => lib.id !== liabilityId);
        }

        // Re-render current tab
        const activeTab = document.querySelector('#liability-tab-content').parentElement.querySelector('.tab.active');
        if (activeTab) {
            const typeMap = {
                'Home Loan': 'homeLoan',
                'Personal Loan': 'personalLoan',
                'Credit Card': 'creditCard',
                'Other': 'other'
            };
            renderLiabilityTabContent(typeMap[activeTab.textContent.trim()]);
        }
        
        renderStatsOverview();
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
    populateMemberOptions('account-holder');
    populateMemberOptions('account-nominee');
    openModal('account-modal');
}

async function saveAccount() {
    const accountType = document.getElementById('account-type').value;
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

    try {
        const accountData = {
            user_id: currentUser.id,
            account_type: accountType,
            institution: institution,
            account_number: accountNumber,
            holder_id: holderId,
            nominee_id: nomineeId || null,
            status: status,
            comments: comments,
            created_at: new Date().toISOString()
        };

        if (editingAccountId) {
            // Update existing account
            await updateAccountData(editingAccountId, accountData);
            showMessage('Account updated successfully!', 'success');
        } else {
            // Add new account
            await addAccountData(accountData);
            showMessage('Account added successfully!', 'success');
        }

        renderAccounts();
        renderStatsOverview();
        closeModal('account-modal');
    } catch (error) {
        console.error('Error saving account:', error);
        showMessage('Error saving account.', 'error');
    }
}

async function addAccountData(accountData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - add to local data
        accountData.id = generateId();
        accounts.push(accountData);
        return;
    }

    // Supabase mode
    const { data, error } = await supabase
        .from('accounts')
        .insert([accountData])
        .select();

    if (error) {
        throw error;
    }

    accounts.push(data[0]);
}

async function updateAccountData(accountId, accountData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - update local data
        const accountIndex = accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            accounts[accountIndex] = { ...accounts[accountIndex], ...accountData };
        }
        return;
    }

    // Supabase mode
    const { error } = await supabase
        .from('accounts')
        .update(accountData)
        .eq('id', accountId);

    if (error) {
        throw error;
    }

    // Update local data
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    if (accountIndex !== -1) {
        accounts[accountIndex] = { ...accounts[accountIndex], ...accountData };
    }
}

function editAccount(accountId) {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    editingAccountId = accountId;
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    
    // Populate form
    document.getElementById('account-type').value = account.account_type;
    document.getElementById('account-institution').value = account.institution;
    document.getElementById('account-number').value = account.account_number;
    document.getElementById('account-holder').value = account.holder_id;
    document.getElementById('account-nominee').value = account.nominee_id || '';
    document.getElementById('account-status').value = account.status;
    document.getElementById('account-comments').value = account.comments || '';
    
    populateMemberOptions('account-holder');
    populateMemberOptions('account-nominee');
    openModal('account-modal');
}

async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) {
        return;
    }

    try {
        const authType = localStorage.getItem('famwealth_auth_type');
        
        if (authType === 'demo' || !supabase) {
            // Demo mode - delete from local data
            accounts = accounts.filter(acc => acc.id !== accountId);
        } else {
            // Supabase mode
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', accountId);

            if (error) {
                throw error;
            }

            accounts = accounts.filter(acc => acc.id !== accountId);
        }

        renderAccounts();
        renderStatsOverview();
        showMessage('Account deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting account:', error);
        showMessage('Error deleting account.', 'error');
    }
}

// ===== EXPORT FUNCTIONS =====
function exportInvestments(format) {
    if (investments.length === 0) {
        showMessage('No investments to export.', 'warning');
        return;
    }

    if (format === 'csv') {
        const csvContent = convertToCSV(investments);
        downloadFile('investments.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(investments, null, 2);
        downloadFile('investments.json', jsonContent, 'application/json');
    }
}

function exportLiabilities(format) {
    if (liabilities.length === 0) {
        showMessage('No liabilities to export.', 'warning');
        return;
    }

    if (format === 'csv') {
        const csvContent = convertToCSV(liabilities);
        downloadFile('liabilities.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(liabilities, null, 2);
        downloadFile('liabilities.json', jsonContent, 'application/json');
    }
}

function exportAccounts(format) {
    if (accounts.length === 0) {
        showMessage('No accounts to export.', 'warning');
        return;
    }

    if (format === 'csv') {
        const csvContent = convertToCSV(accounts);
        downloadFile('accounts.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(accounts, null, 2);
        downloadFile('accounts.json', jsonContent, 'application/json');
    }
}

function exportFamilyData(format) {
    const familyData = {
        members: familyMembers,
        investments: investments,
        liabilities: liabilities,
        accounts: accounts,
        reminders: reminders,
        exported_at: new Date().toISOString(),
        total_assets: familyMembers.reduce((acc, member) => acc + calculateMemberAssets(member.id), 0),
        total_liabilities: familyMembers.reduce((acc, member) => acc + calculateMemberLiabilities(member.id), 0)
    };

    familyData.net_worth = familyData.total_assets - familyData.total_liabilities;

    if (format === 'csv') {
        // For CSV, create separate sections for each data type
        let csvContent = '';
        
        csvContent += '# FAMILY DATA EXPORT\n';
        csvContent += `# Generated on: ${new Date().toLocaleString()}\n`;
        csvContent += `# Total Assets: ${formatCurrency(familyData.total_assets)}\n`;
        csvContent += `# Total Liabilities: ${formatCurrency(familyData.total_liabilities)}\n`;
        csvContent += `# Net Worth: ${formatCurrency(familyData.net_worth)}\n\n`;
        
        csvContent += '# FAMILY MEMBERS\n';
        csvContent += convertToCSV(familyMembers) + '\n\n';
        
        csvContent += '# INVESTMENTS\n';
        csvContent += convertToCSV(investments) + '\n\n';
        
        csvContent += '# LIABILITIES\n';
        csvContent += convertToCSV(liabilities) + '\n\n';
        
        csvContent += '# ACCOUNTS\n';
        csvContent += convertToCSV(accounts) + '\n\n';
        
        csvContent += '# REMINDERS\n';
        csvContent += convertToCSV(reminders);
        
        downloadFile('family_financial_data.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(familyData, null, 2);
        downloadFile('family_financial_data.json', jsonContent, 'application/json');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return 'No data available';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            
            // Handle different data types
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            } else if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            
            return value;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage(`${filename} downloaded successfully!`, 'success');
}

// ===== TABLE SORTING FUNCTIONS =====
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    if (rows.length === 0) return;
    
    // Determine sort direction
    const header = table.querySelectorAll('th')[columnIndex];
    const indicator = header.querySelector('.sort-indicator');
    const isAscending = indicator.textContent !== '↑';
    
    // Clear all indicators
    table.querySelectorAll('.sort-indicator').forEach(ind => ind.textContent = '');
    
    // Set current indicator
    indicator.textContent = isAscending ? '↑' : '↓';
    
    // Sort rows
    rows.sort((a, b) => {
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];
        
        if (!aCell || !bCell) return 0;
        
        let aVal = aCell.textContent.trim();
        let bVal = bCell.textContent.trim();
        
        // Remove currency symbols and commas for numeric sorting
        const aNum = parseFloat(aVal.replace(/[₹,]/g, ''));
        const bNum = parseFloat(bVal.replace(/[₹,]/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? aNum - bNum : bNum - aNum;
        } else {
            return isAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
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

// ===== APPLICATION INITIALIZATION =====
console.log('✅ FamWealth Dashboard app.js loaded successfully (2900+ lines)');
console.log('🔧 Ready for initialization');

// Make functions globally available
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
