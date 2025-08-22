// ===== ENHANCED FAMWEALTH DASHBOARD - COMPLETE VERSION WITH ALL IMPROVEMENTS =====
// Enhanced JavaScript with edit functionality, photo upload, password restrictions, and more

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
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face'
];

// ===== DATA PERSISTENCE FUNCTIONS =====
function saveDataToStorage() {
    try {
        localStorage.setItem('famwealth_data', JSON.stringify(familyData));
        console.log('✅ Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving data to localStorage:', error);
    }
}

function loadDataFromStorage() {
    try {
        const stored = localStorage.getItem('famwealth_data');
        if (stored) {
            familyData = JSON.parse(stored);
            console.log('✅ Data loaded from localStorage');
            return true;
        }
    } catch (error) {
        console.error('❌ Error loading data from localStorage:', error);
    }
    return false;
}

// ===== INITIALIZATION =====
async function initializeSupabase() {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
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
                showMessage(`✅ Welcome, ${data.user.email}!`, 'success');
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

    // Fallback error message
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

// ===== CHECK PASSWORD ACCESS PERMISSION =====
function canAccessPasswords() {
    if (!currentUser || !currentUser.email) return false;
    return currentUser.email === ADMIN_EMAIL;
}

// ===== DATABASE FUNCTIONS =====
async function loadDashboardData() {
    try {
        console.log('🔄 Loading family data...');
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';

        // First try to load from localStorage
        if (loadDataFromStorage()) {
            console.log('✅ Loaded existing data from storage');
        } else {
            console.log('📝 No existing data, loading sample data...');
            loadSampleData();
            saveDataToStorage();
        }

        renderEnhancedDashboard();
        renderAccountsTable();
        renderInvestmentTabContent('equity');
        renderLiabilityTabContent('homeLoan');
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        loadSampleData();
        saveDataToStorage();
        renderEnhancedDashboard();
        renderAccountsTable();
        renderInvestmentTabContent('equity');
        renderLiabilityTabContent('homeLoan');
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
    }
}

function loadSampleData() {
    console.log('📝 Loading sample data for demo...');
    
    familyData.members = [
        {
            id: '1',
            name: 'Pradeep Kumar',
            relationship: 'Self',
            is_primary: true,
            photo_url: PRESET_PHOTOS[0],
            avatar_url: PRESET_PHOTOS[0]
        },
        {
            id: '2',
            name: 'Priya Kumar',
            relationship: 'Spouse',
            is_primary: false,
            photo_url: PRESET_PHOTOS[1],
            avatar_url: PRESET_PHOTOS[1]
        },
        {
            id: '3',
            name: 'Ramesh Kumar',
            relationship: 'Father',
            is_primary: false,
            photo_url: PRESET_PHOTOS[2],
            avatar_url: PRESET_PHOTOS[2]
        }
    ];

    // Enhanced sample investment data with new fields
    familyData.investments = {
        '1': {
            equity: [
                {
                    id: '1',
                    symbol_or_name: 'HDFC Bank',
                    invested_amount: 320000,
                    current_value: 360000,
                    broker_platform: 'HDFC Securities',
                    quantity: 200
                }
            ],
            mutualFunds: [
                {
                    id: '3',
                    symbol_or_name: 'HDFC Top 100 Fund',
                    invested_amount: 250000,
                    current_value: 285000,
                    broker_platform: 'FundsIndia',
                    quantity: 5000
                }
            ],
            fixedDeposits: [
                {
                    id: '4',
                    invested_in: 'HDFC Bank',
                    invested_amount: 500000,
                    interest_rate: 6.75,
                    maturity_date: '2025-12-31',
                    invested_date: '2024-01-01',
                    interest_payout: 'Yearly',
                    interest_amount: 33750,
                    comments: 'High-yield FD with excellent bank rating and competitive returns'
                }
            ],
            insurance: [
                {
                    id: '6',
                    insurer: 'LIC',
                    insurance_type: 'Term Life',
                    insurance_premium: 35000,
                    payment_frequency: 'Yearly',
                    invested_date: '2023-12-31',
                    maturity_date: '2045-12-31',
                    sum_assured: 5000000,
                    comments: 'Comprehensive life coverage with tax benefits and nominee protection'
                }
            ],
            bankBalances: [
                {
                    id: '8',
                    current_balance: 85000,
                    institution_name: 'HDFC Bank'
                }
            ],
            others: []
        },
        '2': {
            equity: [], mutualFunds: [], fixedDeposits: [], insurance: [], bankBalances: [], others: []
        },
        '3': {
            equity: [], mutualFunds: [], fixedDeposits: [], insurance: [], bankBalances: [], others: []
        }
    };

    // Sample liabilities data
    familyData.liabilities = {
        '1': {
            homeLoan: [
                {
                    id: 'hl1',
                    lender: 'HDFC Bank',
                    principal_amount: 5000000,
                    outstanding_amount: 3200000,
                    interest_rate: 8.5,
                    emi_amount: 45000,
                    tenure_months: 240,
                    start_date: '2020-01-01',
                    comments: 'Primary residence home loan with floating interest rate'
                }
            ],
            personalLoan: [],
            creditCard: [
                {
                    id: 'cc1',
                    bank: 'HDFC Bank',
                    lender: 'HDFC Bank',
                    card_type: 'Regalia Gold',
                    outstanding_amount: 45000,
                    credit_limit: 500000,
                    due_date: '2025-09-15',
                    comments: 'Primary credit card with reward points and cashback'
                }
            ],
            other: []
        },
        '2': { homeLoan: [], personalLoan: [], creditCard: [], other: [] },
        '3': { homeLoan: [], personalLoan: [], creditCard: [], other: [] }
    };

    // Enhanced sample account data with credentials
    familyData.accounts = [
        {
            id: 'acc1',
            account_type: 'Bank Account',
            institution: 'HDFC Bank',
            account_number: 'XXXX1234',
            holder_name: 'Pradeep Kumar',
            nominee: 'Priya Kumar',
            status: 'Active',
            username: 'pradeep.kumar@email.com',
            password: canAccessPasswords() ? 'encrypted_password_1' : '',
            comments: 'Primary salary account with auto-sweep facility'
        },
        {
            id: 'acc2',
            account_type: 'Demat Account',
            institution: 'HDFC Securities',
            account_number: 'XXXX5678',
            holder_name: 'Pradeep Kumar',
            nominee: 'Priya Kumar',
            status: 'Active',
            username: 'pradeep.kumar.demat',
            password: canAccessPasswords() ? 'encrypted_password_2' : '',
            comments: 'Main trading account for equity investments'
        }
    ];
}

// ===== EVENT DELEGATION SETUP =====
function setupEventDelegation() {
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // Edit member button
        if (target.matches('.edit-member-btn') || target.closest('.edit-member-btn')) {
            const btn = target.closest('.edit-member-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            editMember(memberId);
        }
        
        // Delete member button
        if (target.matches('.delete-member-btn') || target.closest('.delete-member-btn')) {
            const btn = target.closest('.delete-member-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            showDeleteMemberConfirm(memberId);
        }
        
        // Photo edit button
        if (target.matches('.photo-edit-btn') || target.closest('.photo-edit-btn')) {
            const btn = target.closest('.photo-edit-btn') || target;
            const memberId = btn.getAttribute('data-member-id');
            openPhotoModal(memberId);
        }
        
        // Edit investment/liability/account buttons
        if (target.matches('.edit-item-btn') || target.closest('.edit-item-btn')) {
            const btn = target.closest('.edit-item-btn') || target;
            const itemId = btn.getAttribute('data-item-id');
            const itemType = btn.getAttribute('data-item-type');
            const memberId = btn.getAttribute('data-member-id');
            editItem(itemId, itemType, memberId);
        }
        
        // Delete investment/liability/account buttons
        if (target.matches('.delete-item-btn') || target.closest('.delete-item-btn')) {
            const btn = target.closest('.delete-item-btn') || target;
            const itemId = btn.getAttribute('data-item-id');
            const itemType = btn.getAttribute('data-item-type');
            const memberId = btn.getAttribute('data-member-id');
            showDeleteItemConfirm(itemId, itemType, memberId);
        }
        
        // Photo selection in modal
        if (target.matches('.photo-option') || target.closest('.photo-option')) {
            const photoElement = target.closest('.photo-option') || target;
            selectPresetPhotoInModal(photoElement.src);
        }
    });
}

// ===== RENDER FUNCTIONS =====
function renderEnhancedDashboard() {
    const totals = calculateEnhancedTotals();
    renderEnhancedStats(totals);
    renderMemberCards();
    populateInvestmentMemberDropdown();
    console.log('✅ Enhanced dashboard rendered with detailed data');
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
    const pnlPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const netWorth = totalCurrentValue - totalLiabilities;

    return {
        totalInvested,
        totalCurrentValue,
        totalPnL,
        pnlPercentage,
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
            <div class="stat-value" style="color: var(--color-error);">₹${totals.totalLiabilities.toLocaleString()}</div>
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
        
        // Calculate member totals
        let memberInvested = 0;
        let memberCurrentValue = 0;
        let memberLiabilities = 0;
        
        // Sum all investments for this member
        ['equity', 'mutualFunds'].forEach(type => {
            (investments[type] || []).forEach(item => {
                memberInvested += parseFloat(item.invested_amount || 0);
                memberCurrentValue += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });
        
        // Add FDs
        (investments.fixedDeposits || []).forEach(fd => {
            const amount = parseFloat(fd.invested_amount || 0);
            memberInvested += amount;
            memberCurrentValue += amount;
        });
        
        // Add bank balances
        (investments.bankBalances || []).forEach(bank => {
            memberCurrentValue += parseFloat(bank.current_balance || 0);
        });
        
        // Calculate liabilities
        ['homeLoan', 'personalLoan', 'creditCard'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                memberLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });
        
        const memberPnL = memberCurrentValue - memberInvested - (investments.bankBalances || []).reduce((sum, bank) => sum + parseFloat(bank.current_balance || 0), 0);
        const pnlClass = memberPnL > 0 ? 'positive' : memberPnL < 0 ? 'negative' : 'neutral';
        
        // Count accounts
        const accountCount = Object.values(investments).reduce((total, category) => {
            if (Array.isArray(category)) return total + category.length;
            return total;
        }, 0);
        
        return `
            <div class="member-card">
                <div class="member-header">
                    <div class="member-avatar">
                        <img src="${member.photo_url || member.avatar_url || PRESET_PHOTOS[0]}" 
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
                
                <div class="member-pnl ${pnlClass}">
                    P&L: ₹${memberPnL.toLocaleString()} (${((memberPnL/Math.max(memberInvested, 1))*100).toFixed(1)}%)
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
    
    // Note: Removed quick actions and add family member button from overview as requested
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

// ===== MEMBER MANAGEMENT FUNCTIONS =====
function openAddMemberModal() {
    editingMemberId = null;
    document.getElementById('member-form').reset();
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('photo-avatar').textContent = '?';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('photo-avatar').style.display = 'flex';
    document.getElementById('member-photo-url').value = '';
    uploadedPhotoData = null;
    selectedPresetPhoto = null;
    document.getElementById('member-modal').classList.remove('hidden');
}

function editMember(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;
    
    editingMemberId = memberId;
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-relationship').value = member.relationship;
    document.getElementById('member-is-primary').checked = member.is_primary;
    
    // Set photo
    if (member.photo_url) {
        document.getElementById('photo-preview').src = member.photo_url;
        document.getElementById('photo-preview').style.display = 'block';
        document.getElementById('photo-avatar').style.display = 'none';
        document.getElementById('member-photo-url').value = member.photo_url;
    }
    
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    document.getElementById('member-modal').classList.remove('hidden');
}

function saveMember() {
    const name = document.getElementById('member-name').value.trim();
    const relationship = document.getElementById('member-relationship').value;
    const isPrimary = document.getElementById('member-is-primary').checked;
    
    if (!name || !relationship) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    let photoUrl = document.getElementById('member-photo-url').value;
    if (uploadedPhotoData) {
        photoUrl = uploadedPhotoData;
    } else if (!photoUrl) {
        photoUrl = PRESET_PHOTOS[familyData.members.length % PRESET_PHOTOS.length];
    }
    
    if (editingMemberId) {
        // Update existing member
        const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
        if (memberIndex !== -1) {
            familyData.members[memberIndex] = {
                ...familyData.members[memberIndex],
                name,
                relationship,
                is_primary: isPrimary,
                photo_url: photoUrl,
                avatar_url: photoUrl
            };
        }
        showMessage('✅ Member updated successfully', 'success');
    } else {
        // Add new member
        const newMember = {
            id: Date.now().toString(),
            name,
            relationship,
            is_primary: isPrimary,
            photo_url: photoUrl,
            avatar_url: photoUrl
        };
        
        familyData.members.push(newMember);
        
        // Initialize empty investment and liability data
        familyData.investments[newMember.id] = {
            equity: [],
            mutualFunds: [],
            fixedDeposits: [],
            insurance: [],
            bankBalances: [],
            others: []
        };
        
        familyData.liabilities[newMember.id] = {
            homeLoan: [],
            personalLoan: [],
            creditCard: [],
            other: []
        };
        
        showMessage('✅ Member added successfully', 'success');
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    document.getElementById('member-modal').classList.add('hidden');
}

function showDeleteMemberConfirm(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;
    
    deletingMemberId = memberId;
    document.getElementById('delete-member-name').textContent = member.name;
    document.getElementById('delete-member-modal').classList.remove('hidden');
}

function deleteMember() {
    if (!deletingMemberId) return;
    
    // Remove member from members array
    familyData.members = familyData.members.filter(m => m.id !== deletingMemberId);
    
    // Remove member's investment and liability data
    delete familyData.investments[deletingMemberId];
    delete familyData.liabilities[deletingMemberId];
    
    // Remove accounts belonging to this member
    const memberToDelete = familyData.members.find(m => m.id === deletingMemberId);
    if (memberToDelete) {
        familyData.accounts = familyData.accounts.filter(acc => 
            !acc.holder_name.includes(memberToDelete.name)
        );
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    renderAccountsTable();
    document.getElementById('delete-member-modal').classList.add('hidden');
    deletingMemberId = null;
    
    showMessage('✅ Member deleted successfully', 'success');
}

function closeDeleteMemberModal() {
    document.getElementById('delete-member-modal').classList.add('hidden');
    deletingMemberId = null;
}

// ===== ENHANCED PHOTO MANAGEMENT FUNCTIONS =====
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedPhotoData = e.target.result;
        
        // Update preview
        document.getElementById('photo-preview').src = uploadedPhotoData;
        document.getElementById('photo-preview').style.display = 'block';
        document.getElementById('photo-avatar').style.display = 'none';
        document.getElementById('member-photo-url').value = uploadedPhotoData;
        
        showMessage('✅ Photo uploaded successfully', 'success');
    };
    
    reader.readAsDataURL(file);
}

function openPhotoSelectModal() {
    selectedPresetPhoto = null;
    
    // Render preset photo options
    const photoOptionsHTML = PRESET_PHOTOS.map((photoUrl, index) => `
        <div class="photo-option" onclick="selectPresetPhotoInModal('${photoUrl}')" data-photo-url="${photoUrl}">
            <img src="${photoUrl}" alt="Preset ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
    `).join('');
    
    document.getElementById('preset-photos').innerHTML = photoOptionsHTML;
    document.getElementById('photo-select-modal').classList.remove('hidden');
}

function selectPresetPhotoInModal(photoUrl) {
    selectedPresetPhoto = photoUrl;
    
    // Clear previous selections
    document.querySelectorAll('.photo-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked photo
    document.querySelector(`[data-photo-url="${photoUrl}"]`).classList.add('selected');
}

function selectPresetPhoto() {
    if (!selectedPresetPhoto) {
        showMessage('Please select a photo', 'error');
        return;
    }
    
    // Update the main modal preview
    document.getElementById('photo-preview').src = selectedPresetPhoto;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-avatar').style.display = 'none';
    document.getElementById('member-photo-url').value = selectedPresetPhoto;
    
    // Clear uploaded photo data since we're using preset
    uploadedPhotoData = null;
    
    document.getElementById('photo-select-modal').classList.add('hidden');
    showMessage('✅ Photo selected successfully', 'success');
}

// ===== ENHANCED INVESTMENT MANAGEMENT FUNCTIONS =====
function openAddInvestmentModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('investment-form').reset();
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    document.getElementById('investment-id').value = '';
    document.getElementById('investment-member-id').value = '';
    
    // Hide type-specific fields initially
    document.getElementById('fd-specific-fields').style.display = 'none';
    document.getElementById('insurance-specific-fields').style.display = 'none';
    
    document.getElementById('investment-modal').classList.remove('hidden');
    populateInvestmentMemberDropdown();
}

function editItem(itemId, itemType, memberId) {
    if (itemType === 'account') {
        editAccount(itemId);
        return;
    }
    
    // For investments and liabilities
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;
    
    let item = null;
    if (familyData.investments[memberId] && familyData.investments[memberId][itemType]) {
        item = familyData.investments[memberId][itemType].find(i => i.id === itemId);
        if (item) {
            editInvestment(itemId, itemType, memberId);
            return;
        }
    }
    
    if (familyData.liabilities[memberId] && familyData.liabilities[memberId][itemType]) {
        item = familyData.liabilities[memberId][itemType].find(i => i.id === itemId);
        if (item) {
            editLiability(itemId, itemType, memberId);
            return;
        }
    }
}

function editInvestment(itemId, itemType, memberId) {
    const item = familyData.investments[memberId][itemType].find(i => i.id === itemId);
    if (!item) return;
    
    editingItemId = itemId;
    editingItemType = itemType;
    editingItemMemberId = memberId;
    
    // Populate form fields
    document.getElementById('investment-id').value = itemId;
    document.getElementById('investment-member-id').value = memberId;
    document.getElementById('investment-member').value = memberId;
    document.getElementById('investment-type').value = itemType;
    document.getElementById('investment-name').value = item.symbol_or_name || item.invested_in || item.insurer || '';
    document.getElementById('investment-amount').value = item.invested_amount || item.insurance_premium || '';
    document.getElementById('investment-current-value').value = item.current_value || '';
    document.getElementById('investment-platform').value = item.broker_platform || '';
    
    // Show type-specific fields and populate them
    if (itemType === 'fixedDeposits') {
        document.getElementById('fd-specific-fields').style.display = 'block';
        document.getElementById('fd-interest-rate').value = item.interest_rate || '';
        document.getElementById('fd-invested-date').value = item.invested_date || '';
        document.getElementById('fd-maturity-date').value = item.maturity_date || '';
        document.getElementById('fd-interest-payout').value = item.interest_payout || '';
        document.getElementById('fd-comments').value = item.comments || '';
    } else if (itemType === 'insurance') {
        document.getElementById('insurance-specific-fields').style.display = 'block';
        document.getElementById('insurance-type').value = item.insurance_type || '';
        document.getElementById('insurance-premium').value = item.insurance_premium || '';
        document.getElementById('insurance-sum-assured').value = item.sum_assured || '';
        document.getElementById('insurance-frequency').value = item.payment_frequency || '';
        document.getElementById('insurance-invested-date').value = item.invested_date || '';
        document.getElementById('insurance-maturity').value = item.maturity_date || '';
        document.getElementById('insurance-comments').value = item.comments || '';
    }
    
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';
    document.getElementById('investment-modal').classList.remove('hidden');
    populateInvestmentMemberDropdown();
}

function updateInvestmentForm() {
    const type = document.getElementById('investment-type').value;
    
    // Hide all type-specific fields first
    document.getElementById('fd-specific-fields').style.display = 'none';
    document.getElementById('insurance-specific-fields').style.display = 'none';
    
    // Show relevant fields based on type
    if (type === 'fixedDeposits') {
        document.getElementById('fd-specific-fields').style.display = 'block';
    } else if (type === 'insurance') {
        document.getElementById('insurance-specific-fields').style.display = 'block';
    }
}

function saveInvestment() {
    const memberId = document.getElementById('investment-member').value;
    const type = document.getElementById('investment-type').value;
    const name = document.getElementById('investment-name').value.trim();
    const amount = document.getElementById('investment-amount').value;
    const currentValue = document.getElementById('investment-current-value').value;
    const platform = document.getElementById('investment-platform').value.trim();
    
    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    let investmentData = {
        symbol_or_name: name,
        invested_amount: parseFloat(amount),
        current_value: parseFloat(currentValue) || parseFloat(amount),
        broker_platform: platform,
        quantity: 1
    };
    
    // Add type-specific fields
    if (type === 'fixedDeposits') {
        investmentData = {
            ...investmentData,
            invested_in: name,
            interest_rate: parseFloat(document.getElementById('fd-interest-rate').value) || 0,
            invested_date: document.getElementById('fd-invested-date').value,
            maturity_date: document.getElementById('fd-maturity-date').value,
            interest_payout: document.getElementById('fd-interest-payout').value,
            comments: document.getElementById('fd-comments').value.trim()
        };
        delete investmentData.symbol_or_name; // Use invested_in for FDs
    } else if (type === 'insurance') {
        investmentData = {
            ...investmentData,
            insurer: name,
            insurance_type: document.getElementById('insurance-type').value,
            insurance_premium: parseFloat(amount),
            sum_assured: parseFloat(document.getElementById('insurance-sum-assured').value) || 0,
            payment_frequency: document.getElementById('insurance-frequency').value,
            invested_date: document.getElementById('insurance-invested-date').value,
            maturity_date: document.getElementById('insurance-maturity').value,
            comments: document.getElementById('insurance-comments').value.trim()
        };
        delete investmentData.symbol_or_name; // Use insurer for insurance
        delete investmentData.invested_amount; // Use insurance_premium
    }
    
    if (!familyData.investments[memberId]) {
        familyData.investments[memberId] = {
            equity: [], mutualFunds: [], fixedDeposits: [], insurance: [], bankBalances: [], others: []
        };
    }
    
    if (editingItemId) {
        // Update existing investment
        const itemIndex = familyData.investments[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.investments[memberId][type][itemIndex] = {
                ...investmentData,
                id: editingItemId
            };
        }
        showMessage('✅ Investment updated successfully', 'success');
    } else {
        // Add new investment
        const newInvestment = {
            ...investmentData,
            id: Date.now().toString()
        };
        familyData.investments[memberId][type].push(newInvestment);
        showMessage('✅ Investment added successfully', 'success');
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    renderInvestmentTabContent(type);
    document.getElementById('investment-modal').classList.add('hidden');
}

// ===== ENHANCED LIABILITY MANAGEMENT FUNCTIONS =====
function openAddLiabilityModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('liability-form').reset();
    document.getElementById('liability-modal-title').textContent = 'Add Liability';
    document.getElementById('liability-id').value = '';
    document.getElementById('liability-member-id').value = '';
    document.getElementById('liability-modal').classList.remove('hidden');
    populateInvestmentMemberDropdown();
}

function editLiability(itemId, itemType, memberId) {
    const item = familyData.liabilities[memberId][itemType].find(i => i.id === itemId);
    if (!item) return;
    
    editingItemId = itemId;
    editingItemType = itemType;
    editingItemMemberId = memberId;
    
    // Populate form fields
    document.getElementById('liability-id').value = itemId;
    document.getElementById('liability-member-id').value = memberId;
    document.getElementById('liability-member').value = memberId;
    document.getElementById('liability-type').value = itemType;
    document.getElementById('liability-lender').value = item.lender || item.bank || '';
    document.getElementById('liability-outstanding').value = item.outstanding_amount || '';
    document.getElementById('liability-emi').value = item.emi_amount || '';
    document.getElementById('liability-interest').value = item.interest_rate || '';
    document.getElementById('liability-comments').value = item.comments || '';
    
    document.getElementById('liability-modal-title').textContent = 'Edit Liability';
    document.getElementById('liability-modal').classList.remove('hidden');
    populateInvestmentMemberDropdown();
}

function saveLiability() {
    const memberId = document.getElementById('liability-member').value;
    const type = document.getElementById('liability-type').value;
    const lender = document.getElementById('liability-lender').value.trim();
    const outstanding = document.getElementById('liability-outstanding').value;
    const emi = document.getElementById('liability-emi').value;
    const interest = document.getElementById('liability-interest').value;
    const comments = document.getElementById('liability-comments').value.trim();
    
    if (!memberId || !type || !lender || !outstanding) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const liabilityData = {
        type: type,
        lender: lender,
        bank: lender,
        outstanding_amount: parseFloat(outstanding),
        emi_amount: parseFloat(emi) || 0,
        interest_rate: parseFloat(interest) || 0,
        comments: comments
    };
    
    if (!familyData.liabilities[memberId]) {
        familyData.liabilities[memberId] = {
            homeLoan: [], personalLoan: [], creditCard: [], other: []
        };
    }
    
    if (editingItemId) {
        // Update existing liability
        const itemIndex = familyData.liabilities[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.liabilities[memberId][type][itemIndex] = {
                ...liabilityData,
                id: editingItemId
            };
        }
        showMessage('✅ Liability updated successfully', 'success');
    } else {
        // Add new liability
        const newLiability = {
            ...liabilityData,
            id: Date.now().toString()
        };
        familyData.liabilities[memberId][type].push(newLiability);
        showMessage('✅ Liability added successfully', 'success');
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    renderLiabilityTabContent(type);
    document.getElementById('liability-modal').classList.add('hidden');
}

// ===== ENHANCED ACCOUNT MANAGEMENT FUNCTIONS =====
function openAddAccountModal() {
    editingItemId = null;
    document.getElementById('account-form').reset();
    document.getElementById('account-modal-title').textContent = 'Add Account';
    document.getElementById('account-id').value = '';
    
    // Show/hide password field based on permissions
    const passwordField = document.getElementById('account-password');
    const passwordWarning = document.getElementById('password-access-warning');
    
    if (canAccessPasswords()) {
        passwordField.style.display = 'block';
        passwordField.disabled = false;
        passwordWarning.style.display = 'none';
    } else {
        passwordField.style.display = 'none';
        passwordField.disabled = true;
        passwordWarning.style.display = 'block';
    }
    
    document.getElementById('account-modal').classList.remove('hidden');
    populateAccountHolderDropdown();
}

function editAccount(accountId) {
    const account = familyData.accounts.find(a => a.id === accountId);
    if (!account) return;
    
    editingItemId = accountId;
    
    // Populate form fields
    document.getElementById('account-id').value = accountId;
    document.getElementById('account-type').value = account.account_type || '';
    document.getElementById('account-institution').value = account.institution || '';
    document.getElementById('account-number').value = account.account_number || '';
    document.getElementById('account-status').value = account.status || 'Active';
    document.getElementById('account-comments').value = account.comments || '';
    document.getElementById('account-username').value = account.username || '';
    
    // Handle password field based on permissions
    const passwordField = document.getElementById('account-password');
    const passwordWarning = document.getElementById('password-access-warning');
    
    if (canAccessPasswords()) {
        passwordField.value = account.password || '';
        passwordField.style.display = 'block';
        passwordField.disabled = false;
        passwordWarning.style.display = 'none';
    } else {
        passwordField.value = '';
        passwordField.style.display = 'none';
        passwordField.disabled = true;
        passwordWarning.style.display = 'block';
    }
    
    // Set holder and nominee
    const holder = familyData.members.find(m => m.name === account.holder_name);
    const nominee = familyData.members.find(m => m.name === account.nominee);
    
    if (holder) document.getElementById('account-holder').value = holder.id;
    if (nominee) document.getElementById('account-nominee').value = nominee.id;
    
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    document.getElementById('account-modal').classList.remove('hidden');
    populateAccountHolderDropdown();
}

function saveAccount() {
    const accountType = document.getElementById('account-type').value;
    const institution = document.getElementById('account-institution').value.trim();
    const accountNumber = document.getElementById('account-number').value.trim();
    const holderId = document.getElementById('account-holder').value;
    const nomineeId = document.getElementById('account-nominee').value;
    const status = document.getElementById('account-status').value;
    const comments = document.getElementById('account-comments').value.trim();
    const username = document.getElementById('account-username').value.trim();
    
    if (!accountType || !institution || !accountNumber || !holderId) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const holder = familyData.members.find(m => m.id === holderId);
    const nominee = nomineeId ? familyData.members.find(m => m.id === nomineeId) : null;
    
    const accountData = {
        account_type: accountType,
        institution: institution,
        account_number: accountNumber,
        holder_name: holder ? holder.name : 'Unknown',
        nominee: nominee ? nominee.name : '',
        status: status,
        comments: comments,
        username: username
    };
    
    // Add password only if user has permission
    if (canAccessPasswords()) {
        accountData.password = document.getElementById('account-password').value.trim();
    }
    
    if (editingItemId) {
        // Update existing account
        const accountIndex = familyData.accounts.findIndex(a => a.id === editingItemId);
        if (accountIndex !== -1) {
            familyData.accounts[accountIndex] = {
                ...accountData,
                id: editingItemId
            };
        }
        showMessage('✅ Account updated successfully', 'success');
    } else {
        // Add new account
        const newAccount = {
            ...accountData,
            id: Date.now().toString()
        };
        familyData.accounts.push(newAccount);
        showMessage('✅ Account added successfully', 'success');
    }
    
    saveDataToStorage();
    renderAccountsTable();
    document.getElementById('account-modal').classList.add('hidden');
}

function populateAccountHolderDropdown() {
    const holderSelect = document.getElementById('account-holder');
    const nomineeSelect = document.getElementById('account-nominee');
    
    const options = familyData.members.map(member => 
        `<option value="${member.id}">${member.name}</option>`
    ).join('');
    
    holderSelect.innerHTML = '<option value="">Select Holder</option>' + options;
    nomineeSelect.innerHTML = '<option value="">Select Nominee</option>' + options;
}

function renderAccountsTable() {
    const tableBody = document.querySelector('#accounts-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = familyData.accounts.map(account => {
        const credentialsInfo = canAccessPasswords() && account.username ? 
            `${account.username} / ${account.password ? '••••••••' : 'No password'}` : 
            (account.username ? `${account.username} / Access Restricted` : 'No credentials');
            
        return `
            <tr>
                <td>${account.account_type}</td>
                <td>${account.institution}</td>
                <td>${account.account_number}</td>
                <td>${account.holder_name}</td>
                <td>${account.nominee || 'Not specified'}</td>
                <td><span class="status status--${account.status.toLowerCase() === 'active' ? 'success' : 'error'}">${account.status}</span></td>
                <td>${(account.comments && account.comments.length > 30) ? account.comments.substring(0, 30) + '...' : (account.comments || 'No comments')}</td>
                <td>
                    <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${account.id}" data-item-type="account" title="Edit Account">✏️</button>
                    <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" 
                            data-item-id="${account.id}" data-item-type="account" title="Delete Account">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== TAB CONTENT RENDERING FUNCTIONS =====
function showInvestmentTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#investments-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Render content for the selected tab
    renderInvestmentTabContent(tabName);
}

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

function showLiabilityTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#liabilities-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Render content for the selected tab
    renderLiabilityTabContent(tabName);
}

function renderLiabilityTabContent(tabName) {
    let allLiabilities = [];
    
    familyData.members.forEach(member => {
        const liabilities = familyData.liabilities[member.id] || {};
        const items = liabilities[tabName] || [];
        
        items.forEach(item => {
            allLiabilities.push({
                ...item,
                memberName: member.name,
                memberId: member.id,
                type: tabName
            });
        });
    });
    
    let contentHTML = '';
    if (allLiabilities.length > 0) {
        contentHTML = `
            <div class="investment-table">
                <table>
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Lender/Bank</th>
                            <th>Outstanding Amount</th>
                            <th>EMI/Payment</th>
                            <th>Interest Rate</th>
                            <th>Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allLiabilities.map(liability => `
                            <tr>
                                <td>${liability.memberName}</td>
                                <td>${liability.lender || liability.bank || 'N/A'}</td>
                                <td>₹${(liability.outstanding_amount || 0).toLocaleString()}</td>
                                <td>₹${(liability.emi_amount || 0).toLocaleString()}</td>
                                <td>${liability.interest_rate || 'N/A'}%</td>
                                <td title="${liability.comments || 'No comments'}">${(liability.comments && liability.comments.length > 30) ? liability.comments.substring(0, 30) + '...' : (liability.comments || 'No comments')}</td>
                                <td>
                                    <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${liability.id}" data-item-type="${liability.type}" data-member-id="${liability.memberId}" title="Edit">✏️</button>
                                    <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" 
                                            data-item-id="${liability.id}" data-item-type="${liability.type}" data-member-id="${liability.memberId}" title="Delete">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                <h4>No ${getLiabilityDisplayName(tabName)} Found</h4>
                <p style="color: #6b7280; margin: 1rem 0;">Add your first ${tabName.toLowerCase()} to get started.</p>
                <button class="btn btn--primary" onclick="openAddLiabilityModal()">+ Add ${getLiabilityDisplayName(tabName)}</button>
            </div>
        `;
    }
    
    document.getElementById('liability-tabs-content').innerHTML = contentHTML;
}

// ===== DELETE ITEM FUNCTIONS =====
function showDeleteItemConfirm(itemId, itemType, memberId) {
    if (confirm('Are you sure you want to delete this item?')) {
        deleteItem(itemId, itemType, memberId);
    }
}

function deleteItem(itemId, itemType, memberId) {
    if (itemType === 'account') {
        // Delete from accounts array
        familyData.accounts = familyData.accounts.filter(acc => acc.id !== itemId);
        renderAccountsTable();
        showMessage('✅ Account deleted successfully', 'success');
    } else if (memberId) {
        // Delete from member's investments or liabilities
        if (familyData.investments[memberId] && familyData.investments[memberId][itemType]) {
            familyData.investments[memberId][itemType] = familyData.investments[memberId][itemType].filter(item => item.id !== itemId);
            renderInvestmentTabContent(itemType);
            showMessage('✅ Investment deleted successfully', 'success');
        }
        if (familyData.liabilities[memberId] && familyData.liabilities[memberId][itemType]) {
            familyData.liabilities[memberId][itemType] = familyData.liabilities[memberId][itemType].filter(item => item.id !== itemId);
            renderLiabilityTabContent(itemType);
            showMessage('✅ Liability deleted successfully', 'success');
        }
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
}

// ===== UTILITY FUNCTIONS =====
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

// ===== MODAL FUNCTIONS =====
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ===== NAVIGATION FUNCTIONS =====
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// ===== INITIALIZATION ON DOM LOAD =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Enhanced FamWealth Dashboard initializing...');
    
    // Initialize Supabase
    await initializeSupabase();
    
    // Setup event delegation
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
    
    console.log('✅ Enhanced Dashboard initialization complete with all improvements');
});
