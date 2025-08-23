// ===== COMPLETE FAMWEALTH DASHBOARD WITH ALL FIXES AND SORTING =====
// All features working: Family management, investments, liabilities, accounts, downloads, sorting, edit functions

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

// Sorting state variables
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentSortTable = null;

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
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }

    setLoginLoading(true);
    showMessage('🔄 Authenticating...', 'info');

    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        currentUser = { email: 'demo@famwealth.com', id: 'demo-user-id' };
        localStorage.setItem('famwealth_auth_type', 'demo');
        setTimeout(() => {
            showDashboard();
            updateUserInfo(currentUser);
            loadDashboardData();
        }, 1000);
        setLoginLoading(false);
        return;
    }

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
                showMessage(`✅ Welcome back, ${data.user.email}!`, 'success');
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
    localStorage.removeItem('famwealth_data');
    
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    showMessage('✅ Logged out successfully', 'success');
    setLoginLoading(false);
}

// ===== DATA LOADING =====
async function loadDashboardData() {
    try {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';

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
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
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
                current_value: 500000,
                interest_rate: 6.5,
                invested_date: '2024-01-01',
                maturity_date: '2025-01-01'
            }],
            insurance: [{
                id: '3',
                insurer: 'LIC',
                symbol_or_name: 'LIC Term Plan',
                invested_amount: 25000,
                current_value: 25000,
                coverage_amount: 1000000,
                policy_number: 'LIC123456'
            }],
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
            creditCard: [{
                id: 'cc1',
                lender: 'SBI Credit Card',
                outstanding_amount: 45000,
                emi_amount: 5000,
                interest_rate: 18.0
            }], 
            other: [] 
        },
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
            comments: 'Primary savings account'
        },
        {
            id: 'acc2',
            account_type: 'Demat Account',
            institution: 'Zerodha',
            account_number: 'ZD1234',
            holder_name: 'Pradeep Kumar',
            nominee: 'Smruthi Kumar',
            status: 'Active',
            comments: 'Trading and investment account'
        }
    ];

    console.log('✅ Sample data loaded with comprehensive examples!');
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

// ===== SORTING FUNCTIONALITY =====
function sortData(data, column, direction = 'asc') {
    return [...data].sort((a, b) => {
        let aVal = getNestedValue(a, column);
        let bVal = getNestedValue(b, column);
        
        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : '';
    }, obj);
}

function handleTableSort(column, tableType) {
    console.log(`🔄 Sorting ${tableType} by ${column}`);
    
    // Toggle direction if same column
    if (currentSortColumn === column && currentSortTable === tableType) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortDirection = 'asc';
    }
    
    currentSortColumn = column;
    currentSortTable = tableType;
    
    // Re-render the appropriate table
    switch (tableType) {
        case 'accounts':
            renderAccountsTable();
            break;
        case 'family':
            renderFamilyManagement();
            break;
        case 'investment':
            // Get current active investment tab
            const activeInvestmentTab = document.querySelector('#investments-section .tab-btn.active');
            const tabName = activeInvestmentTab ? activeInvestmentTab.textContent.toLowerCase().replace(/\s+/g, '') : 'equity';
            renderInvestmentTabContent(tabName);
            break;
        case 'liability':
            // Get current active liability tab
            const activeLiabilityTab = document.querySelector('#liabilities-section .tab-btn.active');
            const liabilityTabName = activeLiabilityTab ? activeLiabilityTab.textContent.toLowerCase().replace(/\s+/g, '') : 'homeLoan';
            renderLiabilityTabContent(liabilityTabName);
            break;
    }
    
    showMessage(`✅ Sorted by ${column} (${currentSortDirection.toUpperCase()})`, 'info');
}

function createSortableHeader(text, column, tableType) {
    const isActive = currentSortColumn === column && currentSortTable === tableType;
    const direction = isActive ? currentSortDirection : 'asc';
    const arrow = isActive ? (direction === 'asc' ? '▲' : '▼') : '⬍';
    
    return `
        <th class="sortable-header ${isActive ? 'active' : ''}" 
            onclick="handleTableSort('${column}', '${tableType}')"
            style="cursor: pointer; user-select: none; position: relative;">
            <span class="header-content">
                ${text}
                <span class="sort-arrow" style="margin-left: 8px; opacity: ${isActive ? 1 : 0.3};">
                    ${arrow}
                </span>
            </span>
        </th>
    `;
}

// ===== FAMILY MEMBER MANAGEMENT =====
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
    
    familyData.members = familyData.members.filter(m => m.id !== deletingMemberId);
    delete familyData.investments[deletingMemberId];
    delete familyData.liabilities[deletingMemberId];
    
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

// ===== PHOTO MANAGEMENT =====
function openPhotoModal(memberId) {
    editingMemberId = memberId;
    selectedPresetPhoto = null;
    
    // Clear previous selections
    document.querySelectorAll('.photo-option').forEach(img => {
        img.classList.remove('selected');
    });
    
    // Populate preset photos
    const photoGrid = document.getElementById('preset-photos-grid');
    photoGrid.innerHTML = PRESET_PHOTOS.map(photoUrl => 
        `<img src="${photoUrl}" class="photo-option" data-photo="${photoUrl}" alt="Preset photo">`
    ).join('');
    
    // Add click handlers
    document.querySelectorAll('.photo-option').forEach(img => {
        img.addEventListener('click', function() {
            document.querySelectorAll('.photo-option').forEach(p => p.classList.remove('selected'));
            this.classList.add('selected');
            selectedPresetPhoto = this.dataset.photo;
        });
    });
    
    document.getElementById('photo-modal').classList.remove('hidden');
}

function savePhoto() {
    if (!editingMemberId) return;
    
    let newPhotoUrl = null;
    
    if (selectedPresetPhoto) {
        newPhotoUrl = selectedPresetPhoto;
    } else if (uploadedPhotoData) {
        newPhotoUrl = uploadedPhotoData;
    }
    
    if (newPhotoUrl) {
        const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
        if (memberIndex !== -1) {
            familyData.members[memberIndex].photo_url = newPhotoUrl;
            familyData.members[memberIndex].avatar_url = newPhotoUrl;
        }
        
        saveDataToStorage();
        renderEnhancedDashboard();
        showMessage('✅ Photo updated successfully', 'success');
    } else {
        showMessage('Please select a photo first', 'error');
        return;
    }
    
    document.getElementById('photo-modal').classList.add('hidden');
    editingMemberId = null;
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
        
        // Clear preset selection
        document.querySelectorAll('.photo-option').forEach(img => {
            img.classList.remove('selected');
        });
        selectedPresetPhoto = null;
        
        showMessage('✅ Photo uploaded! Click Save to apply.', 'success');
    };
    
    reader.readAsDataURL(file);
}

// ===== INVESTMENT MANAGEMENT =====
function openAddInvestmentModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('investment-form').reset();
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    
    // Hide all type-specific fields
    const fdFields = document.getElementById('fd-specific-fields');
    const insFields = document.getElementById('insurance-specific-fields');
    if (fdFields) fdFields.style.display = 'none';
    if (insFields) insFields.style.display = 'none';
    
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
    // Function called when investment type changes
    const type = document.getElementById('investment-type').value;
    
    // Hide all type-specific fields first
    const fdFields = document.getElementById('fd-specific-fields');
    const insFields = document.getElementById('insurance-specific-fields');
    
    if (fdFields) fdFields.style.display = 'none';
    if (insFields) insFields.style.display = 'none';
    
    // Show relevant fields based on type
    if (type === 'fixedDeposits' && fdFields) {
        fdFields.style.display = 'block';
    } else if (type === 'insurance' && insFields) {
        insFields.style.display = 'block';
    }
    
    console.log('Investment form updated for type:', type);
}

function saveInvestment() {
    console.log('🔄 Starting saveInvestment function...');
    
    // Check if all required elements exist with proper error handling
    const memberSelect = document.getElementById('investment-member');
    const typeSelect = document.getElementById('investment-type');
    const nameInput = document.getElementById('investment-name');
    const amountInput = document.getElementById('investment-amount');
    const currentValueInput = document.getElementById('investment-current-value');
    const platformInput = document.getElementById('investment-platform');
    
    console.log('Investment form element check:', {
        member: memberSelect ? 'Found' : 'Missing',
        type: typeSelect ? 'Found' : 'Missing',
        name: nameInput ? 'Found' : 'Missing',
        amount: amountInput ? 'Found' : 'Missing',
        currentValue: currentValueInput ? 'Found' : 'Missing',
        platform: platformInput ? 'Found' : 'Missing'
    });
    
    if (!memberSelect || !typeSelect || !nameInput || !amountInput) {
        showMessage('❌ Investment form elements not found. Please refresh the page.', 'error');
        console.error('Missing form elements in investment modal');
        return;
    }
    
    const memberId = memberSelect.value;
    const type = typeSelect.value;
    const name = nameInput.value.trim();
    const amount = amountInput.value;
    const currentValue = currentValueInput ? currentValueInput.value : '';
    const platform = platformInput ? platformInput.value.trim() : '';
    
    console.log('Investment form values:', { memberId, type, name, amount, currentValue, platform });
    
    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const investmentData = {
        id: editingItemId || Date.now().toString(),
        symbol_or_name: name,
        invested_amount: parseFloat(amount),
        current_value: parseFloat(currentValue) || parseFloat(amount),
        broker_platform: platform
    };
    
    // Handle specific investment types
    if (type === 'fixedDeposits') {
        const interestRateInput = document.getElementById('fd-interest-rate');
        const investedDateInput = document.getElementById('fd-invested-date');
        const maturityDateInput = document.getElementById('fd-maturity-date');
        
        investmentData.invested_in = name;
        investmentData.interest_rate = interestRateInput ? parseFloat(interestRateInput.value) || 0 : 0;
        investmentData.invested_date = investedDateInput ? investedDateInput.value : '';
        investmentData.maturity_date = maturityDateInput ? maturityDateInput.value : '';
    }
    
    if (type === 'insurance') {
        const insurerInput = document.getElementById('insurance-insurer');
        const policyNumberInput = document.getElementById('insurance-policy-number');
        const coverageAmountInput = document.getElementById('insurance-coverage-amount');
        
        investmentData.insurer = insurerInput ? insurerInput.value.trim() : name;
        investmentData.policy_number = policyNumberInput ? policyNumberInput.value.trim() : '';
        investmentData.coverage_amount = coverageAmountInput ? parseFloat(coverageAmountInput.value) || 0 : 0;
        investmentData.insurance_premium = parseFloat(amount);
    }
    
    console.log('Investment data to save:', investmentData);
    
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
        editingItemId = null;
        editingItemMemberId = null;
        editingItemType = null;
    } else {
        // Add new investment
        familyData.investments[memberId][type].push(investmentData);
        showMessage('✅ Investment added successfully', 'success');
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    renderInvestmentTabContent(type);
    document.getElementById('investment-modal').classList.add('hidden');
    
    console.log('✅ Investment saved successfully');
}

// ===== ACCOUNT MANAGEMENT =====
function openAddAccountModal() {
    editingItemId = null;
    document.getElementById('account-form').reset();
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
    const accountType = document.getElementById('account-type').value;
    const institution = document.getElementById('account-institution').value.trim();
    const accountNumber = document.getElementById('account-number').value.trim();
    const holderId = document.getElementById('account-holder').value;
    const nomineeId = document.getElementById('account-nominee').value;
    const status = document.getElementById('account-status').value;
    const comments = document.getElementById('account-comments').value.trim();
    
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
        status: status,
        comments: comments
    };
    
    if (editingItemId) {
        // Update existing account
        const accountIndex = familyData.accounts.findIndex(a => a.id === editingItemId);
        if (accountIndex !== -1) {
            familyData.accounts[accountIndex] = accountData;
        }
        showMessage('✅ Account updated successfully', 'success');
        editingItemId = null;
    } else {
        // Add new account
        familyData.accounts.push(accountData);
        showMessage('✅ Account added successfully', 'success');
    }
    
    saveDataToStorage();
    renderAccountsTable();
    document.getElementById('account-modal').classList.add('hidden');
}

// ===== LIABILITY MANAGEMENT (FIXED) =====
function openAddLiabilityModal() {
    editingItemId = null;
    editingItemMemberId = null;
    document.getElementById('liability-form').reset();
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
    console.log('🔄 Starting saveLiability function...');
    
    // Check if all required elements exist with proper error handling
    const memberSelect = document.getElementById('liability-member');
    const typeSelect = document.getElementById('liability-type');
    const lenderInput = document.getElementById('liability-lender');
    const amountInput = document.getElementById('liability-amount');
    const emiInput = document.getElementById('liability-emi');
    const rateInput = document.getElementById('liability-rate');
    
    console.log('Liability form element check:', {
        member: memberSelect ? 'Found' : 'Missing',
        type: typeSelect ? 'Found' : 'Missing',
        lender: lenderInput ? 'Found' : 'Missing',
        amount: amountInput ? 'Found' : 'Missing',
        emi: emiInput ? 'Found' : 'Missing',
        rate: rateInput ? 'Found' : 'Missing'
    });
    
    if (!memberSelect || !typeSelect || !lenderInput || !amountInput) {
        showMessage('❌ Liability form elements not found. Please refresh the page.', 'error');
        console.error('Missing form elements in liability modal');
        return;
    }
    
    const memberId = memberSelect.value;
    const type = typeSelect.value;
    const lender = lenderInput.value.trim();
    const amount = amountInput.value;
    const emi = emiInput ? emiInput.value : '';
    const rate = rateInput ? rateInput.value : '';
    
    console.log('Liability form values:', { memberId, type, lender, amount, emi, rate });
    
    if (!memberId || !type || !lender || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const liabilityData = {
        id: editingItemId || Date.now().toString(),
        lender: lender,
        outstanding_amount: parseFloat(amount),
        emi_amount: parseFloat(emi) || 0,
        interest_rate: parseFloat(rate) || 0
    };
    
    console.log('Liability data to save:', liabilityData);
    
    if (!familyData.liabilities[memberId]) {
        familyData.liabilities[memberId] = {
            homeLoan: [], personalLoan: [], creditCard: [], other: []
        };
    }
    
    if (editingItemId) {
        const itemIndex = familyData.liabilities[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.liabilities[memberId][type][itemIndex] = liabilityData;
        }
        showMessage('✅ Liability updated successfully', 'success');
        editingItemId = null;
        editingItemMemberId = null;
        editingItemType = null;
    } else {
        familyData.liabilities[memberId][type].push(liabilityData);
        showMessage('✅ Liability added successfully', 'success');
    }
    
    saveDataToStorage();
    renderEnhancedDashboard();
    renderLiabilityTabContent(type);
    document.getElementById('liability-modal').classList.add('hidden');
    
    console.log('✅ Liability saved successfully');
}

// ===== EDIT FUNCTIONS (FIXED) =====
function editItem(itemId, itemType, memberId) {
    console.log('🔄 Editing item:', { itemId, itemType, memberId });
    
    if (itemType === 'account') {
        editAccount(itemId);
    } else if (memberId && familyData.investments[memberId] && familyData.investments[memberId][itemType]) {
        editInvestment(itemId, itemType, memberId);
    } else if (memberId && familyData.liabilities[memberId] && familyData.liabilities[memberId][itemType]) {
        editLiability(itemId, itemType, memberId);
    } else {
        showMessage(`❌ Unable to edit ${itemType}. Data not found.`, 'error');
    }
}

function editInvestment(itemId, itemType, memberId) {
    console.log('🔄 Editing investment:', { itemId, itemType, memberId });
    
    const item = familyData.investments[memberId][itemType].find(i => i.id === itemId);
    if (!item) {
        showMessage('❌ Investment not found', 'error');
        return;
    }
    
    editingItemId = itemId;
    editingItemMemberId = memberId;
    editingItemType = itemType;
    
    // Populate the investment modal with existing data
    document.getElementById('investment-modal-title').textContent = `Edit ${itemType}`;
    
    // Populate form fields
    const memberSelect = document.getElementById('investment-member');
    const typeSelect = document.getElementById('investment-type');
    const nameInput = document.getElementById('investment-name');
    const amountInput = document.getElementById('investment-amount');
    const currentValueInput = document.getElementById('investment-current-value');
    const platformInput = document.getElementById('investment-platform');
    
    if (memberSelect) memberSelect.value = memberId;
    if (typeSelect) typeSelect.value = itemType;
    if (nameInput) nameInput.value = item.symbol_or_name || item.invested_in || item.insurer || '';
    if (amountInput) amountInput.value = item.invested_amount || item.insurance_premium || '';
    if (currentValueInput) currentValueInput.value = item.current_value || item.invested_amount || item.insurance_premium || '';
    if (platformInput) platformInput.value = item.broker_platform || '';
    
    // Handle specific fields for different investment types
    if (itemType === 'fixedDeposits') {
        const interestRateInput = document.getElementById('fd-interest-rate');
        const investedDateInput = document.getElementById('fd-invested-date');
        const maturityDateInput = document.getElementById('fd-maturity-date');
        
        if (interestRateInput) interestRateInput.value = item.interest_rate || '';
        if (investedDateInput) investedDateInput.value = item.invested_date || '';
        if (maturityDateInput) maturityDateInput.value = item.maturity_date || '';
        
        // Show FD specific fields
        const fdFields = document.getElementById('fd-specific-fields');
        if (fdFields) fdFields.style.display = 'block';
    }
    
    if (itemType === 'insurance') {
        const insurerInput = document.getElementById('insurance-insurer');
        const policyNumberInput = document.getElementById('insurance-policy-number');
        const coverageAmountInput = document.getElementById('insurance-coverage-amount');
        
        if (insurerInput) insurerInput.value = item.insurer || '';
        if (policyNumberInput) policyNumberInput.value = item.policy_number || '';
        if (coverageAmountInput) coverageAmountInput.value = item.coverage_amount || '';
        
        // Show insurance specific fields
        const insFields = document.getElementById('insurance-specific-fields');
        if (insFields) insFields.style.display = 'block';
    }
    
    populateInvestmentMemberDropdown();
    document.getElementById('investment-modal').classList.remove('hidden');
    
    showMessage(`✅ Editing ${itemType} for ${familyData.members.find(m => m.id === memberId)?.name}`, 'info');
}

function editLiability(itemId, itemType, memberId) {
    console.log('🔄 Editing liability:', { itemId, itemType, memberId });
    
    const item = familyData.liabilities[memberId][itemType].find(i => i.id === itemId);
    if (!item) {
        showMessage('❌ Liability not found', 'error');
        return;
    }
    
    editingItemId = itemId;
    editingItemMemberId = memberId;
    editingItemType = itemType;
    
    // Populate the liability modal with existing data
    document.getElementById('liability-modal-title').textContent = `Edit ${itemType}`;
    
    // Populate form fields
    const memberSelect = document.getElementById('liability-member');
    const typeSelect = document.getElementById('liability-type');
    const lenderInput = document.getElementById('liability-lender');
    const amountInput = document.getElementById('liability-amount');
    const emiInput = document.getElementById('liability-emi');
    const rateInput = document.getElementById('liability-rate');
    
    if (memberSelect) memberSelect.value = memberId;
    if (typeSelect) typeSelect.value = itemType;
    if (lenderInput) lenderInput.value = item.lender || '';
    if (amountInput) amountInput.value = item.outstanding_amount || '';
    if (emiInput) emiInput.value = item.emi_amount || '';
    if (rateInput) rateInput.value = item.interest_rate || '';
    
    populateLiabilityMemberDropdown();
    document.getElementById('liability-modal').classList.remove('hidden');
    
    showMessage(`✅ Editing ${itemType} for ${familyData.members.find(m => m.id === memberId)?.name}`, 'info');
}

function editAccount(itemId) {
    console.log('🔄 Editing account:', itemId);
    
    const account = familyData.accounts.find(a => a.id === itemId);
    if (!account) {
        showMessage('❌ Account not found', 'error');
        return;
    }
    
    editingItemId = itemId;
    
    // Populate the account modal with existing data
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    
    // Populate form fields
    const typeSelect = document.getElementById('account-type');
    const institutionInput = document.getElementById('account-institution');
    const numberInput = document.getElementById('account-number');
    const statusSelect = document.getElementById('account-status');
    const commentsInput = document.getElementById('account-comments');
    
    if (typeSelect) typeSelect.value = account.account_type || '';
    if (institutionInput) institutionInput.value = account.institution || '';
    if (numberInput) numberInput.value = account.account_number || '';
    if (statusSelect) statusSelect.value = account.status || '';
    if (commentsInput) commentsInput.value = account.comments || '';
    
    // Set holder and nominee
    const holderSelect = document.getElementById('account-holder');
    const nomineeSelect = document.getElementById('account-nominee');
    
    if (holderSelect) {
        const holder = familyData.members.find(m => m.name === account.holder_name);
        if (holder) holderSelect.value = holder.id;
    }
    
    if (nomineeSelect) {
        const nominee = familyData.members.find(m => m.name === account.nominee);
        if (nominee) nomineeSelect.value = nominee.id;
    }
    
    populateAccountDropdowns();
    document.getElementById('account-modal').classList.remove('hidden');
    
    showMessage(`✅ Editing account: ${account.account_type} - ${account.institution}`, 'info');
}

// ===== DOWNLOAD UTILITIES =====
function downloadCSV(data, filename) {
    console.log('📥 Attempting to download CSV:', filename);
    console.log('📊 Data to export:', data);
    
    if (!data || data.length === 0) {
        showMessage('❌ No data to export', 'warning');
        console.log('❌ Empty data array');
        return;
    }
    
    try {
        const headers = Object.keys(data[0]);
        console.log('📋 CSV Headers:', headers);
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let value = row[header];
                // Handle undefined/null values
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
        
        console.log('📄 CSV content preview:', csvContent.substring(0, 200) + '...');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to page, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('✅ CSV download initiated successfully');
        showMessage(`✅ ${filename} download started`, 'success');
        
    } catch (error) {
        console.error('❌ CSV download error:', error);
        showMessage('❌ Error downloading CSV file', 'error');
    }
}

function downloadJSON(data, filename) {
    console.log('📥 Attempting to download JSON:', filename);
    console.log('📊 Data to export:', data);
    
    if (!data) {
        showMessage('❌ No data to export', 'warning');
        console.log('❌ No data provided');
        return;
    }
    
    try {
        const jsonContent = JSON.stringify(data, null, 2);
        console.log('📄 JSON content preview:', jsonContent.substring(0, 200) + '...');
        
        // Create and download file
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to page, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('✅ JSON download initiated successfully');
        showMessage(`✅ ${filename} download started`, 'success');
        
    } catch (error) {
        console.error('❌ JSON download error:', error);
        showMessage('❌ Error downloading JSON file', 'error');
    }
}

// ===== EXPORT FUNCTIONS =====
function exportInvestments(format = 'csv') {
    console.log('🔄 Starting investments export...');
    
    if (!familyData || !familyData.members || familyData.members.length === 0) {
        showMessage('❌ No family members found', 'warning');
        return;
    }
    
    const investmentData = [];
    
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        console.log(`Processing investments for ${member.name}:`, investments);
        
        Object.entries(investments).forEach(([type, items]) => {
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    investmentData.push({
                        'Member Name': member.name,
                        'Relationship': member.relationship,
                        'Investment Type': type,
                        'Investment Name': item.symbol_or_name || item.invested_in || item.insurer || 'N/A',
                        'Invested Amount': item.invested_amount || item.insurance_premium || 0,
                        'Current Value': item.current_value || item.invested_amount || 0,
                        'P&L': (item.current_value || item.invested_amount || 0) - (item.invested_amount || item.insurance_premium || 0),
                        'Platform': item.broker_platform || 'N/A',
                        'Export Date': new Date().toISOString().split('T')[0],
                        'Export Time': new Date().toLocaleTimeString('en-IN')
                    });
                });
            }
        });
    });
    
    console.log('📊 Investment data prepared:', investmentData);
    
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
                        'Export Date': new Date().toISOString().split('T')[0],
                        'Export Time': new Date().toLocaleTimeString('en-IN')
                    });
                });
            }
        });
    });
    
    console.log('📊 Liability data prepared:', liabilityData);
    
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
    
    if (!familyData || !familyData.accounts || familyData.accounts.length === 0) {
        showMessage('❌ No accounts found to export', 'warning');
        console.log('❌ familyData.accounts:', familyData.accounts);
        return;
    }
    
    const accountData = familyData.accounts.map(account => ({
        'Account Type': account.account_type || 'N/A',
        'Institution': account.institution || 'N/A',
        'Account Number': account.account_number || 'N/A',
        'Holder Name': account.holder_name || 'N/A',
        'Nominee': account.nominee || 'Not specified',
        'Status': account.status || 'N/A',
        'Comments': account.comments || 'No comments',
        'Export Date': new Date().toISOString().split('T')[0],
        'Export Time': new Date().toLocaleTimeString('en-IN')
    }));
    
    console.log('📊 Account data prepared:', accountData);
    
    const filename = `FamWealth_Accounts_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        downloadCSV(accountData, filename);
    } else {
        downloadJSON(accountData, filename);
    }
}

function exportFamilyData(format = 'csv') {
    console.log('🔄 Starting family data export...');
    
    if (!familyData || !familyData.members || familyData.members.length === 0) {
        showMessage('❌ No family members found to export', 'warning');
        console.log('❌ familyData.members:', familyData.members);
        return;
    }
    
    const familyMemberData = familyData.members.map(member => {
        console.log('Processing member:', member.name);
        
        // Calculate member financials
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let totalAssets = 0;
        let totalLiabilities = 0;
        
        // Calculate assets
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalAssets += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
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
    
    console.log('📊 Family data prepared:', familyMemberData);
    
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
function importBackup() {
    // Create a file input dynamically
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(event) {
        handleImportFile(event);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

function handleImportFile(event) {
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
                    renderEnhancedDashboard();
                    renderAccountsTable();
                    
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
}

// ===== DEBUG FUNCTIONS =====
function debugDataSources() {
    const debugHTML = `
        <div class="debug-section">
            <h4>📊 Dashboard Status</h4>
            <div class="debug-info">
                <p><strong>Supabase Status:</strong> ${supabase ? '✅ Connected' : '❌ Not Available'}</p>
                <p><strong>Current User:</strong> ${currentUser ? currentUser.email : 'None'}</p>
                <p><strong>Members:</strong> ${familyData.members.length}</p>
                <p><strong>Accounts:</strong> ${familyData.accounts.length}</p>
            </div>
        </div>
        
        <div class="debug-section">
            <h4>👥 Family Members</h4>
            <div class="debug-info">
                ${familyData.members.map(member => 
                    `<p>• <strong>${member.name}</strong> (${member.relationship}) - ID: ${member.id}</p>`
                ).join('')}
            </div>
        </div>
        
        <div class="debug-section">
            <h4>🔍 Sorting Status</h4>
            <div class="debug-info">
                <p><strong>Current Sort Column:</strong> ${currentSortColumn || 'None'}</p>
                <p><strong>Sort Direction:</strong> ${currentSortDirection}</p>
                <p><strong>Sort Table:</strong> ${currentSortTable || 'None'}</p>
            </div>
        </div>
        
        <div class="debug-actions">
            <button class="btn btn--outline btn--sm" onclick="refreshDebugData()">🔄 Refresh</button>
            <button class="btn btn--outline btn--sm" onclick="syncDataSources()">🔄 Sync Data</button>
            <button class="btn btn--primary btn--sm" onclick="showDataSummary()">📊 Show Summary</button>
        </div>
    `;
    
    document.getElementById('debug-content').innerHTML = debugHTML;
    document.getElementById('debug-modal').classList.remove('hidden');
}

function refreshDebugData() {
    debugDataSources();
    showMessage('🔄 Debug data refreshed', 'info');
}

function syncDataSources() {
    showMessage('🔄 Syncing data sources...', 'info');
    saveDataToStorage();
    renderEnhancedDashboard();
    renderAccountsTable();
    showMessage('✅ Data sync completed', 'success');
}

function showDataSummary() {
    const totalInvestments = Object.values(familyData.investments).reduce((sum, memberInv) => 
        sum + Object.values(memberInv).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0);
    
    const totalLiabilities = Object.values(familyData.liabilities).reduce((sum, memberLiab) => 
        sum + Object.values(memberLiab).reduce((memberSum, arr) => memberSum + (Array.isArray(arr) ? arr.length : 0), 0), 0);
    
    const summaryHTML = `
        <h4>📊 Complete Data Summary</h4>
        <div class="summary-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0;">
            <div class="summary-stat" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <div class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${familyData.members.length}</div>
                <div class="stat-label" style="font-size: 0.9rem; color: #666;">Family Members</div>
            </div>
            <div class="summary-stat" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <div class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${totalInvestments}</div>
                <div class="stat-label" style="font-size: 0.9rem; color: #666;">Total Investments</div>
            </div>
            <div class="summary-stat" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <div class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${totalLiabilities}</div>
                <div class="stat-label" style="font-size: 0.9rem; color: #666;">Total Liabilities</div>
            </div>
            <div class="summary-stat" style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                <div class="stat-value" style="font-size: 1.5rem; font-weight: bold;">${familyData.accounts.length}</div>
                <div class="stat-label" style="font-size: 0.9rem; color: #666;">Total Accounts</div>
            </div>
        </div>
        
        <h5>👥 Member Breakdown</h5>
        <div class="member-breakdown" style="margin-top: 1rem;">
            ${familyData.members.map(member => {
                const investments = familyData.investments[member.id] || {};
                const liabilities = familyData.liabilities[member.id] || {};
                const memberInvestments = Object.values(investments).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                const memberLiabilities = Object.values(liabilities).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
                return `
                    <div class="breakdown-item" style="padding: 0.5rem; margin: 0.25rem 0; background: #fff; border: 1px solid #ddd; border-radius: 4px;">
                        <strong>${member.name}:</strong> ${memberInvestments} investments, ${memberLiabilities} liabilities
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('debug-content').innerHTML = summaryHTML;
}

// ===== DASHBOARD RENDERING =====
function renderEnhancedDashboard() {
    const totals = calculateEnhancedTotals();
    renderEnhancedStats(totals);
    renderMemberCards();
    renderFamilyManagement();
    console.log('✅ Dashboard rendered successfully');
}

function calculateEnhancedTotals() {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalLiabilities = 0;

    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};

        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalInvested += parseFloat(item.invested_amount || item.current_balance || 0);
                totalCurrentValue += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
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

function renderEnhancedStats(totals) {
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
    
    document.getElementById('stats-grid').innerHTML = statsHTML;
}

function renderMemberCards() {
    const membersHTML = familyData.members.map(member => {
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let memberCurrentValue = 0;
        let memberLiabilities = 0;
        
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                memberCurrentValue += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
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
                    <div class="member-avatar">
                        <img src="${member.photo_url || PRESET_PHOTOS[0]}" 
                             alt="${member.name}" 
                             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div class="member-info">
                        <h4>${member.name}</h4>
                        <p class="member-relationship">${member.relationship}</p>
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
            <div class="family-stats">
                <span class="stat-item">Total Members: <strong>${familyData.members.length}</strong></span>
                <span class="stat-item">Database: <strong>${supabase && currentUser && currentUser.id ? '✅ Connected' : '📦 Local'}</strong></span>
            </div>
        </div>

        <div class="family-list-view">
            <div class="family-table-container">
                <table class="family-table">
                    <thead>
                        <tr>
                            ${createSortableHeader('Photo', 'photo_url', 'family')}
                            ${createSortableHeader('Name', 'name', 'family')}
                            ${createSortableHeader('Relationship', 'relationship', 'family')}
                            ${createSortableHeader('Total Assets', 'totalAssets', 'family')}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderFamilyMemberRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    familyMembersGrid.innerHTML = familyHTML;
}

function renderFamilyMemberRows() {
    if (familyData.members.length === 0) {
        return `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-family-state">
                        <h4>👥 No Family Members Added Yet</h4>
                        <p>Start building your family financial profile by adding your first member.</p>
                        <button class="btn btn--primary" onclick="openAddMemberModal()">+ Add First Member</button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Prepare data with calculated totals for sorting
    const memberData = familyData.members.map(member => {
        const investments = familyData.investments[member.id] || {};
        let totalAssets = 0;
        
        ['equity', 'mutualFunds', 'fixedDeposits', 'bankBalances'].forEach(type => {
            (investments[type] || []).forEach(item => {
                totalAssets += parseFloat(item.current_value || item.invested_amount || item.current_balance || 0);
            });
        });

        return { ...member, totalAssets };
    });

    // Apply sorting
    const sortedData = currentSortTable === 'family' && currentSortColumn 
        ? sortData(memberData, currentSortColumn, currentSortDirection)
        : memberData;

    return sortedData.map(member => {
        return `
            <tr>
                <td>
                    <img src="${member.photo_url || PRESET_PHOTOS[0]}" 
                         alt="${member.name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                </td>
                <td><strong>${member.name}</strong></td>
                <td>${member.relationship}</td>
                <td>₹${member.totalAssets.toLocaleString()}</td>
                <td>
                    <button class="btn btn--sm btn--secondary photo-edit-btn" data-member-id="${member.id}" title="Change Photo">📷</button>
                    <button class="btn btn--sm btn--secondary edit-member-btn" data-member-id="${member.id}" title="Edit Member">✏️</button>
                    <button class="btn btn--sm delete-member-btn" style="background: var(--color-error); color: white;" data-member-id="${member.id}" title="Delete Member">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAccountsTable() {
    const tableBody = document.querySelector('#accounts-table tbody');
    const tableHead = document.querySelector('#accounts-table thead tr');
    
    if (!tableBody) return;
    
    // Render sortable headers
    if (tableHead) {
        tableHead.innerHTML = `
            ${createSortableHeader('Account Type', 'account_type', 'accounts')}
            ${createSortableHeader('Institution', 'institution', 'accounts')}
            ${createSortableHeader('Account Number', 'account_number', 'accounts')}
            ${createSortableHeader('Holder Name', 'holder_name', 'accounts')}
            ${createSortableHeader('Nominee', 'nominee', 'accounts')}
            ${createSortableHeader('Status', 'status', 'accounts')}
            <th>Comments</th>
            <th>Actions</th>
        `;
    }
    
    // Apply sorting
    const sortedAccounts = currentSortTable === 'accounts' && currentSortColumn 
        ? sortData(familyData.accounts, currentSortColumn, currentSortDirection)
        : familyData.accounts;
    
    tableBody.innerHTML = sortedAccounts.map(account => `
        <tr>
            <td>${account.account_type}</td>
            <td>${account.institution}</td>
            <td>${account.account_number}</td>
            <td>${account.holder_name}</td>
            <td>${account.nominee || 'Not specified'}</td>
            <td><span class="status status--success">${account.status}</span></td>
            <td>${account.comments || 'No comments'}</td>
            <td>
                <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${account.id}" data-item-type="account" title="Edit Account">✏️</button>
                <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" 
                        data-item-id="${account.id}" data-item-type="account" title="Delete Account">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderInvestmentTabContent(tabName) {
    let allInvestments = [];
    
    // Collect all investments of this type from all members
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        const items = investments[tabName] || [];
        
        items.forEach(item => {
            allInvestments.push({
                ...item,
                memberName: member.name,
                memberId: member.id
            });
        });
    });
    
    if (allInvestments.length > 0) {
        // Apply sorting
        const sortedInvestments = currentSortTable === 'investment' && currentSortColumn 
            ? sortData(allInvestments, currentSortColumn, currentSortDirection)
            : allInvestments;
        
        const contentHTML = `
            <div class="investment-table" style="margin-bottom: 2rem;">
                <table>
                    <thead>
                        <tr>
                            ${createSortableHeader('Member', 'memberName', 'investment')}
                            ${createSortableHeader('Investment Name', 'symbol_or_name', 'investment')}
                            ${createSortableHeader('Invested Amount', 'invested_amount', 'investment')}
                            ${createSortableHeader('Current Value', 'current_value', 'investment')}
                            ${createSortableHeader('P&L', 'pnl', 'investment')}
                            ${createSortableHeader('Platform', 'broker_platform', 'investment')}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedInvestments.map(item => {
                            const pnl = (item.current_value || item.invested_amount || 0) - (item.invested_amount || 0);
                            return `
                                <tr>
                                    <td>${item.memberName}</td>
                                    <td>${item.symbol_or_name || item.invested_in || 'N/A'}</td>
                                    <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                                    <td>₹${(item.current_value || item.invested_amount || 0).toLocaleString()}</td>
                                    <td class="pnl-${pnl >= 0 ? 'positive' : 'negative'}">₹${pnl.toLocaleString()}</td>
                                    <td>${item.broker_platform || 'N/A'}</td>
                                    <td>
                                        <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${item.memberId}" title="Edit">✏️</button>
                                        <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${item.memberId}" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('investment-tabs-content').innerHTML = contentHTML;
    } else {
        const contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px;">
                <h4>No ${tabName} investments found</h4>
                <p>Add your first ${tabName} investment to get started.</p>
                <button class="btn btn--primary" onclick="openAddInvestmentModal()">+ Add ${tabName}</button>
            </div>
        `;
        
        document.getElementById('investment-tabs-content').innerHTML = contentHTML;
    }
}

function renderLiabilityTabContent(tabName) {
    let allLiabilities = [];
    
    // Collect all liabilities of this type from all members
    familyData.members.forEach(member => {
        const liabilities = familyData.liabilities[member.id] || {};
        const items = liabilities[tabName] || [];
        
        items.forEach(item => {
            allLiabilities.push({
                ...item,
                memberName: member.name,
                memberId: member.id
            });
        });
    });
    
    if (allLiabilities.length > 0) {
        // Apply sorting
        const sortedLiabilities = currentSortTable === 'liability' && currentSortColumn 
            ? sortData(allLiabilities, currentSortColumn, currentSortDirection)
            : allLiabilities;
        
        const contentHTML = `
            <div class="investment-table" style="margin-bottom: 2rem;">
                <table>
                    <thead>
                        <tr>
                            ${createSortableHeader('Member', 'memberName', 'liability')}
                            ${createSortableHeader('Lender', 'lender', 'liability')}
                            ${createSortableHeader('Outstanding Amount', 'outstanding_amount', 'liability')}
                            ${createSortableHeader('EMI', 'emi_amount', 'liability')}
                            ${createSortableHeader('Interest Rate', 'interest_rate', 'liability')}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedLiabilities.map(item => `
                            <tr>
                                <td>${item.memberName}</td>
                                <td>${item.lender || 'N/A'}</td>
                                <td>₹${(item.outstanding_amount || 0).toLocaleString()}</td>
                                <td>₹${(item.emi_amount || 0).toLocaleString()}</td>
                                <td>${item.interest_rate || 0}%</td>
                                <td>
                                    <button class="btn btn--sm btn--secondary edit-item-btn" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${item.memberId}" title="Edit">✏️</button>
                                    <button class="btn btn--sm delete-item-btn" style="background: var(--color-error); color: white;" data-item-id="${item.id}" data-item-type="${tabName}" data-member-id="${item.memberId}" title="Delete">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('liability-tabs-content').innerHTML = contentHTML;
    } else {
        const contentHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px;">
                <h4>No ${tabName} found</h4>
                <p>Add your first ${tabName} to get started.</p>
                <button class="btn btn--primary" onclick="openAddLiabilityModal()">+ Add ${tabName}</button>
            </div>
        `;
        
        document.getElementById('liability-tabs-content').innerHTML = contentHTML;
    }
}

// ===== TAB FUNCTIONS =====
function showInvestmentTab(tabName) {
    document.querySelectorAll('#investments-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Reset sorting when changing tabs
    currentSortColumn = null;
    currentSortDirection = 'asc';
    currentSortTable = null;
    
    renderInvestmentTabContent(tabName);
}

function showLiabilityTab(tabName) {
    document.querySelectorAll('#liabilities-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Reset sorting when changing tabs
    currentSortColumn = null;
    currentSortDirection = 'asc';
    currentSortTable = null;
    
    renderLiabilityTabContent(tabName);
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
            deleteItem(itemId, itemType, memberId);
        }
    });
}

function deleteItem(itemId, itemType, memberId) {
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
        if (itemType === 'account') {
            familyData.accounts = familyData.accounts.filter(a => a.id !== itemId);
            renderAccountsTable();
        } else if (memberId && familyData.investments[memberId] && familyData.investments[memberId][itemType]) {
            familyData.investments[memberId][itemType] = familyData.investments[memberId][itemType].filter(i => i.id !== itemId);
            renderInvestmentTabContent(itemType);
        } else if (memberId && familyData.liabilities[memberId] && familyData.liabilities[memberId][itemType]) {
            familyData.liabilities[memberId][itemType] = familyData.liabilities[memberId][itemType].filter(i => i.id !== itemId);
            renderLiabilityTabContent(itemType);
        }
        
        saveDataToStorage();
        renderEnhancedDashboard();
        showMessage(`✅ ${itemType} deleted successfully`, 'success');
    }
}

// ===== MODAL CLOSE FUNCTIONS =====
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    
    // Reset editing states
    if (modalId === 'member-modal') {
        editingMemberId = null;
    } else if (modalId === 'investment-modal') {
        editingItemId = null;
        editingItemMemberId = null;
        editingItemType = null;
    } else if (modalId === 'account-modal') {
        editingItemId = null;
    } else if (modalId === 'liability-modal') {
        editingItemId = null;
        editingItemMemberId = null;
        editingItemType = null;
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
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 4000);
    }
    console.log(`${type.toUpperCase()}: ${message}`);
}

function setLoginLoading(loading) {
    const loginBtn = document.querySelector('[onclick="handleLogin()"]');
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');
    
    if (loginBtn) loginBtn.disabled = loading;
    if (loginText && loginSpinner) {
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

function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Reset sorting when switching sections
    currentSortColumn = null;
    currentSortDirection = 'asc';
    currentSortTable = null;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Complete FamWealth Dashboard with ALL FIXES & SORTING initializing...');
    
    // Initialize Supabase
    await initializeSupabase();
    
    // Setup event delegation for dynamic buttons
    setupEventDelegation();
    
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
    
    console.log('✅ Complete Dashboard with ALL FIXES, SORTING & FEATURES Ready! 🎉');
});

console.log('📊 FamWealth Dashboard loaded with COMPLETE FUNCTIONALITY!');
