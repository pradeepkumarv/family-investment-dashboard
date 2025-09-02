// app-complete-fixed.js - COMPLETE VERSION WITH DUPLICATE PREVENTION & INSURANCE EDIT FIX

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

// ===== UTILITY FUNCTIONS - ENHANCED FOR SAFETY =====
function safeSetElementValue(elementId, value = '') {
    try {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value || '';
            return true;
        } else {
            console.warn(`⚠️ Element not found: ${elementId}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error setting value for ${elementId}:`, error);
        return false;
    }
}

function safeGetElementValue(elementId, fallback = '') {
    try {
        const element = document.getElementById(elementId);
        return element ? (element.value || fallback) : fallback;
    } catch (error) {
        console.error(`❌ Error getting value for ${elementId}:`, error);
        return fallback;
    }
}

function checkElementExists(elementId) {
    const element = document.getElementById(elementId);
    const exists = element !== null;
    if (!exists) {
        console.warn(`⚠️ Missing element: ${elementId}`);
    }
    return exists;
}

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

// ===== ENHANCED UTILITY FUNCTIONS =====
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
        
        // Enhanced photo handling
        let photoSrc;
        if (member.photo && member.photo.startsWith('http')) {
            photoSrc = member.photo;
        } else if (member.photo && member.photo.includes('.png')) {
            photoSrc = getEmojiDataUrl(member.photo);
        } else {
            photoSrc = getEmojiDataUrl('default.png');
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'family-card';
        memberCard.onclick = () => showMemberDetails(member.id);

        memberCard.innerHTML = `
            <div style="text-align: center;">
                <img src="${photoSrc}" 
                     alt="${member.name}" 
                     style="width: 80px !important; height: 80px !important; border-radius: 50% !important; object-fit: cover !important; margin: 0 auto 15px !important; border: 3px solid #667eea !important; display: block !important; background: white !important;"
                     onerror="console.log('Photo failed:', this.src); this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="width: 80px; height: 80px; border-radius: 50%; background: #f7fafc; border: 3px solid #667eea; margin: 0 auto 15px; align-items: center; justify-content: center; font-size: 12px; color: #666; display: none;">
                    No Photo
                </div>
            </div>
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
                <button onclick="event.stopPropagation(); deleteMember('${member.id}')" class="btn btn-sm btn-delete">Delete</button>
            </div>
        `;

        familyGrid.appendChild(memberCard);
    });
}

// Helper function to convert photo name to emoji SVG data URL
function getEmojiDataUrl(photoName) {
    const photoEmojiMap = {
        'man1.png': '👨',
        'man2.png': '🧑',
        'woman1.png': '👩',
        'woman2.png': '👩‍💼',
        'boy1.png': '👦',
        'girl1.png': '👧',
        'elderly-man.png': '👴',
        'elderly-woman.png': '👵',
        'default.png': '👤'
    };
    const emoji = photoEmojiMap[photoName] || '👤';
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
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
        if (tab.textContent.trim().includes(typeMap[type])) {
            tab.classList.add('active');
        }
    });

    const tabContent = document.getElementById('investment-tab-content');
    const filteredInvestments = investments.filter(inv => inv.investment_type === type || inv.type === type);

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

                        const invName = inv.symbol_or_name || inv.name || 'Unknown';
                        const invPlatform = inv.broker_platform || inv.platform || '-';

                        return `
                            <tr>
                                <td>${invName}</td>
                                <td>${member ? member.name : 'Unknown'}</td>
                                <td>${formatCurrency(inv.invested_amount)}</td>
                                <td>${formatCurrency(currentValue)}</td>
                                <td class="${gainClass}">
                                    ${formatCurrency(gain)} (${gain >= 0 ? '+' : ''}${gainPercentage}%)
                                </td>
                                <td>${invPlatform}</td>
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
        if (tab.textContent.trim().includes(typeMap[type])) {
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
        // SHARED DATA - Removed user_id to make data shared across all family members
        const memberData = {
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

// ===== INVESTMENT FUNCTIONS - ENHANCED WITH DUPLICATE CHECK & INSURANCE FIX =====
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
    const fields = ['.fixed-deposit-fields', '.insurance-fields', '.bank-balance-fields'];
    fields.forEach(fieldClass => {
        const field = document.querySelector(fieldClass);
        if (field) {
            field.style.display = 'none';
        }
    });
}

function updateInvestmentForm() {
    const investmentType = document.getElementById('investment-type').value;
    
    hideAllConditionalFields();
    
    if (investmentType === 'fixedDeposits') {
        const field = document.querySelector('.fixed-deposit-fields');
        if (field) field.style.display = 'block';
    } else if (investmentType === 'insurance') {
        const field = document.querySelector('.insurance-fields');
        if (field) field.style.display = 'block';
    } else if (investmentType === 'bankBalances') {
        const field = document.querySelector('.bank-balance-fields');
        if (field) field.style.display = 'block';
    }
}

// ===== ENHANCED DUPLICATE PREVENTION LOGIC =====
async function checkForDuplicateInvestment(investmentData, editingId = null) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode - check local data
        const existing = investments.find(inv => 
            inv.id !== editingId &&
            inv.member_id === investmentData.member_id &&
            inv.investment_type === investmentData.investment_type &&
            (
                (investmentData.investment_type === 'insurance' && 
                 inv.insurance_policy_number === investmentData.insurance_policy_number) ||
                (investmentData.investment_type !== 'insurance' && 
                 inv.symbol_or_name?.toLowerCase() === investmentData.symbol_or_name?.toLowerCase())
            )
        );
        
        if (existing) {
            throw new Error(
                investmentData.investment_type === 'insurance' 
                    ? 'An insurance policy with this policy number already exists for this member.'
                    : 'An investment with this name already exists for this member.'
            );
        }
    } else {
        // Supabase mode - check database
        let query = supabase
            .from('investments')
            .select('id')
            .eq('member_id', investmentData.member_id)
            .eq('investment_type', investmentData.investment_type);
            
        if (editingId) {
            query = query.neq('id', editingId);
        }
        
        if (investmentData.investment_type === 'insurance') {
            query = query.eq('insurance_policy_number', investmentData.insurance_policy_number);
        } else {
            query = query.ilike('symbol_or_name', investmentData.symbol_or_name);
        }
        
        const { data: existing, error } = await query.limit(1);
        
        if (error) {
            console.error('Error checking for duplicates:', error);
        }
        
        if (existing && existing.length > 0) {
            throw new Error(
                investmentData.investment_type === 'insurance' 
                    ? 'An insurance policy with this policy number already exists for this member.'
                    : 'An investment with this name already exists for this member.'
            );
        }
    }
}

// ===== ENHANCED SAVE INVESTMENT WITH ALL FIXES =====
async function saveInvestment() {
    const btn = document.getElementById('investment-save-btn');
    btn.disabled = true;

    try {
        // Basic fields with enhanced validation
        const memberId = safeGetElementValue('investment-member');
        const type = safeGetElementValue('investment-type');
        const name = safeGetElementValue('investment-name').trim();
        const amount = parseFloat(safeGetElementValue('investment-amount')) || 0;
        const currentValue = parseFloat(safeGetElementValue('investment-current-value')) || amount;
        const platform = safeGetElementValue('investment-platform').trim() || 'Not Specified';

        // Enhanced validation
        if (!memberId || !type || !name || amount <= 0) {
            showMessage('Please fill in all required fields with valid values.', 'error');
            return;
        }

        // Build base investment data
        const investmentData = {
            member_id: memberId,
            investment_type: type,
            symbol_or_name: name,
            invested_amount: amount,
            current_value: currentValue,
            broker_platform: platform,
            created_at: new Date().toISOString()
        };

        // ===== INSURANCE SPECIFIC FIELDS - COMPLETE FIX =====
        if (type === 'insurance') {
            console.log('📋 Processing insurance investment...');
            
            // Required insurance fields
            const policyName = safeGetElementValue('ins-policy-name').trim();
            const policyNumber = safeGetElementValue('ins-policy-number').trim();
            const company = safeGetElementValue('ins-company').trim();
            const insuranceType = safeGetElementValue('ins-type');
            const sumAssured = parseFloat(safeGetElementValue('ins-sum-assured')) || 0;
            const premiumAmount = parseFloat(safeGetElementValue('ins-premium-amount')) || 0;
            const frequency = safeGetElementValue('ins-premium-frequency');
            const startDate = safeGetElementValue('ins-start-date');
            const maturityDate = safeGetElementValue('ins-maturity-date');

            // Enhanced validation for insurance
            if (!policyName || !policyNumber || !company || !insuranceType || 
                sumAssured <= 0 || premiumAmount <= 0 || !frequency || !startDate || !maturityDate) {
                showMessage('Please fill in all required insurance fields.', 'error');
                return;
            }

            // Add all insurance fields to investment data
            Object.assign(investmentData, {
                policy_name: policyName,
                insurance_policy_number: policyNumber,
                insurance_company: company,
                insurance_type: insuranceType,
                insurance_sum_assured: sumAssured,
                insurance_premium: premiumAmount,
                insurance_payment_frequency: frequency,
                insurance_start_date: startDate,
                insurance_maturity_date: maturityDate,
                insurance_next_premium_date: safeGetElementValue('ins-next-premium-date') || null,
                policy_status: safeGetElementValue('ins-policy-status') || 'Active',
                insurance_nominee: safeGetElementValue('ins-nominee').trim(),
                insurance_comments: safeGetElementValue('ins-comments').trim(),
                // Use sum assured as current value if not specified
                current_value: currentValue > 0 ? currentValue : sumAssured
            });

            console.log('✅ Insurance data prepared:', {
                policyName,
                policyNumber,
                company,
                sumAssured: formatCurrency(sumAssured)
            });
        }

        // ===== FIXED DEPOSIT SPECIFIC FIELDS =====
        if (type === 'fixedDeposits') {
            Object.assign(investmentData, {
                fd_bank_name: safeGetElementValue('fd-bank-name'),
                fd_interest_rate: parseFloat(safeGetElementValue('fd-interest-rate')) || null,
                fd_interest_payout: safeGetElementValue('fd-interest-payout') || 'At Maturity',
                fd_start_date: safeGetElementValue('fd-start-date') || null,
                fd_maturity_date: safeGetElementValue('fd-maturity-date') || null,
                fd_account_number: safeGetElementValue('fd-account-number'),
                fd_nominee: safeGetElementValue('fd-nominee'),
                fd_comments: safeGetElementValue('fd-comments'),
                // Also set legacy fields for compatibility
                bank_name: safeGetElementValue('fd-bank-name'),
                interest_rate: parseFloat(safeGetElementValue('fd-interest-rate')) || null,
                start_date: safeGetElementValue('fd-start-date') || null,
                maturity_date: safeGetElementValue('fd-maturity-date') || null,
                interest_payout: safeGetElementValue('fd-interest-payout') || 'At Maturity',
                account_number: safeGetElementValue('fd-account-number'),
                nominee: safeGetElementValue('fd-nominee'),
                comments: safeGetElementValue('fd-comments')
            });
        }

        // ===== BANK BALANCE SPECIFIC FIELDS =====
        if (type === 'bankBalances') {
            Object.assign(investmentData, {
                bank_current_balance: parseFloat(safeGetElementValue('bank-current-balance')) || null,
                bank_as_of_date: safeGetElementValue('bank-as-of-date') || null,
                bank_account_type: safeGetElementValue('bank-account-type') || null
            });
        }

        console.log('💾 Final investment data:', investmentData);

        // ===== ENHANCED DUPLICATE CHECK =====
        await checkForDuplicateInvestment(investmentData, editingInvestmentId);

        // ===== SAVE OR UPDATE =====
        if (editingInvestmentId) {
            await updateInvestmentData(editingInvestmentId, investmentData);
            showMessage('Investment updated successfully! ✅', 'success');
        } else {
            await addInvestmentData(investmentData);
            showMessage('Investment added successfully! ✅', 'success');
        }

        // ===== CREATE REMINDER FOR INSURANCE =====
        if (type === 'insurance' && !editingInvestmentId) {
            const nextPremiumDate = safeGetElementValue('ins-next-premium-date');
            if (nextPremiumDate) {
                try {
                    const reminderData = {
                        member_id: memberId,
                        title: `Premium due: ${investmentData.policy_name || investmentData.symbol_or_name}`,
                        date: nextPremiumDate,
                        type: 'insurance',
                        created_at: new Date().toISOString()
                    };
                    
                    await addReminderData(reminderData);
                    console.log('✅ Insurance reminder created');
                } catch (reminderError) {
                    console.error('Warning: Could not create reminder:', reminderError);
                }
            }
        }

        // ===== CLEANUP & REFRESH UI =====
        closeModal('investment-modal');
        renderInvestmentTabContent(type);
        renderStatsOverview();
        
        // Reset editing state
        editingInvestmentId = null;

    } catch (error) {
        console.error('❌ Save investment error:', error);
        showMessage(error.message || 'Error saving investment.', 'error');
    } finally {
        btn.disabled = false;
    }
}

// ===== ENHANCED REMINDER CREATION =====
async function addReminderData(reminderData) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        // Demo mode
        reminderData.id = generateId();
        reminders.push(reminderData);
        return reminderData;
    }

    // Supabase mode
    const { data, error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select();

    if (error) {
        throw error;
    }

    const newReminder = data[0];
    reminders.push(newReminder);
    return newReminder;
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
        console.error('Database insert error:', error);
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
        console.error('Database update error:', error);
        throw error;
    }

    // Update local data
    const investmentIndex = investments.findIndex(inv => inv.id === investmentId);
    if (investmentIndex !== -1) {
        investments[investmentIndex] = { ...investments[investmentIndex], ...investmentData };
    }
}

// ===== ENHANCED EDIT INVESTMENT WITH COMPLETE INSURANCE SUPPORT =====
function editInvestment(investmentId) {
    editingInvestmentId = investmentId;
    const investment = investments.find(inv => inv.id === investmentId);
    
    if (!investment) {
        console.error('❌ Investment not found:', investmentId);
        showMessage('Investment not found.', 'error');
        return;
    }

    console.log('📝 Editing investment:', investment);

    // Update modal title
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';

    // Populate member options first
    populateMemberOptions('investment-member');

    // Populate basic fields
    safeSetElementValue('investment-member', investment.member_id);
    safeSetElementValue('investment-type', investment.investment_type || investment.type);
    safeSetElementValue('investment-name', investment.symbol_or_name || investment.name);
    safeSetElementValue('investment-amount', investment.invested_amount);
    safeSetElementValue('investment-current-value', investment.current_value);
    safeSetElementValue('investment-platform', investment.broker_platform || investment.platform);

    // Update form to show relevant conditional fields
    updateInvestmentForm();

    // Populate type-specific fields
    const investmentType = investment.investment_type || investment.type;

    // ===== COMPLETE INSURANCE FIELD POPULATION =====
    if (investmentType === 'insurance') {
        console.log('🛡️ Populating insurance fields...');
        
        // Map all possible field variations to ensure compatibility
        const insuranceFields = {
            'ins-policy-name': investment.policy_name || investment.insurance_policy_name || investment.symbol_or_name || '',
            'ins-policy-number': investment.insurance_policy_number || investment.policy_number || '',
            'ins-company': investment.insurance_company || investment.company || '',
            'ins-type': investment.insurance_type || investment.type || '',
            'ins-sum-assured': investment.insurance_sum_assured || investment.sum_assured || investment.current_value || '',
            'ins-premium-amount': investment.insurance_premium || investment.premium_amount || '',
            'ins-premium-frequency': investment.insurance_payment_frequency || investment.premium_frequency || 'Yearly',
            'ins-start-date': investment.insurance_start_date || investment.start_date || '',
            'ins-maturity-date': investment.insurance_maturity_date || investment.maturity_date || '',
            'ins-next-premium-date': investment.insurance_next_premium_date || investment.next_premium_date || '',
            'ins-policy-status': investment.policy_status || 'Active',
            'ins-nominee': investment.insurance_nominee || investment.nominee || '',
            'ins-comments': investment.insurance_comments || investment.comments || ''
        };

        // Set all insurance fields safely
        Object.entries(insuranceFields).forEach(([fieldId, value]) => {
            const success = safeSetElementValue(fieldId, value);
            if (success) {
                console.log(`✅ Set ${fieldId}: ${value}`);
            } else {
                console.warn(`⚠️ Could not set ${fieldId}`);
            }
        });

        console.log('✅ Insurance fields populated successfully');
    }

    // ===== FIXED DEPOSIT FIELDS =====
    if (investmentType === 'fixedDeposits') {
        const fdFields = {
            'fd-bank-name': investment.fd_bank_name || investment.bank_name || '',
            'fd-interest-rate': investment.fd_interest_rate || investment.interest_rate || '',
            'fd-interest-payout': investment.fd_interest_payout || investment.interest_payout || 'At Maturity',
            'fd-start-date': investment.fd_start_date || investment.start_date || '',
            'fd-maturity-date': investment.fd_maturity_date || investment.maturity_date || '',
            'fd-account-number': investment.fd_account_number || investment.account_number || '',
            'fd-nominee': investment.fd_nominee || investment.nominee || '',
            'fd-comments': investment.fd_comments || investment.comments || ''
        };

        Object.entries(fdFields).forEach(([fieldId, value]) => {
            safeSetElementValue(fieldId, value);
        });
        
        console.log('✅ Fixed deposit fields populated');
    }

    // ===== BANK BALANCE FIELDS =====
    if (investmentType === 'bankBalances') {
        safeSetElementValue('bank-current-balance', investment.bank_current_balance || investment.current_balance || '');
        safeSetElementValue('bank-as-of-date', investment.bank_as_of_date || investment.as_of_date || '');
        safeSetElementValue('bank-account-type', investment.bank_account_type || '');
        
        console.log('✅ Bank balance fields populated');
    }

    // Open the modal
    openModal('investment-modal');
    
    console.log('📝 Investment edit form opened for:', {
        id: investmentId,
        type: investmentType,
        name: investment.symbol_or_name || investment.name
    });
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
            
            const tabText = activeTab.textContent.trim();
            const matchedType = Object.keys(typeMap).find(key => tabText.includes(key));
            if (matchedType) {
                renderInvestmentTabContent(typeMap[matchedType]);
            }
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
        // SHARED DATA - Removed user_id to make liabilities shared
        const liabilityData = {
            member_id: memberId,
            liability_type: type,
            type: type,
            lender: lender,
            outstanding_amount: amount,
            emi_amount: emi,
            interest_rate: rate,
            created_at: new Date().toISOString()
        };

        if (editingLiabilityId) {
            await updateLiabilityData(editingLiabilityId, liabilityData);
            showMessage('Liability updated successfully!', 'success');
        } else {
            await addLiabilityData(liabilityData);
            showMessage('Liability added successfully!', 'success');
        }

        renderLiabilityTabContent(type);
        renderStatsOverview();
        closeModal('liability-modal');
    } catch (error) {
        console.error('Error saving liability:', error);
        showMessage('Error saving liability: ' + error.message, 'error');
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
            
            const tabText = activeTab.textContent.trim();
            const matchedType = Object.keys(typeMap).find(key => tabText.includes(key));
            if (matchedType) {
                renderLiabilityTabContent(typeMap[matchedType]);
            }
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
        const holder = familyMembers.find(m => m.id === holderId);
        const nominee = nomineeId ? familyMembers.find(m => m.id === nomineeId) : null;

        // SHARED DATA - Removed user_id to make accounts shared
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
            await updateAccountData(editingAccountId, accountData);
            showMessage('Account updated successfully!', 'success');
        } else {
            await addAccountData(accountData);
            showMessage('Account added successfully!', 'success');
        }

        renderAccounts();
        renderStatsOverview();
        closeModal('account-modal');
    } catch (error) {
        console.error('Error saving account:', error);
        showMessage('Error saving account: ' + error.message, 'error');
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

// ===== ENHANCED EXPORT FUNCTIONS WITH MEMBER NAMES =====
function exportInvestments(format) {
    if (investments.length === 0) {
        showMessage('No investments to export.', 'warning');
        return;
    }

    // ENHANCED: Add member names to export data
    const investmentsWithMemberNames = investments.map(inv => {
        const member = familyMembers.find(m => m.id === inv.member_id);
        return {
            ...inv,
            member_name: member ? member.name : 'Unknown Member'
        };
    });

    if (format === 'csv') {
        const csvContent = convertToCSV(investmentsWithMemberNames);
        downloadFile('investments.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(investmentsWithMemberNames, null, 2);
        downloadFile('investments.json', jsonContent, 'application/json');
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) return 'No data available';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            
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

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.openAddMemberModal = openAddMemberModal;
window.saveMember = saveMember;
window.editMember = editMember;
window.deleteMember = deleteMember;
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
window.sortTable = sortTable;
window.closeModal = closeModal;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.initializeSupabase = initializeSupabase;
window.loadDashboardData = loadDashboardData;
window.showDashboard = showDashboard;
window.updateUserInfo = updateUserInfo;

// ===== APPLICATION INITIALIZATION =====
window.addEventListener('load', async () => {
    console.log('🚀 Initializing FamWealth Dashboard…');

    const supabaseInitialized = await initializeSupabase();
    console.log(supabaseInitialized
        ? '✅ Supabase connection established'
        : '⚠️ Running in demo mode without Supabase');

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            handleLogin();
        });
    }

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
});

console.log('✅ FamWealth Dashboard app-complete-fixed.js loaded - COMPLETE VERSION WITH ALL FIXES');
console.log('🔧 Ready for initialization');
