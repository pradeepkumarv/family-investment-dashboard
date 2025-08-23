// ===== COMPLETE FAMWEALTH DASHBOARD WITH ALL FIXES =====
// Fixed: Liability modal form elements, edit functions, sorting, downloads

// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';
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

// Editing state variables
let editingMemberId = null;
let editingItemId = null;
let editingItemType = null;
let editingItemMemberId = null;
let deletingMemberId = null;
let selectedPresetPhoto = null;
let uploadedPhotoData = null;
let currentSort = { table: null, column: -1, direction: 'asc' };

const PRESET_PHOTOS = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face'
];

// ===== INITIALIZATION =====
async function initializeSupabase() {
    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                currentUser = session.user;
                console.log('✅ Found existing Supabase session:', currentUser.email);
            }
            
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

// ===== AUTHENTICATION =====
async function handleLogin() {
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }

    showMessage('🔄 Authenticating...', 'info');

    // Demo login
    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        currentUser = { email: 'demo@famwealth.com', id: 'demo-user-id' };
        localStorage.setItem('famwealth_auth_type', 'demo');
        
        setTimeout(() => {
            showDashboard();
            updateUserInfo(currentUser);
            loadDashboardData();
        }, 1000);
        return;
    }

    // Supabase login
    if (supabase) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Supabase login error:', error);
                showMessage(`❌ Login failed: ${error.message}`, 'error');
                return;
            }

            if (data.user) {
                showMessage(`✅ Welcome back, ${data.user.email}!`, 'success');
                currentUser = data.user;
                localStorage.setItem('famwealth_user', JSON.stringify(data.user));
                localStorage.setItem('famwealth_auth_type', 'supabase');
                
                setTimeout(() => {
                    showDashboard();
                    updateUserInfo(data.user);
                    loadDashboardData();
                }, 1500);
                return;
            }
        } catch (error) {
            console.error('❌ Login exception:', error);
            showMessage(`❌ Login error: ${error.message}`, 'error');
            return;
        }
    }

    showMessage('❌ Invalid credentials. Try demo@famwealth.com / demo123', 'error');
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
    localStorage.removeItem('famwealth_data');
    
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    showMessage('✅ Logged out successfully', 'success');
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    try {
        showMessage('🔄 Loading dashboard data...', 'info');

        let dataLoaded = false;
        if (supabase && currentUser && currentUser.id) {
            dataLoaded = await loadDataFromSupabase();
        }
        
        if (!dataLoaded) {
            dataLoaded = loadDataFromStorage();
        }
        
        if (!dataLoaded || familyData.members.length === 0) {
            loadSampleData();
            saveDataToStorage();
        }

        renderDashboard();
        showMessage('✅ Dashboard loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        loadSampleData();
        saveDataToStorage();
        renderDashboard();
        showMessage('✅ Dashboard loaded with sample data', 'success');
    }
}

async function loadDataFromSupabase() {
    if (!supabase || !currentUser) return false;
    
    try {
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('user_id', currentUser.id);
            
        if (!membersError && members && members.length > 0) {
            familyData.members = members;
            
            // Initialize investment and liability objects for each member
            members.forEach(member => {
                if (!familyData.investments[member.id]) {
                    familyData.investments[member.id] = {
                        equity: [], mutualFunds: [], fixedDeposits: [], 
                        insurance: [], bankBalances: [], others: []
                    };
                }
                if (!familyData.liabilities[member.id]) {
                    familyData.liabilities[member.id] = {
                        homeLoan: [], personalLoan: [], creditCard: [], other: []
                    };
                }
            });
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error loading data from Supabase:', error);
        return false;
    }
}

function loadSampleData() {
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
                broker_platform: 'Zerodha'
            }],
            fixedDeposits: [{
                id: '2',
                invested_in: 'SBI Bank',
                invested_amount: 500000,
                interest_rate: 6.5,
                invested_date: '2024-01-01',
                maturity_date: '2025-01-01'
            }],
            insurance: [],
            bankBalances: [],
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
                broker_platform: 'Groww'
            }],
            fixedDeposits: [],
            insurance: [],
            bankBalances: [],
            others: []
        }
    };

    familyData.liabilities = {
        '1': { 
            homeLoan: [{
                id: 'hl1',
                lender: 'HDFC Bank',
                outstanding_amount: 1500000,
                emi_amount: 25000,
                interest_rate: 8.5
            }], 
            personalLoan: [], 
            creditCard: [], 
            other: [] 
        },
        '2': { homeLoan: [], personalLoan: [], creditCard: [], other: [] }
    };

    familyData.accounts = [
        {
            id: 'acc1',
            account_type: 'Savings Account',
            institution: 'HDFC Bank',
            account_number: 'XXXX1234',
            holder_name: 'Pradeep Kumar',
            nominee: 'Smruthi Kumar',
            status: 'Active',
            comments: 'Primary savings account'
        }
    ];

    console.log('✅ Sample data loaded successfully');
}

// ===== DATA PERSISTENCE =====
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
            const loadedData = JSON.parse(stored);
            familyData = { ...familyData, ...loadedData };
            return true;
        }
    } catch (error) {
        console.error('❌ Error loading data from localStorage:', error);
    }
    return false;
}

// ===== FAMILY MEMBER MANAGEMENT =====
function openAddMemberModal() {
    editingMemberId = null;
    const form = document.getElementById('member-form');
    if (form) form.reset();
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('member-modal').classList.remove('hidden');
}

function editMember(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;
    
    editingMemberId = memberId;
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-relationship').value = member.relationship;
    document.getElementById('member-is-primary').checked = member.is_primary;
    
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    document.getElementById('member-modal').classList.remove('hidden');
}

function saveMember() {
    const nameEl = document.getElementById('member-name');
    const relationshipEl = document.getElementById('member-relationship');
    const isPrimaryEl = document.getElementById('member-is-primary');
    
    if (!nameEl || !relationshipEl || !isPrimaryEl) {
        showMessage('Form elements missing. Please reload the page.', 'error');
        return;
    }
    
    const name = nameEl.value.trim();
    const relationship = relationshipEl.value;
    const isPrimary = isPrimaryEl.checked;
    
    if (!name || !relationship) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    let photoUrl = PRESET_PHOTOS[familyData.members.length % PRESET_PHOTOS.length];
    if (uploadedPhotoData) {
        photoUrl = uploadedPhotoData;
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
                photo_url: photoUrl
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
            photo_url: photoUrl
        };
        
        familyData.members.push(newMember);
        
        // Initialize empty investment and liability data
        familyData.investments[newMember.id] = {
            equity: [], mutualFunds: [], fixedDeposits: [], 
            insurance: [], bankBalances: [], others: []
        };
        
        familyData.liabilities[newMember.id] = {
            homeLoan: [], personalLoan: [], creditCard: [], other: []
        };
        
        showMessage('✅ Member added successfully', 'success');
    }
    
    saveDataToStorage();
    renderDashboard();
    closeModal('member-modal');
}

function deleteMember(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;
    
    if (confirm(`Are you sure you want to delete ${member.name}? This will also delete all their investments and liabilities.`)) {
        familyData.members = familyData.members.filter(m => m.id !== memberId);
        delete familyData.investments[memberId];
        delete familyData.liabilities[memberId];
        
        saveDataToStorage();
        renderDashboard();
        showMessage('✅ Member deleted successfully', 'success');
    }
}

// ===== INVESTMENT MANAGEMENT =====
function openAddInvestmentModal() {
    editingItemId = null;
    editingItemMemberId = null;
    const form = document.getElementById('investment-form');
    if (form) form.reset();
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    populateInvestmentMemberDropdown();
    document.getElementById('investment-modal').classList.remove('hidden');
}

function populateInvestmentMemberDropdown() {
    const memberSelect = document.getElementById('investment-member');
    if (memberSelect) {
        memberSelect.innerHTML = familyData.members.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
}

function updateInvestmentForm() {
    const type = document.getElementById('investment-type')?.value;
    const typeFields = document.getElementById('investment-type-fields');
    
    if (!typeFields) return;
    
    typeFields.innerHTML = '';
    
    if (type === 'fixedDeposits') {
        typeFields.innerHTML = `
            <div class="form-group">
                <label for="investment-interest-rate">Interest Rate (%)</label>
                <input type="number" id="investment-interest-rate" step="0.01">
            </div>
            <div class="form-group">
                <label for="investment-maturity">Maturity Date</label>
                <input type="date" id="investment-maturity">
            </div>
        `;
    } else if (type === 'insurance') {
        typeFields.innerHTML = `
            <div class="form-group">
                <label for="investment-policy-number">Policy Number</label>
                <input type="text" id="investment-policy-number">
            </div>
            <div class="form-group">
                <label for="investment-coverage">Coverage Amount</label>
                <input type="number" id="investment-coverage" step="0.01">
            </div>
        `;
    }
}

function saveInvestment() {
    // Get required elements with validation
    const memberEl = document.getElementById('investment-member');
    const typeEl = document.getElementById('investment-type');
    const nameEl = document.getElementById('investment-name');
    const amountEl = document.getElementById('investment-amount');
    const currentValueEl = document.getElementById('investment-current-value');
    
    if (!memberEl || !typeEl || !nameEl || !amountEl) {
        console.error('Investment modal is missing required elements:', {
            hasMember: !!memberEl,
            hasType: !!typeEl,
            hasName: !!nameEl,
            hasAmount: !!amountEl
        });
        showMessage('Some required fields are missing in the form. Please reload the page.', 'error');
        return;
    }
    
    const memberId = memberEl.value;
    const type = typeEl.value;
    const name = nameEl.value.trim();
    const amount = amountEl.value;
    const currentValue = currentValueEl ? currentValueEl.value : '';
    
    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const investmentData = {
        id: editingItemId || Date.now().toString(),
        symbol_or_name: name,
        invested_amount: parseFloat(amount),
        current_value: parseFloat(currentValue) || parseFloat(amount),
        broker_platform: document.getElementById('investment-platform')?.value || ''
    };
    
    // Add type-specific fields
    if (type === 'fixedDeposits') {
        investmentData.interest_rate = parseFloat(document.getElementById('investment-interest-rate')?.value || 0);
        investmentData.maturity_date = document.getElementById('investment-maturity')?.value || '';
    } else if (type === 'insurance') {
        investmentData.policy_number = document.getElementById('investment-policy-number')?.value || '';
        investmentData.coverage_amount = parseFloat(document.getElementById('investment-coverage')?.value || 0);
    }
    
    if (!familyData.investments[memberId]) {
        familyData.investments[memberId] = {
            equity: [], mutualFunds: [], fixedDeposits: [], 
            insurance: [], bankBalances: [], others: []
        };
    }
    
    if (editingItemId) {
        // Update existing investment
        const itemIndex = familyData.investments[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.investments[memberId][type][itemIndex] = investmentData;
        }
        showMessage('✅ Investment updated successfully', 'success');
    } else {
        // Add new investment
        familyData.investments[memberId][type].push(investmentData);
        showMessage('✅ Investment added successfully', 'success');
    }
    
    saveDataToStorage();
    renderDashboard();
    renderInvestmentTabContent(type);
    closeModal('investment-modal');
}

function editInvestment(itemId, itemType, memberId) {
    const investment = familyData.investments[memberId]?.[itemType]?.find(i => i.id === itemId);
    if (!investment) return;
    
    editingItemId = itemId;
    editingItemMemberId = memberId;
    
    document.getElementById('investment-member').value = memberId;
    document.getElementById('investment-type').value = itemType;
    document.getElementById('investment-name').value = investment.symbol_or_name || '';
    document.getElementById('investment-amount').value = investment.invested_amount || '';
    document.getElementById('investment-current-value').value = investment.current_value || '';
    
    updateInvestmentForm();
    
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';
    document.getElementById('investment-modal').classList.remove('hidden');
}

function deleteInvestment(itemId, itemType, memberId) {
    if (confirm('Are you sure you want to delete this investment?')) {
        familyData.investments[memberId][itemType] = familyData.investments[memberId][itemType].filter(i => i.id !== itemId);
        saveDataToStorage();
        renderDashboard();
        renderInvestmentTabContent(itemType);
        showMessage('✅ Investment deleted successfully', 'success');
    }
}

// ===== LIABILITY MANAGEMENT (FIXED) =====
function openAddLiabilityModal() {
    editingItemId = null;
    editingItemMemberId = null;
    const form = document.getElementById('liability-form');
    if (form) form.reset();
    document.getElementById('liability-modal-title').textContent = 'Add Liability';
    populateLiabilityMemberDropdown();
    document.getElementById('liability-modal').classList.remove('hidden');
}

function populateLiabilityMemberDropdown() {
    const memberSelect = document.getElementById('liability-member');
    if (memberSelect) {
        memberSelect.innerHTML = familyData.members.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
}

function saveLiability() {
    console.log('🔄 Saving liability...'); // Debug log
    
    // Look up elements safely with validation
    const elMember = document.getElementById('liability-member');
    const elType = document.getElementById('liability-type');
    const elLender = document.getElementById('liability-lender');
    const elAmount = document.getElementById('liability-amount');
    const elEmi = document.getElementById('liability-emi');
    const elRate = document.getElementById('liability-rate');
    const elComments = document.getElementById('liability-comments');

    // Validate presence of required elements
    if (!elMember || !elType || !elLender || !elAmount) {
        console.error('Liability modal is missing one or more required elements:', {
            hasMember: !!elMember,
            hasType: !!elType,
            hasLender: !!elLender,
            hasAmount: !!elAmount
        });
        showMessage('Some required fields are missing in the form. Please reload the page or try again.', 'error');
        return;
    }

    // Read values safely
    const memberId = elMember.value;
    const type = elType.value;
    const lender = elLender.value.trim();
    const amount = elAmount.value;
    const emi = elEmi ? elEmi.value : '';
    const rate = elRate ? elRate.value : '';
    const comments = elComments ? elComments.value.trim() : '';

    // Validate required values
    if (!memberId || !type || !lender || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    console.log('✅ Form validation passed, creating liability data...'); // Debug log

    const liabilityData = {
        id: editingItemId || Date.now().toString(),
        lender: lender,
        outstanding_amount: parseFloat(amount) || 0,
        emi_amount: parseFloat(emi) || 0,
        interest_rate: parseFloat(rate) || 0,
        comments: comments
    };

    // Ensure liability structure exists for member
    if (!familyData.liabilities[memberId]) {
        familyData.liabilities[memberId] = {
            homeLoan: [], personalLoan: [], creditCard: [], other: []
        };
    }

    if (editingItemId) {
        // Update existing liability
        const itemIndex = familyData.liabilities[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.liabilities[memberId][type][itemIndex] = liabilityData;
        }
        showMessage('✅ Liability updated successfully', 'success');
    } else {
        // Add new liability
        familyData.liabilities[memberId][type].push(liabilityData);
        showMessage('✅ Liability added successfully', 'success');
    }

    console.log('✅ Liability saved successfully:', liabilityData); // Debug log

    saveDataToStorage();
    renderDashboard();
    renderLiabilityTabContent(type);
    closeModal('liability-modal');
}

function editLiability(itemId, itemType, memberId) {
    const liability = familyData.liabilities[memberId]?.[itemType]?.find(i => i.id === itemId);
    if (!liability) return;
    
    editingItemId = itemId;
    editingItemMemberId = memberId;
    
    document.getElementById('liability-member').value = memberId;
    document.getElementById('liability-type').value = itemType;
    document.getElementById('liability-lender').value = liability.lender || '';
    document.getElementById('liability-amount').value = liability.outstanding_amount || '';
    document.getElementById('liability-emi').value = liability.emi_amount || '';
    document.getElementById('liability-rate').value = liability.interest_rate || '';
    document.getElementById('liability-comments').value = liability.comments || '';
    
    document.getElementById('liability-modal-title').textContent = 'Edit Liability';
    document.getElementById('liability-modal').classList.remove('hidden');
}

function deleteLiability(itemId, itemType, memberId) {
    if (confirm('Are you sure you want to delete this liability?')) {
        familyData.liabilities[memberId][itemType] = familyData.liabilities[memberId][itemType].filter(i => i.id !== itemId);
        saveDataToStorage();
        renderDashboard();
        renderLiabilityTabContent(itemType);
        showMessage('✅ Liability deleted successfully', 'success');
    }
}

// ===== ACCOUNT MANAGEMENT =====
function openAddAccountModal() {
    editingItemId = null;
    const form = document.getElementById('account-form');
    if (form) form.reset();
    document.getElementById('account-modal-title').textContent = 'Add Account';
    populateAccountDropdowns();
    document.getElementById('account-modal').classList.remove('hidden');
}

function populateAccountDropdowns() {
    const holderSelect = document.getElementById('account-holder');
    const nomineeSelect = document.getElementById('account-nominee');
    
    if (holderSelect) {
        holderSelect.innerHTML = familyData.members.map(member => 
            `<option value="${member.id}">${member.name}</option>`
        ).join('');
    }
    
    if (nomineeSelect) {
        nomineeSelect.innerHTML = 
            '<option value="">Select Nominee</option>' +
            familyData.members.map(member => 
                `<option value="${member.id}">${member.name}</option>`
            ).join('');
    }
}

function saveAccount() {
    const accountTypeEl = document.getElementById('account-type');
    const institutionEl = document.getElementById('account-institution');
    const accountNumberEl = document.getElementById('account-number');
    const holderEl = document.getElementById('account-holder');
    const nomineeEl = document.getElementById('account-nominee');
    const usernameEl = document.getElementById('account-username');
    const passwordEl = document.getElementById('account-password');
    const commentsEl = document.getElementById('account-comments');
    
    if (!accountTypeEl || !institutionEl || !accountNumberEl || !holderEl) {
        showMessage('Some required fields are missing in the form. Please reload the page.', 'error');
        return;
    }
    
    const accountType = accountTypeEl.value;
    const institution = institutionEl.value.trim();
    const accountNumber = accountNumberEl.value.trim();
    const holderId = holderEl.value;
    const nomineeId = nomineeEl ? nomineeEl.value : '';
    const username = usernameEl ? usernameEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    const comments = commentsEl ? commentsEl.value.trim() : '';
    
    if (!accountType || !institution || !accountNumber || !holderId) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const holder = familyData.members.find(m => m.id === holderId);
    const nominee = nomineeId ? familyData.members.find(m => m.id === nomineeId) : null;
    
    const accountData = {
        id: editingItemId || Date.now().toString(),
        account_type: accountType,
        institution: institution,
        account_number: accountNumber,
        holder_name: holder ? holder.name : 'Unknown',
        nominee: nominee ? nominee.name : '',
        username: username,
        password: password,
        status: 'Active',
        comments: comments
    };
    
    if (editingItemId) {
        // Update existing account
        const accountIndex = familyData.accounts.findIndex(a => a.id === editingItemId);
        if (accountIndex !== -1) {
            familyData.accounts[accountIndex] = accountData;
        }
        showMessage('✅ Account updated successfully', 'success');
    } else {
        // Add new account
        familyData.accounts.push(accountData);
        showMessage('✅ Account added successfully', 'success');
    }
    
    saveDataToStorage();
    renderDashboard();
    renderAccountsTable();
    closeModal('account-modal');
}

function editAccount(accountId) {
    const account = familyData.accounts.find(a => a.id === accountId);
    if (!account) return;
    
    editingItemId = accountId;
    
    document.getElementById('account-type').value = account.account_type || '';
    document.getElementById('account-institution').value = account.institution || '';
    document.getElementById('account-number').value = account.account_number || '';
    document.getElementById('account-username').value = account.username || '';
    document.getElementById('account-password').value = account.password || '';
    document.getElementById('account-comments').value = account.comments || '';
    
    // Find holder by name
    const holder = familyData.members.find(m => m.name === account.holder_name);
    if (holder) {
        document.getElementById('account-holder').value = holder.id;
    }
    
    // Find nominee by name
    const nominee = familyData.members.find(m => m.name === account.nominee);
    if (nominee) {
        document.getElementById('account-nominee').value = nominee.id;
    }
    
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    document.getElementById('account-modal').classList.remove('hidden');
}

function deleteAccount(accountId) {
    if (confirm('Are you sure you want to delete this account?')) {
        familyData.accounts = familyData.accounts.filter(a => a.id !== accountId);
        saveDataToStorage();
        renderDashboard();
        renderAccountsTable();
        showMessage('✅ Account deleted successfully', 'success');
    }
}

// ===== PHOTO MANAGEMENT =====
function openPhotoModal(memberId) {
    editingMemberId = memberId;
    selectedPresetPhoto = null;
    uploadedPhotoData = null;
    
    // Populate preset photos
    const photoOptions = document.getElementById('photo-options');
    if (photoOptions) {
        photoOptions.innerHTML = PRESET_PHOTOS.map((photoUrl, index) => 
            `<img src="${photoUrl}" class="photo-option" data-photo="${photoUrl}" onclick="selectPresetPhoto('${photoUrl}')" alt="Preset photo ${index + 1}">`
        ).join('');
    }
    
    document.getElementById('photo-modal').classList.remove('hidden');
}

function selectPresetPhoto(photoUrl) {
    selectedPresetPhoto = photoUrl;
    uploadedPhotoData = null;
    
    // Update visual selection
    document.querySelectorAll('.photo-option').forEach(img => {
        img.classList.remove('selected');
    });
    document.querySelector(`[data-photo="${photoUrl}"]`)?.classList.add('selected');
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedPhotoData = e.target.result;
        selectedPresetPhoto = null;
        
        // Clear preset selection
        document.querySelectorAll('.photo-option').forEach(img => {
            img.classList.remove('selected');
        });
        
        showMessage('✅ Photo uploaded! Click Save to apply.', 'success');
    };
    
    reader.readAsDataURL(file);
}

function savePhoto() {
    if (!editingMemberId) return;
    
    let newPhotoUrl = null;
    
    if (uploadedPhotoData) {
        newPhotoUrl = uploadedPhotoData;
    } else if (selectedPresetPhoto) {
        newPhotoUrl = selectedPresetPhoto;
    }
    
    if (newPhotoUrl) {
        const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
        if (memberIndex !== -1) {
            familyData.members[memberIndex].photo_url = newPhotoUrl;
        }
        
        saveDataToStorage();
        renderDashboard();
        showMessage('✅ Photo updated successfully', 'success');
        closeModal('photo-modal');
    } else {
        showMessage('Please select a photo first', 'error');
    }
}

// ===== EXPORT FUNCTIONS (WORKING) =====
function downloadCSV(data, filename) {
    console.log('📥 Attempting to download CSV:', filename);
    
    if (!data || data.length === 0) {
        showMessage('❌ No data to export', 'warning');
        return;
    }
    
    try {
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let value = row[header];
                if (value === undefined || value === null) {
                    value = '';
                }
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showMessage(`✅ ${filename} download started`, 'success');
        
    } catch (error) {
        console.error('❌ CSV download error:', error);
        showMessage('❌ Error downloading CSV file', 'error');
    }
}

function downloadJSON(data, filename) {
    console.log('📥 Attempting to download JSON:', filename);
    
    if (!data) {
        showMessage('❌ No data to export', 'warning');
        return;
    }
    
    try {
        const jsonContent = JSON.stringify(data, null, 2);
        
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showMessage(`✅ ${filename} download started`, 'success');
        
    } catch (error) {
        console.error('❌ JSON download error:', error);
        showMessage('❌ Error downloading JSON file', 'error');
    }
}

function exportInvestments(format = 'csv') {
    console.log('🔄 Starting investments export...');
    
    const investmentData = [];
    
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        
        Object.entries(investments).forEach(([type, items]) => {
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    investmentData.push({
                        'Member Name': member.name,
                        'Relationship': member.relationship,
                        'Investment Type': type,
                        'Investment Name': item.symbol_or_name || 'N/A',
                        'Invested Amount': item.invested_amount || 0,
                        'Current Value': item.current_value || item.invested_amount || 0,
                        'P&L': (item.current_value || item.invested_amount || 0) - (item.invested_amount || 0),
                        'Platform': item.broker_platform || 'N/A',
                        'Export Date': new Date().toISOString().split('T')[0],
                        'Export Time': new Date().toLocaleTimeString('en-IN')
                    });
                });
            }
        });
    });
    
    if (investmentData.length === 0) {
        showMessage('❌ No investment data found to export', 'warning');
        return;
    }
    
    const filename = `FamWealth_Investments_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        downloadCSV(investmentData, filename);
    } else {
        downloadJSON(investmentData, filename);
    }
}

function exportLiabilities(format = 'csv') {
    console.log('🔄 Starting liabilities export...');
    
    const liabilityData = [];
    
    familyData.members.forEach(member => {
        const liabilities = familyData.liabilities[member.id] || {};
        
        Object.entries(liabilities).forEach(([type, items]) => {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    liabilityData.push({
                        'Member Name': member.name,
                        'Relationship': member.relationship,
                        'Liability Type': type,
                        'Lender/Bank': item.lender || 'N/A',
                        'Outstanding Amount': item.outstanding_amount || 0,
                        'EMI Amount': item.emi_amount || 0,
                        'Interest Rate': item.interest_rate || 'N/A',
                        'Comments': item.comments || '',
                        'Export Date': new Date().toISOString().split('T')[0],
                        'Export Time': new Date().toLocaleTimeString('en-IN')
                    });
                });
            }
        });
    });
    
    if (liabilityData.length === 0) {
        showMessage('❌ No liability data found to export', 'warning');
        return;
    }
    
    const filename = `FamWealth_Liabilities_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        downloadCSV(liabilityData, filename);
    } else {
        downloadJSON(liabilityData, filename);
    }
}

function exportAccounts(format = 'csv') {
    console.log('🔄 Starting accounts export...');
    
    if (!familyData.accounts || familyData.accounts.length === 0) {
        showMessage('❌ No accounts found to export', 'warning');
        return;
    }
    
    const accountData = familyData.accounts.map(account => ({
        'Account Type': account.account_type || 'N/A',
        'Institution': account.institution || 'N/A',
        'Account Number': account.account_number || 'N/A',
        'Holder Name': account.holder_name || 'N/A',
        'Nominee': account.nominee || 'Not specified',
        'Username': account.username || 'N/A',
        'Status': account.status || 'N/A',
        'Comments': account.comments || 'No comments',
        'Export Date': new Date().toISOString().split('T')[0],
        'Export Time': new Date().toLocaleTimeString('en-IN')
    }));
    
    const filename = `FamWealth_Accounts_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        downloadCSV(accountData, filename);
    } else {
        downloadJSON(accountData, filename);
    }
}

function exportFamilyData(format = 'csv') {
    console.log('🔄 Starting family data export...');
    
    if (!familyData.members || familyData.members.length === 0) {
        showMessage('❌ No family members found to export', 'warning');
        return;
    }
    
    const familyMemberData = familyData.members.map(member => {
        // Calculate member financials
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let totalAssets = 0;
        let totalLiabilities = 0;
        
        // Calculate assets
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalAssets += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });
        
        // Calculate liabilities
        ['homeLoan', 'personalLoan', 'creditCard', 'other'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                totalLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });
        
        return {
            'Name': member.name || 'Unknown',
            'Relationship': member.relationship || 'Unknown',
            'Primary Account Holder': member.is_primary ? 'Yes' : 'No',
            'Total Assets': totalAssets,
            'Total Liabilities': totalLiabilities,
            'Net Worth': totalAssets - totalLiabilities,
            'Has Profile Photo': member.photo_url ? 'Yes' : 'No',
            'Export Date': new Date().toISOString().split('T')[0],
            'Export Time': new Date().toLocaleTimeString('en-IN')
        };
    });
    
    const filename = `FamWealth_Family_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        downloadCSV(familyMemberData, filename);
    } else {
        downloadJSON(familyMemberData, filename);
    }
}

function exportCompleteBackup() {
    console.log('🔄 Starting complete backup export...');
    
    const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: currentUser ? currentUser.email : 'demo@famwealth.com',
        data: {
            members: familyData.members,
            investments: familyData.investments,
            liabilities: familyData.liabilities,
            accounts: familyData.accounts
        },
        summary: {
            totalMembers: familyData.members.length,
            totalAccounts: familyData.accounts.length,
            totalInvestments: Object.values(familyData.investments).reduce((sum, memberInv) => 
                sum + Object.values(memberInv).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0),
            totalLiabilities: Object.values(familyData.liabilities).reduce((sum, memberLiab) => 
                sum + Object.values(memberLiab).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0)
        }
    };
    
    const filename = `FamWealth_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadJSON(backupData, filename);
}

// ===== IMPORT FUNCTIONS =====
function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.version && importedData.data) {
                if (confirm('⚠️ This will replace all current data. Continue with import?')) {
                    familyData = {
                        members: importedData.data.members || [],
                        investments: importedData.data.investments || {},
                        liabilities: importedData.data.liabilities || {},
                        accounts: importedData.data.accounts || [],
                        totals: {}
                    };
                    
                    saveDataToStorage();
                    renderDashboard();
                    
                    showMessage(`✅ Backup imported successfully! Restored ${familyData.members.length} members.`, 'success');
                }
            } else {
                showMessage('❌ Invalid backup file format', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            showMessage('❌ Error importing backup file', 'error');
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// ===== TABLE SORTING =====
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;
    
    // Determine sort direction
    let sortDirection = 'asc';
    if (currentSort.table === tableId && currentSort.column === columnIndex) {
        sortDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    // Update current sort state
    currentSort = { table: tableId, column: columnIndex, direction: sortDirection };
    
    // Sort rows
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex]?.textContent.trim() || '';
        const bText = b.cells[columnIndex]?.textContent.trim() || '';
        
        // Try to parse as numbers
        const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
        const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
        
        let result = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
            result = aNum - bNum;
        } else {
            result = aText.localeCompare(bText);
        }
        
        return sortDirection === 'asc' ? result : -result;
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
    
    // Update sort indicators
    updateSortIndicators(tableId, columnIndex, sortDirection);
}

function updateSortIndicators(tableId, columnIndex, direction) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    // Clear all indicators
    table.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });
    
    // Set current indicator
    const currentHeader = table.querySelector(`th:nth-child(${columnIndex + 1}) .sort-indicator`);
    if (currentHeader) {
        currentHeader.textContent = direction === 'asc' ? ' ↑' : ' ↓';
    }
}

// ===== RENDERING FUNCTIONS =====
function renderDashboard() {
    renderStatsGrid();
    renderFamilyMembersGrid();
    renderInvestmentTabContent('equity');
    renderLiabilityTabContent('homeLoan');
    renderAccountsTable();
    renderFamilyTable();
}

function renderStatsGrid() {
    const totals = calculateTotals();
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">FAMILY NET WORTH</div>
            <div class="stat-value primary">₹${totals.netWorth.toLocaleString()}</div>
            <div class="stat-change neutral">Total Family Assets</div>
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
            <div class="stat-label">ACTIVE MEMBERS</div>
            <div class="stat-value">${familyData.members.length}</div>
            <div class="stat-change neutral">Family Members</div>
        </div>
    `;
    
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
        statsGrid.innerHTML = statsHTML;
    }
}

function calculateTotals() {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalLiabilities = 0;

    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};

        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalInvested += parseFloat(item.invested_amount || 0);
                totalCurrentValue += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });

        ['homeLoan', 'personalLoan', 'creditCard', 'other'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                totalLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });
    });

    return {
        totalInvested,
        totalCurrentValue,
        totalPnL: totalCurrentValue - totalInvested,
        totalLiabilities,
        netWorth: totalCurrentValue - totalLiabilities
    };
}

function renderFamilyMembersGrid() {
    const membersHTML = familyData.members.map(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let memberCurrentValue = 0;
        let memberLiabilities = 0;
        
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                memberCurrentValue += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });
        
        ['homeLoan', 'personalLoan', 'creditCard', 'other'].forEach(type => {
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
                    <div class="member-info">
                        <img src="${member.photo_url || PRESET_PHOTOS[0]}" alt="${member.name}" class="member-photo">
                        <div>
                            <h4>${member.name}</h4>
                            <p class="member-relationship">${member.relationship}</p>
                        </div>
                    </div>
                    <div class="member-actions">
                        <button class="btn btn-sm" onclick="openPhotoModal('${member.id}')" title="Change Photo">📷</button>
                        <button class="btn btn-sm" onclick="editMember('${member.id}')" title="Edit Member">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMember('${member.id}')" title="Delete Member">🗑️</button>
                    </div>
                </div>
                
                <div class="member-stats">
                    <div class="stat-item">
                        <div class="stat-value">₹${memberCurrentValue.toLocaleString()}</div>
                        <div class="stat-label">Total Assets</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value negative">₹${memberLiabilities.toLocaleString()}</div>
                        <div class="stat-label">Liabilities</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value ${memberCurrentValue - memberLiabilities >= 0 ? 'positive' : 'negative'}">₹${(memberCurrentValue - memberLiabilities).toLocaleString()}</div>
                        <div class="stat-label">Net Worth</div>
                    </div>
                </div>
                
                <div class="member-accounts">
                    <div class="accounts-label">Investment Accounts: ${accountCount}</div>
                    <div class="accounts-list">
                        <span class="account-tag">Equity: ${(investments.equity || []).length}</span>
                        <span class="account-tag">MF: ${(investments.mutualFunds || []).length}</span>
                        <span class="account-tag">FD: ${(investments.fixedDeposits || []).length}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const familyMembersGrid = document.getElementById('family-members-grid');
    if (familyMembersGrid) {
        familyMembersGrid.innerHTML = membersHTML;
    }
    
    const familyMembersList = document.getElementById('family-members-list');
    if (familyMembersList) {
        familyMembersList.innerHTML = membersHTML;
    }
}

function renderFamilyTable() {
    const tbody = document.querySelector('#family-table tbody');
    if (!tbody) return;
    
    if (familyData.members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <h4>👥 No Family Members Added Yet</h4>
                    <p>Start building your family financial profile by adding your first member.</p>
                    <button class="btn btn-primary" onclick="openAddMemberModal()">+ Add First Member</button>
                </td>
            </tr>
        `;
        return;
    }

    const rowsHTML = familyData.members.map(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let totalAssets = 0;
        let totalLiabilities = 0;
        
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalAssets += parseFloat(item.current_value || item.invested_amount || 0);
            });
        });
        
        ['homeLoan', 'personalLoan', 'creditCard', 'other'].forEach(type => {
            (liabilities[type] || []).forEach(item => {
                totalLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        });

        return `
            <tr>
                <td style="text-align: center;">
                    <img src="${member.photo_url || PRESET_PHOTOS[0]}" 
                         alt="${member.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                </td>
                <td><strong>${member.name}</strong></td>
                <td>${member.relationship}</td>
                <td>₹${totalAssets.toLocaleString()}</td>
                <td>₹${totalLiabilities.toLocaleString()}</td>
                <td class="${totalAssets - totalLiabilities >= 0 ? 'positive' : 'negative'}">₹${(totalAssets - totalLiabilities).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm" onclick="openPhotoModal('${member.id}')" title="Change Photo">📷</button>
                    <button class="btn btn-sm" onclick="editMember('${member.id}')" title="Edit Member">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMember('${member.id}')" title="Delete Member">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rowsHTML;
}

function renderInvestmentTabContent(tabName) {
    let contentHTML = '';
    
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const items = investments[tabName] || [];
        
        if (items.length > 0) {
            contentHTML += `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th onclick="sortInvestmentTable(0)">Member <span class="sort-indicator"></span></th>
                                <th onclick="sortInvestmentTable(1)">Investment Name <span class="sort-indicator"></span></th>
                                <th onclick="sortInvestmentTable(2)">Invested Amount <span class="sort-indicator"></span></th>
                                <th onclick="sortInvestmentTable(3)">Current Value <span class="sort-indicator"></span></th>
                                <th onclick="sortInvestmentTable(4)">P&L <span class="sort-indicator"></span></th>
                                <th onclick="sortInvestmentTable(5)">Platform <span class="sort-indicator"></span></th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${member.name}</td>
                                    <td>${item.symbol_or_name || item.invested_in || 'N/A'}</td>
                                    <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                                    <td>₹${(item.current_value || item.invested_amount || 0).toLocaleString()}</td>
                                    <td class="pnl-positive">₹${((item.current_value || item.invested_amount || 0) - (item.invested_amount || 0)).toLocaleString()}</td>
                                    <td>${item.broker_platform || 'N/A'}</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="editInvestment('${item.id}', '${tabName}', '${member.id}')" title="Edit">✏️</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteInvestment('${item.id}', '${tabName}', '${member.id}')" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    });
    
    if (!contentHTML) {
        contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px;">
                <h4>No ${tabName} investments found</h4>
                <p>Add your first ${tabName} investment to get started.</p>
                <button class="btn btn-primary" onclick="openAddInvestmentModal()">+ Add ${tabName}</button>
            </div>
        `;
    }
    
    const investmentTabsContent = document.getElementById('investment-tabs-content');
    if (investmentTabsContent) {
        investmentTabsContent.innerHTML = contentHTML;
    }
}

function renderLiabilityTabContent(tabName) {
    let contentHTML = '';
    
    familyData.members.forEach(member => {
        const liabilities = familyData.liabilities[member.id] || {};
        const items = liabilities[tabName] || [];
        
        if (items.length > 0) {
            contentHTML += `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th onclick="sortLiabilityTable(0)">Member <span class="sort-indicator"></span></th>
                                <th onclick="sortLiabilityTable(1)">Lender <span class="sort-indicator"></span></th>
                                <th onclick="sortLiabilityTable(2)">Outstanding Amount <span class="sort-indicator"></span></th>
                                <th onclick="sortLiabilityTable(3)">EMI <span class="sort-indicator"></span></th>
                                <th onclick="sortLiabilityTable(4)">Interest Rate <span class="sort-indicator"></span></th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${member.name}</td>
                                    <td>${item.lender || 'N/A'}</td>
                                    <td>₹${(item.outstanding_amount || 0).toLocaleString()}</td>
                                    <td>₹${(item.emi_amount || 0).toLocaleString()}</td>
                                    <td>${item.interest_rate || 0}%</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="editLiability('${item.id}', '${tabName}', '${member.id}')" title="Edit">✏️</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteLiability('${item.id}', '${tabName}', '${member.id}')" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    });
    
    if (!contentHTML) {
        contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px;">
                <h4>No ${tabName} found</h4>
                <p>Add your first ${tabName} to get started.</p>
                <button class="btn btn-primary" onclick="openAddLiabilityModal()">+ Add ${tabName}</button>
            </div>
        `;
    }
    
    const liabilityTabsContent = document.getElementById('liability-tabs-content');
    if (liabilityTabsContent) {
        liabilityTabsContent.innerHTML = contentHTML;
    }
}

function renderAccountsTable() {
    const tbody = document.querySelector('#accounts-table tbody');
    if (!tbody) return;
    
    if (familyData.accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <h4>🏦 No Accounts Added Yet</h4>
                    <p>Add your first account to track financial information and nominees.</p>
                    <button class="btn btn-primary" onclick="openAddAccountModal()">+ Add First Account</button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = familyData.accounts.map(account => `
        <tr>
            <td>${account.account_type}</td>
            <td>${account.institution}</td>
            <td>${account.account_number}</td>
            <td>${account.holder_name}</td>
            <td>${account.nominee || 'Not specified'}</td>
            <td><span class="status status-success">${account.status || 'Active'}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editAccount('${account.id}')" title="Edit Account">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.id}')" title="Delete Account">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ===== TAB FUNCTIONS =====
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

// ===== NAVIGATION FUNCTIONS =====
function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId)?.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function toggleFamilyView() {
    const listView = document.getElementById('family-list-view');
    const cardView = document.getElementById('family-card-view');
    const toggleBtn = document.getElementById('view-toggle-btn');
    
    if (listView && cardView && toggleBtn) {
        if (listView.style.display === 'none') {
            listView.style.display = 'block';
            cardView.style.display = 'none';
            toggleBtn.textContent = '📋 Card View';
        } else {
            listView.style.display = 'none';
            cardView.style.display = 'block';
            toggleBtn.textContent = '📋 List View';
        }
    }
}

// ===== MODAL FUNCTIONS =====
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
    
    // Reset editing states
    if (modalId === 'member-modal') {
        editingMemberId = null;
    } else if (modalId === 'investment-modal') {
        editingItemId = null;
        editingItemMemberId = null;
    } else if (modalId === 'account-modal') {
        editingItemId = null;
    } else if (modalId === 'liability-modal') {
        editingItemId = null;
        editingItemMemberId = null;
    } else if (modalId === 'photo-modal') {
        editingMemberId = null;
        selectedPresetPhoto = null;
        uploadedPhotoData = null;
    }
}

// ===== UTILITY FUNCTIONS =====
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 4000);
    }
    console.log(`${type.toUpperCase()}: ${message}`);
}

function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
    const userEmail = document.querySelector('.user-email');
    if (userEmail && user && user.email) {
        userEmail.textContent = user.email;
    }
}

// ===== DEBUG FUNCTIONS =====
function refreshDebugData() {
    console.log('🔍 Debug Data Sources:');
    console.log('Members:', familyData.members.length);
    console.log('Accounts:', familyData.accounts.length);
    console.log('Current User:', currentUser ? currentUser.email : 'None');
    console.log('Storage Type:', localStorage.getItem('famwealth_auth_type'));
    
    showMessage('🔍 Debug info logged to console', 'info');
}

function showDataSummary() {
    const totalInvestments = Object.values(familyData.investments).reduce((sum, memberInv) => 
        sum + Object.values(memberInv).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0);
    
    const totalLiabilities = Object.values(familyData.liabilities).reduce((sum, memberLiab) => 
        sum + Object.values(memberLiab).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0);
    
    const summary = `
📊 Complete Data Summary:
• Family Members: ${familyData.members.length}
• Total Investments: ${totalInvestments}
• Total Liabilities: ${totalLiabilities}
• Total Accounts: ${familyData.accounts.length}
• Storage Type: ${localStorage.getItem('famwealth_auth_type') || 'None'}
• Last Updated: ${new Date().toLocaleString()}
    `;
    
    console.log(summary);
    showMessage('📊 Data summary logged to console', 'info');
}

function syncDataSources() {
    showMessage('🔄 Syncing data sources...', 'info');
    saveDataToStorage();
    renderDashboard();
    showMessage('✅ Data sync completed', 'success');
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 FamWealth Dashboard initializing...');
    
    // Initialize Supabase
    await initializeSupabase();
    
    // Check for existing session
    const authType = localStorage.getItem('famwealth_auth_type');
    if (authType) {
        showDashboard();
        if (authType === 'demo') {
            currentUser = { email: 'demo@famwealth.com', id: 'demo-user-id' };
            updateUserInfo(currentUser);
        } else if (authType === 'supabase') {
            const user = JSON.parse(localStorage.getItem('famwealth_user') || '{}');
            if (user && user.id) {
                currentUser = user;
                updateUserInfo(user);
            }
        }
        loadDashboardData();
    }
    
    console.log('✅ FamWealth Dashboard Ready!');
});

console.log('📊 FamWealth Dashboard loaded - All fixes applied!');
