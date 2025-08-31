// Enhanced Family Investment Dashboard - Complete JavaScript Implementation
// Version 2.0 with Enhanced FD, Insurance, and Secure Credentials Management
// Full 2800+ Lines Implementation

// ===== GLOBAL CONFIGURATION AND STATE =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// Enhanced Global Variables
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
let editingReminderId = null;
let currentPhotoMemberId = null;
let selectedPhoto = null;
let currentInvestmentType = 'equity';
let currentLiabilityType = 'homeLoan';
let currentReminderType = 'pending';
let currentAnalyticsTab = 'overview';
let isEditMode = false;
let sortColumn = null;
let sortDirection = 'asc';

// Enhanced Authentication and Access Control
const AUTHORIZED_EMAIL = 'pradeepkumar.v@hotmail.com';
let hasPasswordAccess = false;
let userAccessLevel = 'standard';

// Enhanced Import/Export Variables
let currentImportType = null;
let importData = null;
let importProgress = 0;
let exportSettings = {
    includeCredentials: false,
    dateFormat: 'DD/MM/YYYY',
    currencyFormat: 'INR',
    includeComments: true
};

// Enhanced Data Type Constants
const INVESTMENT_TYPES = {
    equity: '📊 Equity',
    mutualFunds: '📈 Mutual Funds',
    fixedDeposits: '🏦 Fixed Deposits',
    insurance: '🛡️ Insurance',
    bankBalances: '💰 Bank Balances',
    others: '📦 Others'
};

const LIABILITY_TYPES = {
    homeLoan: '🏠 Home Loan',
    personalLoan: '👤 Personal Loan',
    creditCard: '💳 Credit Card',
    carLoan: '🚗 Car Loan',
    educationLoan: '🎓 Education Loan',
    businessLoan: '🏢 Business Loan',
    other: '📦 Other'
};

const ACCOUNT_TYPES = [
    'Bank Account', 'Demat Account', 'Mutual Fund Account',
    'Insurance Account', 'Trading Account', 'PPF Account',
    'Savings Account', 'Current Account', 'Fixed Deposit',
    'Recurring Deposit', 'EPF', 'NPS', 'Crypto Account', 'Other'
];

const REMINDER_TYPES = {
    insurance: '🛡️ Insurance Premium',
    fd_maturity: '🏦 FD Maturity',
    loan_payment: '💳 Loan Payment',
    tax_filing: '📊 Tax Filing',
    investment_review: '📈 Investment Review',
    policy_renewal: '🔄 Policy Renewal',
    other: '📦 Other'
};

// Enhanced Fixed Deposit Specific Constants
const FD_INTEREST_PAYOUT_OPTIONS = [
    'Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'On Maturity'
];

// Enhanced Insurance Specific Constants
const INSURANCE_TYPES = [
    'Life Insurance', 'Health Insurance', 'Term Insurance',
    'ULIP', 'Endowment', 'Money Back', 'Child Plan',
    'Pension Plan', 'Other'
];

const INSURANCE_PAYMENT_FREQUENCIES = [
    'Monthly', 'Quarterly', 'Half-yearly', 'Annual'
];

// ===== APPLICATION INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Enhanced Family Wealth Dashboard - Initializing...');
    
    try {
        // Initialize Supabase
        await initializeSupabase();
        
        // Setup comprehensive event listeners
        setupEventListeners();
        
        // Initialize default form values
        initializeDefaultValues();
        
        // Check for existing session
        await checkExistingSession();
        
        // Initialize UI components
        initializeUIComponents();
        
        console.log('✅ Enhanced Family Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showToast('Error initializing application: ' + error.message, 'error');
    }
});

// ===== SUPABASE INITIALIZATION =====
async function initializeSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }
        
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test connection
        const { data, error } = await supabase.from('family_members').select('id').limit(1);
        
        if (error && error.code !== 'PGRST116') {
            console.warn('Supabase connection test failed:', error);
        }
        
        console.log('✅ Supabase initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        throw error;
    }
}

// ===== COMPREHENSIVE EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Authentication form listeners
    setupAuthenticationListeners();
    
    // Modal management listeners
    setupModalListeners();
    
    // Form submission listeners
    setupFormListeners();
    
    // Navigation listeners
    setupNavigationListeners();
    
    // Enhanced input field listeners
    setupEnhancedFieldListeners();
    
    // Table sorting and filtering listeners
    setupTableListeners();
    
    // Import/Export listeners
    setupImportExportListeners();
    
    // Enhanced photo upload listeners
    setupPhotoListeners();
    
    // Keyboard shortcut listeners
    setupKeyboardShortcuts();
    
    // Window event listeners
    setupWindowListeners();
    
    console.log('✅ Comprehensive event listeners setup completed');
}

// ===== AUTHENTICATION EVENT LISTENERS =====
function setupAuthenticationListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ===== MODAL MANAGEMENT LISTENERS =====
function setupModalListeners() {
    // Close button listeners for all modals
    document.querySelectorAll('.btn-close, .modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Background click to close modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

// ===== FORM SUBMISSION LISTENERS =====
function setupFormListeners() {
    const forms = [
        { id: 'member-form', handler: saveMember },
        { id: 'investment-form', handler: saveInvestment },
        { id: 'liability-form', handler: saveLiability },
        { id: 'account-form', handler: saveAccount },
        { id: 'reminder-form', handler: saveReminder }
    ];
    
    forms.forEach(({ id, handler }) => {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handler();
            });
        }
    });
}

// ===== NAVIGATION LISTENERS =====
function setupNavigationListeners() {
    // Section navigation
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
                updateActiveNavigation(this);
            }
        });
    });
}

// ===== ENHANCED FIELD LISTENERS =====
function setupEnhancedFieldListeners() {
    // Investment type change listener for conditional fields
    const investmentTypeSelect = document.getElementById('investment-type');
    if (investmentTypeSelect) {
        investmentTypeSelect.addEventListener('change', updateInvestmentForm);
    }
    
    // Recurring reminder checkbox
    const recurringCheckbox = document.getElementById('reminder-recurring');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', function() {
            const options = document.getElementById('recurring-options');
            if (options) {
                options.style.display = this.checked ? 'block' : 'none';
            }
        });
    }
    
    // Enhanced form validation listeners
    setupFormValidationListeners();
    
    // Auto-calculation listeners
    setupAutoCalculationListeners();
}

// ===== TABLE MANAGEMENT LISTENERS =====
function setupTableListeners() {
    // Search functionality
    const searchInputs = ['investment-search', 'account-search', 'family-search'];
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keyup', debounce(function() {
                filterTable(inputId.replace('-search', ''));
            }, 300));
        }
    });
}

// ===== IMPORT/EXPORT LISTENERS =====
function setupImportExportListeners() {
    const importFile = document.getElementById('import-file');
    if (importFile) {
        importFile.addEventListener('change', handleImportFile);
    }
    
    const bulkImportFile = document.getElementById('bulk-import-file');
    if (bulkImportFile) {
        bulkImportFile.addEventListener('change', handleBulkImportFile);
    }
}

// ===== PHOTO UPLOAD LISTENERS =====
function setupPhotoListeners() {
    const photoUpload = document.getElementById('photo-upload');
    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoUpload);
    }
}

// ===== KEYBOARD SHORTCUT LISTENERS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S to save current form
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentForm();
        }
        
        // Ctrl+N for new item shortcuts
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            showNewItemMenu();
        }
        
        // Ctrl+E for export
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            showExportMenu();
        }
        
        // F5 to refresh dashboard
        if (e.key === 'F5' && !e.ctrlKey) {
            e.preventDefault();
            refreshDashboard();
        }
    });
}

// ===== WINDOW EVENT LISTENERS =====
function setupWindowListeners() {
    // Before unload warning for unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
    
    // Window resize handler for responsive behavior
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
}

// ===== ENHANCED AUTHENTICATION FUNCTIONS =====
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
    }

    try {
        showLoading(true);
        updateLoginButtonState(true);
        
        // Enhanced authentication with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        // Set current user and determine access level
        currentUser = data.user;
        hasPasswordAccess = (email === AUTHORIZED_EMAIL);
        userAccessLevel = hasPasswordAccess ? 'admin' : 'standard';
        
        // Store session information
        localStorage.setItem('user_session', JSON.stringify({
            user: currentUser,
            hasPasswordAccess: hasPasswordAccess,
            userAccessLevel: userAccessLevel,
            loginTime: new Date().toISOString()
        }));
        
        // Update UI based on access level
        updatePasswordAccessUI();
        updateUserInterfaceForAccessLevel();
        
        // Load dashboard data
        await loadCompleteDashboard();
        
        // Show main dashboard
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-dashboard').style.display = 'block';
        
        // Update user information in navbar
        updateUserInformation(email);
        
        // Show success message with access level
        const accessMessage = hasPasswordAccess ? 
            'Welcome! You have full administrative access.' : 
            'Welcome! You have standard user access.';
        showToast(accessMessage, 'success');
        
        // Log successful login
        console.log(`✅ Login successful for ${email} with ${userAccessLevel} access`);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
        updateLoginButtonState(false);
    }
}

async function handleLogout() {
    try {
        showLoading(true);
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        }
        
        // Clear local storage and reset state
        localStorage.removeItem('user_session');
        resetApplicationState();
        
        // Show landing page
        document.getElementById('main-dashboard').style.display = 'none';
        document.getElementById('landing-page').style.display = 'block';
        
        showToast('Logged out successfully', 'success');
        console.log('✅ Logout successful');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showToast('Error during logout', 'error');
    } finally {
        showLoading(false);
    }
}

function resetApplicationState() {
    currentUser = null;
    hasPasswordAccess = false;
    userAccessLevel = 'standard';
    familyMembers = [];
    investments = [];
    liabilities = [];
    accounts = [];
    reminders = [];
    editingMemberId = null;
    editingInvestmentId = null;
    editingLiabilityId = null;
    editingAccountId = null;
    editingReminderId = null;
    isEditMode = false;
}

async function checkExistingSession() {
    const storedSession = localStorage.getItem('user_session');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            // Auto-logout after 24 hours
            if (hoursSinceLogin > 24) {
                localStorage.removeItem('user_session');
                return;
            }
            
            // Verify session with Supabase
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (user && !error) {
                currentUser = user;
                hasPasswordAccess = session.hasPasswordAccess;
                userAccessLevel = session.userAccessLevel;
                
                updatePasswordAccessUI();
                updateUserInterfaceForAccessLevel();
                await loadCompleteDashboard();
                
                document.getElementById('landing-page').style.display = 'none';
                document.getElementById('main-dashboard').style.display = 'block';
                
                updateUserInformation(user.email);
                console.log('✅ Session restored successfully');
            }
        } catch (error) {
            console.error('Session restore error:', error);
            localStorage.removeItem('user_session');
        }
    }
}

// ===== ENHANCED PASSWORD ACCESS MANAGEMENT =====
function updatePasswordAccessUI() {
    const credentialsSection = document.querySelector('.credentials-section');
    const passwordWarning = document.querySelector('.password-warning');
    const credentialExportBtn = document.getElementById('credential-export-btn');
    const securityLevel = document.getElementById('security-level-display');
    const credentialAccess = document.getElementById('credential-access-display');
    const userAccessLevelSpan = document.getElementById('user-access-level');
    
    if (hasPasswordAccess) {
        // Show credential sections
        if (credentialsSection) {
            credentialsSection.style.display = 'block';
        }
        if (passwordWarning) {
            passwordWarning.style.display = 'none';
        }
        if (credentialExportBtn) {
            credentialExportBtn.style.display = 'inline-block';
        }
        
        // Update status displays
        if (securityLevel) {
            securityLevel.textContent = 'Administrator';
            securityLevel.className = 'status status--success';
        }
        if (credentialAccess) {
            credentialAccess.textContent = 'Full Access';
            credentialAccess.className = 'status status--success';
        }
        if (userAccessLevelSpan) {
            userAccessLevelSpan.textContent = '(Admin)';
            userAccessLevelSpan.className = 'user-access-level admin';
        }
        
    } else {
        // Hide credential sections
        if (credentialsSection) {
            credentialsSection.style.display = 'none';
        }
        if (passwordWarning) {
            passwordWarning.style.display = 'block';
        }
        if (credentialExportBtn) {
            credentialExportBtn.style.display = 'none';
        }
        
        // Update status displays
        if (securityLevel) {
            securityLevel.textContent = 'Standard User';
            securityLevel.className = 'status status--warning';
        }
        if (credentialAccess) {
            credentialAccess.textContent = 'Limited Access';
            credentialAccess.className = 'status status--warning';
        }
        if (userAccessLevelSpan) {
            userAccessLevelSpan.textContent = '(Standard)';
            userAccessLevelSpan.className = 'user-access-level standard';
        }
    }
    
    // Update credential access status message
    const credentialStatus = document.getElementById('credential-access-status');
    if (credentialStatus) {
        if (hasPasswordAccess) {
            credentialStatus.innerHTML = `
                <span style="color: var(--color-success);">
                    ✅ Full access granted - You can view and manage all password fields and sensitive data
                </span>
            `;
        } else {
            credentialStatus.innerHTML = `
                <span style="color: var(--color-error);">
                    🔒 Limited access - Password fields are restricted to pradeepkumar.v@hotmail.com
                </span>
            `;
        }
    }
}

function updateUserInterfaceForAccessLevel() {
    // Hide/show admin-only features based on access level
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(element => {
        element.style.display = hasPasswordAccess ? 'block' : 'none';
    });
    
    // Update menu items based on access level
    updateMenuItemsForAccessLevel();
    
    // Update button text and availability
    updateButtonsForAccessLevel();
}

function updateMenuItemsForAccessLevel() {
    // Enable/disable certain menu items based on access level
    const restrictedMenuItems = [
        'bulk-import-btn',
        'admin-settings-btn',
        'user-management-btn'
    ];
    
    restrictedMenuItems.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            if (hasPasswordAccess) {
                item.disabled = false;
                item.title = '';
            } else {
                item.disabled = true;
                item.title = 'This feature requires administrator access';
            }
        }
    });
}

function updateButtonsForAccessLevel() {
    // Update export buttons to show access level
    const exportButtons = document.querySelectorAll('[onclick*="export"]');
    exportButtons.forEach(button => {
        if (button.textContent.includes('Credentials') || button.textContent.includes('Password')) {
            if (!hasPasswordAccess) {
                button.disabled = true;
                button.title = 'Password export requires administrator access';
            }
        }
    });
}

// ===== COMPREHENSIVE DASHBOARD LOADING =====
async function loadCompleteDashboard() {
    try {
        showLoading(true);
        console.log('📊 Loading complete dashboard...');
        
        // Load all data types concurrently for better performance
        const loadPromises = [
            loadFamilyMembers(),
            loadInvestments(),
            loadLiabilities(),
            loadAccounts(),
            loadReminders()
        ];
        
        await Promise.all(loadPromises);
        
        // Render all dashboard sections
        await renderAllSections();
        
        // Update statistics and summaries
        updateAllStatistics();
        
        // Setup real-time subscriptions if supported
        setupRealTimeSubscriptions();
        
        // Update last updated time
        updateLastUpdatedTime();
        
        console.log('✅ Complete dashboard loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        showToast('Error loading dashboard data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== ENHANCED DATA LOADING FUNCTIONS =====
async function loadFamilyMembers() {
    try {
        console.log('👥 Loading family members...');
        
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        familyMembers = data || [];
        
        // Populate member selects in forms
        populateAllMemberSelects();
        
        console.log(`✅ Loaded ${familyMembers.length} family members`);
        
    } catch (error) {
        console.error('❌ Error loading family members:', error);
        throw new Error(`Failed to load family members: ${error.message}`);
    }
}

async function loadInvestments() {
    try {
        console.log('📈 Loading investments...');
        
        const { data, error } = await supabase
            .from('investments')
            .select(`
                *,
                family_members!inner(
                    id,
                    name,
                    relationship
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        investments = data || [];
        
        // Update investment type tabs with counts
        updateInvestmentTypeCounts();
        
        console.log(`✅ Loaded ${investments.length} investments`);
        
    } catch (error) {
        console.error('❌ Error loading investments:', error);
        throw new Error(`Failed to load investments: ${error.message}`);
    }
}

async function loadLiabilities() {
    try {
        console.log('📉 Loading liabilities...');
        
        const { data, error } = await supabase
            .from('liabilities')
            .select(`
                *,
                family_members!inner(
                    id,
                    name,
                    relationship
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        liabilities = data || [];
        
        // Update liability type tabs with counts
        updateLiabilityTypeCounts();
        
        console.log(`✅ Loaded ${liabilities.length} liabilities`);
        
    } catch (error) {
        console.error('❌ Error loading liabilities:', error);
        throw new Error(`Failed to load liabilities: ${error.message}`);
    }
}

async function loadAccounts() {
    try {
        console.log('🏦 Loading accounts...');
        
        const { data, error } = await supabase
            .from('accounts')
            .select(`
                *,
                holder:family_members!accounts_holder_id_fkey(
                    id,
                    name,
                    relationship
                ),
                nominee:family_members!accounts_nominee_id_fkey(
                    id,
                    name,
                    relationship
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        accounts = data || [];
        
        // Filter sensitive data for non-admin users
        if (!hasPasswordAccess) {
            accounts = accounts.map(account => {
                const { username, password, website_url, pin, ...publicData } = account;
                return publicData;
            });
        }
        
        console.log(`✅ Loaded ${accounts.length} accounts`);
        
    } catch (error) {
        console.error('❌ Error loading accounts:', error);
        throw new Error(`Failed to load accounts: ${error.message}`);
    }
}

async function loadReminders() {
    try {
        console.log('🔔 Loading reminders...');
        
        const { data, error } = await supabase
            .from('reminders')
            .select(`
                *,
                family_members(
                    id,
                    name,
                    relationship
                )
            `)
            .order('reminder_date', { ascending: true });

        if (error) throw error;
        
        reminders = data || [];
        
        // Update reminder counts
        updateReminderCounts();
        
        console.log(`✅ Loaded ${reminders.length} reminders`);
        
    } catch (error) {
        console.error('❌ Error loading reminders:', error);
        throw new Error(`Failed to load reminders: ${error.message}`);
    }
}

// ===== ENHANCED FORM MANAGEMENT =====
function updateInvestmentForm() {
    const type = document.getElementById('investment-type').value;
    console.log(`🔄 Updating investment form for type: ${type}`);
    
    // Hide all conditional fields first
    const conditionalFields = document.querySelectorAll('.conditional-fields');
    conditionalFields.forEach(field => {
        field.style.display = 'none';
    });
    
    // Set default invested date for enhanced forms
    const today = new Date().toISOString().split('T')[0];
    
    // Show relevant fields based on investment type
    switch(type) {
        case 'fixedDeposits':
            showFixedDepositFields(today);
            break;
        case 'insurance':
            showInsuranceFields(today);
            break;
        case 'bankBalances':
            showBankBalanceFields(today);
            break;
        case 'equity':
            showEquityFields();
            break;
        case 'mutualFunds':
            showMutualFundsFields();
            break;
        default:
            break;
    }
}

function showFixedDepositFields(today) {
    const fdFields = document.querySelector('.fixed-deposit-fields');
    if (fdFields) {
        fdFields.style.display = 'block';
        
        // Set default values for FD fields
        const fdInvestedDate = document.getElementById('fd-invested-date');
        const fdStartDate = document.getElementById('fd-start-date');
        
        if (fdInvestedDate && !fdInvestedDate.value) {
            fdInvestedDate.value = today;
        }
        if (fdStartDate && !fdStartDate.value) {
            fdStartDate.value = today;
        }
        
        // Setup FD-specific event listeners
        setupFDFieldListeners();
    }
}

function showInsuranceFields(today) {
    const insuranceFields = document.querySelector('.insurance-fields');
    if (insuranceFields) {
        insuranceFields.style.display = 'block';
        
        // Set default values for insurance fields
        const insuranceInvestedDate = document.getElementById('insurance-invested-date');
        const insuranceStartDate = document.getElementById('insurance-start-date');
        
        if (insuranceInvestedDate && !insuranceInvestedDate.value) {
            insuranceInvestedDate.value = today;
        }
        if (insuranceStartDate && !insuranceStartDate.value) {
            insuranceStartDate.value = today;
        }
        
        // Setup insurance-specific event listeners
        setupInsuranceFieldListeners();
    }
}

function showBankBalanceFields(today) {
    const bankFields = document.querySelector('.bank-balance-fields');
    if (bankFields) {
        bankFields.style.display = 'block';
        
        // Set default as of date
        const asOfDate = document.getElementById('bank-as-of-date');
        if (asOfDate && !asOfDate.value) {
            asOfDate.value = today;
        }
    }
}

function showEquityFields() {
    const equityFields = document.querySelector('.equity-fields');
    if (equityFields) {
        equityFields.style.display = 'block';
        setupEquityFieldListeners();
    }
}

function showMutualFundsFields() {
    const mfFields = document.querySelector('.mutual-funds-fields');
    if (mfFields) {
        mfFields.style.display = 'block';
        setupMFFieldListeners();
    }
}

// ===== ENHANCED FIELD LISTENERS SETUP =====
function setupFDFieldListeners() {
    // Auto-calculate maturity date based on tenure
    const tenureField = document.getElementById('fd-tenure-months');
    const startDateField = document.getElementById('fd-start-date');
    const maturityDateField = document.getElementById('fd-maturity-date');
    
    if (tenureField && startDateField && maturityDateField) {
        const calculateMaturityDate = () => {
            const tenure = parseInt(tenureField.value);
            const startDate = new Date(startDateField.value);
            
            if (tenure && startDate) {
                const maturityDate = new Date(startDate);
                maturityDate.setMonth(maturityDate.getMonth() + tenure);
                maturityDateField.value = maturityDate.toISOString().split('T')[0];
            }
        };
        
        tenureField.addEventListener('change', calculateMaturityDate);
        startDateField.addEventListener('change', calculateMaturityDate);
    }
    
    // Auto-calculate maturity amount
    const principalField = document.getElementById('investment-amount');
    const interestRateField = document.getElementById('fd-interest-rate');
    
    if (principalField && interestRateField && tenureField) {
        const calculateMaturityAmount = () => {
            const principal = parseFloat(principalField.value) || 0;
            const rate = parseFloat(interestRateField.value) || 0;
            const tenure = parseInt(tenureField.value) || 0;
            
            if (principal && rate && tenure) {
                // Simple interest calculation for FD
                const maturityAmount = principal + (principal * rate * tenure / 12 / 100);
                const currentValueField = document.getElementById('investment-current-value');
                if (currentValueField) {
                    currentValueField.value = maturityAmount.toFixed(2);
                }
            }
        };
        
        principalField.addEventListener('change', calculateMaturityAmount);
        interestRateField.addEventListener('change', calculateMaturityAmount);
        tenureField.addEventListener('change', calculateMaturityAmount);
    }
}

function setupInsuranceFieldListeners() {
    // Auto-calculate total premiums paid
    const premiumField = document.getElementById('insurance-premium');
    const frequencyField = document.getElementById('insurance-payment-frequency');
    const startDateField = document.getElementById('insurance-start-date');
    
    if (premiumField && frequencyField && startDateField) {
        const calculateTotalPremiums = () => {
            const premium = parseFloat(premiumField.value) || 0;
            const frequency = frequencyField.value;
            const startDate = new Date(startDateField.value);
            const currentDate = new Date();
            
            if (premium && frequency && startDate && currentDate > startDate) {
                const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                 (currentDate.getMonth() - startDate.getMonth());
                
                let paymentsPerYear = 1;
                switch(frequency) {
                    case 'Monthly': paymentsPerYear = 12; break;
                    case 'Quarterly': paymentsPerYear = 4; break;
                    case 'Half-yearly': paymentsPerYear = 2; break;
                    case 'Annual': paymentsPerYear = 1; break;
                }
                
                const totalPayments = Math.floor(monthsDiff / (12 / paymentsPerYear));
                const totalPremiumsPaid = premium * totalPayments;
                
                const currentValueField = document.getElementById('investment-current-value');
                if (currentValueField && totalPremiumsPaid > 0) {
                    currentValueField.value = totalPremiumsPaid.toFixed(2);
                }
            }
        };
        
        premiumField.addEventListener('change', calculateTotalPremiums);
        frequencyField.addEventListener('change', calculateTotalPremiums);
        startDateField.addEventListener('change', calculateTotalPremiums);
    }
}

function setupEquityFieldListeners() {
    // Auto-calculate invested amount from quantity and average price
    const quantityField = document.getElementById('equity-quantity');
    const avgPriceField = document.getElementById('equity-avg-price');
    const investedAmountField = document.getElementById('investment-amount');
    
    if (quantityField && avgPriceField && investedAmountField) {
        const calculateInvestedAmount = () => {
            const quantity = parseInt(quantityField.value) || 0;
            const avgPrice = parseFloat(avgPriceField.value) || 0;
            
            if (quantity && avgPrice) {
                const investedAmount = quantity * avgPrice;
                investedAmountField.value = investedAmount.toFixed(2);
            }
        };
        
        quantityField.addEventListener('change', calculateInvestedAmount);
        avgPriceField.addEventListener('change', calculateInvestedAmount);
    }
}

function setupMFFieldListeners() {
    // Setup mutual fund specific calculations
    const sipAmountField = document.getElementById('mf-sip-amount');
    const installmentsField = document.getElementById('mf-installments');
    
    if (sipAmountField && installmentsField) {
        const calculateTotalInvestment = () => {
            const sipAmount = parseFloat(sipAmountField.value) || 0;
            const installments = parseInt(installmentsField.value) || 0;
            
            if (sipAmount && installments) {
                const totalInvestment = sipAmount * installments;
                const investedAmountField = document.getElementById('investment-amount');
                if (investedAmountField) {
                    investedAmountField.value = totalInvestment.toFixed(2);
                }
            }
        };
        
        sipAmountField.addEventListener('change', calculateTotalInvestment);
        installmentsField.addEventListener('change', calculateTotalInvestment);
    }
}

// ===== ENHANCED INVESTMENT SAVING =====
async function saveInvestment() {
    try {
        console.log('💾 Saving investment...');
        showLoading(true);
        
        // Get basic investment data
        const investmentData = {
            member_id: document.getElementById('investment-member').value,
            type: document.getElementById('investment-type').value,
            name: document.getElementById('investment-name').value,
            invested_amount: parseFloat(document.getElementById('investment-amount').value) || 0,
            current_value: parseFloat(document.getElementById('investment-current-value').value) || 0,
            platform: document.getElementById('investment-platform').value || null
        };
        
        // Validate required fields
        if (!investmentData.member_id || !investmentData.type || !investmentData.name) {
            throw new Error('Please fill in all required fields');
        }
        
        // Add type-specific enhanced fields
        await addEnhancedInvestmentFields(investmentData);
        
        let result;
        if (isEditMode && editingInvestmentId) {
            // Update existing investment
            result = await supabase
                .from('investments')
                .update(investmentData)
                .eq('id', editingInvestmentId);
                
            console.log('✅ Investment updated successfully');
        } else {
            // Insert new investment
            result = await supabase
                .from('investments')
                .insert([investmentData]);
                
            console.log('✅ Investment created successfully');
        }

        if (result.error) throw result.error;

        // Reload investments and refresh UI
        await loadInvestments();
        renderInvestmentTabContent(currentInvestmentType);
        updateAllStatistics();
        
        // Close modal and reset form
        closeModal('investment-modal');
        resetInvestmentForm();
        
        showToast(
            `Investment ${isEditMode ? 'updated' : 'added'} successfully!`,
            'success'
        );

    } catch (error) {
        console.error('❌ Error saving investment:', error);
        showToast('Error saving investment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function addEnhancedInvestmentFields(investmentData) {
    const type = investmentData.type;
    
    // Enhanced Fixed Deposit fields
    if (type === 'fixedDeposits') {
        investmentData.fd_invested_date = document.getElementById('fd-invested-date')?.value || null;
        investmentData.fd_bank_name = document.getElementById('fd-bank-name')?.value || null;
        investmentData.fd_interest_rate = parseFloat(document.getElementById('fd-interest-rate')?.value) || null;
        investmentData.fd_interest_payout = document.getElementById('fd-interest-payout')?.value || null;
        investmentData.fd_start_date = document.getElementById('fd-start-date')?.value || null;
        investmentData.fd_maturity_date = document.getElementById('fd-maturity-date')?.value || null;
        investmentData.fd_account_number = document.getElementById('fd-account-number')?.value || null;
        investmentData.fd_nominee = document.getElementById('fd-nominee')?.value || null;
        investmentData.fd_comments = document.getElementById('fd-comments')?.value || null;
        
        console.log('📊 Added enhanced FD fields to investment data');
    }
    
    // Enhanced Insurance fields
    if (type === 'insurance') {
        investmentData.insurance_invested_date = document.getElementById('insurance-invested-date')?.value || null;
        investmentData.insurance_type = document.getElementById('insurance-type')?.value || null;
        investmentData.insurance_premium = parseFloat(document.getElementById('insurance-premium')?.value) || null;
        investmentData.insurance_sum_assured = parseFloat(document.getElementById('insurance-sum-assured')?.value) || null;
        investmentData.insurance_payment_frequency = document.getElementById('insurance-payment-frequency')?.value || null;
        investmentData.insurance_start_date = document.getElementById('insurance-start-date')?.value || null;
        investmentData.insurance_maturity_date = document.getElementById('insurance-maturity-date')?.value || null;
        investmentData.insurance_policy_number = document.getElementById('insurance-policy-number')?.value || null;
        investmentData.insurance_comments = document.getElementById('insurance-comments')?.value || null;
        
        console.log('🛡️ Added enhanced Insurance fields to investment data');
    }
    
    // Bank Balance fields
    if (type === 'bankBalances') {
        investmentData.bank_current_balance = parseFloat(document.getElementById('bank-current-balance')?.value) || null;
        investmentData.bank_as_of_date = document.getElementById('bank-as-of-date')?.value || null;
        investmentData.bank_account_type = document.getElementById('bank-account-type')?.value || null;
        
        console.log('💰 Added Bank Balance fields to investment data');
    }
    
    // Equity fields
    if (type === 'equity') {
        investmentData.equity_quantity = parseInt(document.getElementById('equity-quantity')?.value) || null;
        investmentData.equity_avg_price = parseFloat(document.getElementById('equity-avg-price')?.value) || null;
        investmentData.equity_symbol = document.getElementById('equity-symbol')?.value || null;
        investmentData.equity_sector = document.getElementById('equity-sector')?.value || null;
        
        console.log('📈 Added Equity fields to investment data');
    }
    
    // Mutual Fund fields
    if (type === 'mutualFunds') {
        investmentData.mf_fund_house = document.getElementById('mf-fund-house')?.value || null;
        investmentData.mf_scheme_code = document.getElementById('mf-scheme-code')?.value || null;
        investmentData.mf_sip_amount = parseFloat(document.getElementById('mf-sip-amount')?.value) || null;
        investmentData.mf_installments = parseInt(document.getElementById('mf-installments')?.value) || null;
        
        console.log('📊 Added Mutual Fund fields to investment data');
    }
}

// ===== ENHANCED ACCOUNT MANAGEMENT =====
async function saveAccount() {
    try {
        console.log('🏦 Saving account...');
        showLoading(true);
        
        // Get basic account data
        const accountData = {
            account_type: document.getElementById('account-type').value,
            institution: document.getElementById('account-institution').value,
            account_number: document.getElementById('account-number').value,
            holder_id: document.getElementById('account-holder').value,
            nominee_id: document.getElementById('account-nominee').value || null,
            status: document.getElementById('account-status').value || 'Active',
            comments: document.getElementById('account-comments').value || null
        };
        
        // Validate required fields
        if (!accountData.account_type || !accountData.institution || !accountData.account_number || !accountData.holder_id) {
            throw new Error('Please fill in all required fields');
        }
        
        // Enhanced Credentials (only for authorized users)
        if (hasPasswordAccess) {
            accountData.username = document.getElementById('account-username')?.value || null;
            accountData.password = document.getElementById('account-password')?.value || null;
            accountData.website_url = document.getElementById('account-url')?.value || null;
            accountData.pin = document.getElementById('account-pin')?.value || null;
            
            console.log('🔐 Added credential fields (authorized user)');
        } else {
            console.log('⚠️ Credential fields skipped (unauthorized user)');
        }
        
        // Add holder and nominee names for easier querying
        const holder = familyMembers.find(m => m.id === accountData.holder_id);
        const nominee = familyMembers.find(m => m.id === accountData.nominee_id);
        
        accountData.holder_name = holder ? holder.name : null;
        accountData.nominee_name = nominee ? nominee.name : null;

        let result;
        if (isEditMode && editingAccountId) {
            // Update existing account
            result = await supabase
                .from('accounts')
                .update(accountData)
                .eq('id', editingAccountId);
                
            console.log('✅ Account updated successfully');
        } else {
            // Insert new account
            result = await supabase
                .from('accounts')
                .insert([accountData]);
                
            console.log('✅ Account created successfully');
        }

        if (result.error) throw result.error;

        // Reload accounts and refresh UI
        await loadAccounts();
        renderAccounts();
        updateAllStatistics();
        
        // Close modal and reset form
        closeModal('account-modal');
        resetAccountForm();
        
        showToast(
            `Account ${isEditMode ? 'updated' : 'added'} successfully!`,
            'success'
        );

    } catch (error) {
        console.error('❌ Error saving account:', error);
        showToast('Error saving account: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== ENHANCED RENDERING FUNCTIONS =====
function renderInvestmentTabContent(type) {
    currentInvestmentType = type;
    console.log(`📊 Rendering investment tab: ${type}`);
    
    // Update active tab
    document.querySelectorAll('.investment-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // Filter investments by type
    const filteredInvestments = investments.filter(inv => inv.type === type);
    
    // Update type-specific summary
    renderInvestmentTypeSummary(filteredInvestments, type);
    
    // Render investment table
    renderInvestmentTable(filteredInvestments, type);
    
    // Update type-specific insights
    renderInvestmentTypeInsights(filteredInvestments, type);
}

function renderInvestmentTable(filteredInvestments, type) {
    const tableBody = document.getElementById('investment-table-body');
    if (!tableBody) return;

    if (filteredInvestments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: var(--space-32);">
                    <div style="color: var(--color-text-secondary);">
                        <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-16);">
                            ${getInvestmentTypeIcon(type)}
                        </div>
                        <h4>No ${INVESTMENT_TYPES[type]} Found</h4>
                        <p style="margin: var(--space-16) 0;">Start tracking your ${INVESTMENT_TYPES[type].toLowerCase()} to build your portfolio.</p>
                        <button onclick="openAddInvestmentModal('${type}')" class="btn btn--primary">
                            Add First ${INVESTMENT_TYPES[type]}
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredInvestments.map(investment => {
        const gain = (investment.current_value || 0) - (investment.invested_amount || 0);
        const gainPercentage = investment.invested_amount > 0 ? 
            ((gain / investment.invested_amount) * 100).toFixed(2) : '0.00';
        
        const memberName = investment.family_members?.name || 'Unknown';
        
        // Enhanced display with type-specific details and comments
        let nameDisplay = `<strong>${investment.name}</strong>`;
        let enhancedDetails = '';
        
        // Enhanced FD details
        if (type === 'fixedDeposits') {
            enhancedDetails += investment.fd_bank_name ? `<br><small>🏦 ${investment.fd_bank_name}</small>` : '';
            enhancedDetails += investment.fd_interest_rate ? `<br><small>📊 ${investment.fd_interest_rate}% interest</small>` : '';
            enhancedDetails += investment.fd_maturity_date ? `<br><small>📅 Matures: ${formatDate(investment.fd_maturity_date)}</small>` : '';
            if (investment.fd_comments) {
                nameDisplay += `<br><small class="comments">💬 ${truncateText(investment.fd_comments, 50)}</small>`;
            }
        }
        
        // Enhanced Insurance details
        if (type === 'insurance') {
            enhancedDetails += investment.insurance_type ? `<br><small>🛡️ ${investment.insurance_type}</small>` : '';
            enhancedDetails += investment.insurance_sum_assured ? `<br><small>💰 Sum Assured: ${formatCurrency(investment.insurance_sum_assured)}</small>` : '';
            enhancedDetails += investment.insurance_premium ? `<br><small>💳 Premium: ${formatCurrency(investment.insurance_premium)}</small>` : '';
            if (investment.insurance_comments) {
                nameDisplay += `<br><small class="comments">💬 ${truncateText(investment.insurance_comments, 50)}</small>`;
            }
        }
        
        // Enhanced Equity details
        if (type === 'equity') {
            enhancedDetails += investment.equity_symbol ? `<br><small>📊 ${investment.equity_symbol}</small>` : '';
            enhancedDetails += investment.equity_sector ? `<br><small>🏢 ${investment.equity_sector}</small>` : '';
            enhancedDetails += investment.equity_quantity ? `<br><small>📦 Qty: ${investment.equity_quantity}</small>` : '';
        }
        
        // Enhanced Bank Balance details
        if (type === 'bankBalances') {
            enhancedDetails += investment.bank_account_type ? `<br><small>🏦 ${investment.bank_account_type}</small>` : '';
            enhancedDetails += investment.bank_as_of_date ? `<br><small>📅 As of: ${formatDate(investment.bank_as_of_date)}</small>` : '';
        }
        
        const investedDate = getInvestmentInvestedDate(investment, type);
        
        return `
            <tr>
                <td>${nameDisplay}</td>
                <td>
                    <div class="member-info">
                        <strong>${memberName}</strong>
                        <small>${investment.family_members?.relationship || ''}</small>
                    </div>
                </td>
                <td>₹${formatNumber(investment.invested_amount)}</td>
                <td>₹${formatNumber(investment.current_value || investment.invested_amount)}</td>
                <td>
                    <div class="gain-loss ${gain >= 0 ? 'positive' : 'negative'}">
                        <strong>₹${formatNumber(Math.abs(gain))}</strong>
                        <small>(${gain >= 0 ? '+' : '-'}${Math.abs(gainPercentage)}%)</small>
                    </div>
                </td>
                <td>
                    <div class="platform-info">
                        <strong>${investment.platform || 'N/A'}</strong>
                        ${investment.platform ? '<small>Platform</small>' : ''}
                    </div>
                </td>
                <td>
                    <div class="date-info">
                        ${investedDate ? `<small>📅 ${formatDate(investedDate)}</small><br>` : ''}
                        <small>Added: ${formatDate(investment.created_at)}</small>
                    </div>
                </td>
                <td>
                    <div class="enhanced-details">
                        ${enhancedDetails || '<small>Basic investment</small>'}
                        <button onclick="showInvestmentDetails('${investment.id}')" class="btn btn--info btn--sm" style="margin-top: var(--space-4);">
                            📋 View Details
                        </button>
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editInvestment('${investment.id}')" class="btn btn--warning btn--sm" title="Edit Investment">
                            ✏️
                        </button>
                        <button onclick="deleteInvestment('${investment.id}')" class="btn btn--danger btn--sm" title="Delete Investment">
                            🗑️
                        </button>
                        <button onclick="duplicateInvestment('${investment.id}')" class="btn btn--secondary btn--sm" title="Duplicate Investment">
                            📋
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderInvestmentTypeSummary(investments, type) {
    const totalCount = investments.length;
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.current_value || inv.invested_amount || 0), 0);
    const totalGain = totalCurrentValue - totalInvested;
    const totalReturn = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : '0.00';
    
    // Update summary display
    document.getElementById('current-type-count').textContent = totalCount;
    document.getElementById('current-type-invested').textContent = `₹${formatNumber(totalInvested)}`;
    document.getElementById('current-type-value').textContent = `₹${formatNumber(totalCurrentValue)}`;
    
    const gainElement = document.getElementById('current-type-gain');
    if (gainElement) {
        gainElement.textContent = `₹${formatNumber(Math.abs(totalGain))}`;
        gainElement.className = `summary-value ${totalGain >= 0 ? 'positive' : 'negative'}`;
    }
    
    const returnElement = document.getElementById('current-type-return');
    if (returnElement) {
        returnElement.textContent = `${totalGain >= 0 ? '+' : '-'}${Math.abs(totalReturn)}%`;
        returnElement.className = `summary-value ${totalGain >= 0 ? 'positive' : 'negative'}`;
    }
}

function renderInvestmentTypeInsights(investments, type) {
    const insightsContainer = document.getElementById('type-specific-insights');
    if (!insightsContainer) return;
    
    let insightsHTML = '';
    
    switch(type) {
        case 'fixedDeposits':
            insightsHTML = renderFDInsights(investments);
            break;
        case 'insurance':
            insightsHTML = renderInsuranceInsights(investments);
            break;
        case 'equity':
            insightsHTML = renderEquityInsights(investments);
            break;
        case 'mutualFunds':
            insightsHTML = renderMFInsights(investments);
            break;
        case 'bankBalances':
            insightsHTML = renderBankInsights(investments);
            break;
        default:
            insightsHTML = '<p>General investment insights will be displayed here.</p>';
    }
    
    insightsContainer.innerHTML = insightsHTML;
}

function renderFDInsights(fdInvestments) {
    const totalFDs = fdInvestments.length;
    const avgInterestRate = fdInvestments
        .filter(fd => fd.fd_interest_rate)
        .reduce((sum, fd, _, arr) => sum + fd.fd_interest_rate / arr.length, 0);
    
    const upcomingMaturityCount = fdInvestments.filter(fd => {
        if (!fd.fd_maturity_date) return false;
        const maturityDate = new Date(fd.fd_maturity_date);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return maturityDate <= threeMonthsFromNow;
    }).length;
    
    return `
        <div class="fd-insights">
            <h4>🏦 Fixed Deposit Insights</h4>
            <div class="insights-grid">
                <div class="insight-item">
                    <strong>${avgInterestRate.toFixed(2)}%</strong>
                    <small>Average Interest Rate</small>
                </div>
                <div class="insight-item">
                    <strong>${upcomingMaturityCount}</strong>
                    <small>Maturing in 3 months</small>
                </div>
                <div class="insight-item">
                    <strong>${totalFDs}</strong>
                    <small>Total FD Accounts</small>
                </div>
            </div>
            ${upcomingMaturityCount > 0 ? `
                <div class="alert alert--warning">
                    ⚠️ You have ${upcomingMaturityCount} FDs maturing soon. Consider renewal options.
                </div>
            ` : ''}
        </div>
    `;
}

function renderInsuranceInsights(insuranceInvestments) {
    const totalPolicies = insuranceInvestments.length;
    const totalSumAssured = insuranceInvestments
        .reduce((sum, policy) => sum + (policy.insurance_sum_assured || 0), 0);
    const totalPremiums = insuranceInvestments
        .reduce((sum, policy) => sum + (policy.insurance_premium || 0), 0);
    
    const policyTypes = [...new Set(insuranceInvestments
        .filter(policy => policy.insurance_type)
        .map(policy => policy.insurance_type))];
    
    return `
        <div class="insurance-insights">
            <h4>🛡️ Insurance Portfolio Insights</h4>
            <div class="insights-grid">
                <div class="insight-item">
                    <strong>₹${formatNumber(totalSumAssured)}</strong>
                    <small>Total Coverage</small>
                </div>
                <div class="insight-item">
                    <strong>₹${formatNumber(totalPremiums)}</strong>
                    <small>Annual Premiums</small>
                </div>
                <div class="insight-item">
                    <strong>${policyTypes.length}</strong>
                    <small>Policy Types</small>
                </div>
            </div>
            <div class="policy-types">
                <small>Coverage Types: ${policyTypes.join(', ')}</small>
            </div>
        </div>
    `;
}

function renderEquityInsights(equityInvestments) {
    const totalStocks = equityInvestments.length;
    const sectors = [...new Set(equityInvestments
        .filter(stock => stock.equity_sector)
        .map(stock => stock.equity_sector))];
    
    const totalQuantity = equityInvestments
        .reduce((sum, stock) => sum + (stock.equity_quantity || 0), 0);
    
    return `
        <div class="equity-insights">
            <h4>📊 Equity Portfolio Insights</h4>
            <div class="insights-grid">
                <div class="insight-item">
                    <strong>${totalStocks}</strong>
                    <small>Total Stocks</small>
                </div>
                <div class="insight-item">
                    <strong>${sectors.length}</strong>
                    <small>Sectors</small>
                </div>
                <div class="insight-item">
                    <strong>${totalQuantity}</strong>
                    <small>Total Shares</small>
                </div>
            </div>
            <div class="sector-distribution">
                <small>Sectors: ${sectors.join(', ')}</small>
            </div>
        </div>
    `;
}

function renderMFInsights(mfInvestments) {
    const totalFunds = mfInvestments.length;
    const fundHouses = [...new Set(mfInvestments
        .filter(fund => fund.mf_fund_house)
        .map(fund => fund.mf_fund_house))];
    
    const totalSIPAmount = mfInvestments
        .reduce((sum, fund) => sum + (fund.mf_sip_amount || 0), 0);
    
    return `
        <div class="mf-insights">
            <h4>📈 Mutual Fund Insights</h4>
            <div class="insights-grid">
                <div class="insight-item">
                    <strong>${totalFunds}</strong>
                    <small>Total Funds</small>
                </div>
                <div class="insight-item">
                    <strong>${fundHouses.length}</strong>
                    <small>Fund Houses</small>
                </div>
                <div class="insight-item">
                    <strong>₹${formatNumber(totalSIPAmount)}</strong>
                    <small>Monthly SIP</small>
                </div>
            </div>
        </div>
    `;
}

function renderBankInsights(bankInvestments) {
    const totalAccounts = bankInvestments.length;
    const accountTypes = [...new Set(bankInvestments
        .filter(acc => acc.bank_account_type)
        .map(acc => acc.bank_account_type))];
    
    return `
        <div class="bank-insights">
            <h4>💰 Bank Balance Insights</h4>
            <div class="insights-grid">
                <div class="insight-item">
                    <strong>${totalAccounts}</strong>
                    <small>Bank Accounts</small>
                </div>
                <div class="insight-item">
                    <strong>${accountTypes.length}</strong>
                    <small>Account Types</small>
                </div>
            </div>
        </div>
    `;
}

// ===== ENHANCED ACCOUNT RENDERING WITH CREDENTIAL PROTECTION =====
function renderAccounts() {
    console.log('🏦 Rendering accounts with credential protection...');
    
    const tableBody = document.getElementById('accounts-table-body');
    if (!tableBody) return;

    if (accounts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: var(--space-32);">
                    <div style="color: var(--color-text-secondary);">
                        <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-16);">🏦</div>
                        <h4>No Accounts Found</h4>
                        <p style="margin: var(--space-16) 0;">Add your first account to start managing your financial accounts securely.</p>
                        <button onclick="openAddAccountModal()" class="btn btn--primary">
                            Add First Account
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Update account statistics
    updateAccountStatistics();

    tableBody.innerHTML = accounts.map(account => {
        const holderName = account.holder?.name || account.holder_name || 'Unknown';
        const nomineeName = account.nominee?.name || account.nominee_name || 'N/A';
        
        // Enhanced credential display with strict access control
        let credentialsDisplay = '';
        if (hasPasswordAccess) {
            // Full access user - show credentials with proper formatting
            const hasCredentials = account.username || account.password || account.website_url || account.pin;
            
            if (hasCredentials) {
                credentialsDisplay = `
                    <div class="credential-info secure-access">
                        ${account.username ? `<div class="credential-item">👤 <span class="credential-value">${account.username}</span></div>` : ''}
                        ${account.password ? `<div class="credential-item">🔑 <span class="credential-value">${maskPassword(account.password)}</span></div>` : ''}
                        ${account.website_url ? `<div class="credential-item">🌐 <a href="${account.website_url}" target="_blank" rel="noopener">Portal</a></div>` : ''}
                        ${account.pin ? `<div class="credential-item">📱 <span class="credential-value">PIN Set</span></div>` : ''}
                        <button onclick="togglePasswordVisibility('${account.id}')" class="btn btn--info btn--xs">
                            👁️ Toggle
                        </button>
                    </div>
                `;
            } else {
                credentialsDisplay = `
                    <div class="credential-info no-credentials">
                        <small>No credentials stored</small>
                        <button onclick="addAccountCredentials('${account.id}')" class="btn btn--secondary btn--xs">
                            🔐 Add Credentials
                        </button>
                    </div>
                `;
            }
        } else {
            // Restricted access user - show access denied message
            credentialsDisplay = `
                <div class="credential-info restricted-access">
                    <div class="access-denied">
                        🔒 <strong>Access Restricted</strong><br>
                        <small>Administrator access required</small>
                    </div>
                </div>
            `;
        }
        
        // Enhanced comments display
        const commentsDisplay = account.comments ? 
            truncateText(account.comments, 50) : 
            '<small class="no-comments">No comments</small>';
        
        return `
            <tr>
                <td>
                    <div class="account-type-info">
                        <strong>${account.account_type}</strong>
                        <small class="account-category">${getAccountCategory(account.account_type)}</small>
                    </div>
                </td>
                <td>
                    <div class="institution-info">
                        <strong>${account.institution}</strong>
                        <small>Banking Partner</small>
                    </div>
                </td>
                <td>
                    <div class="account-number-info">
                        <strong>${maskAccountNumber(account.account_number)}</strong>
                        <button onclick="copyAccountNumber('${account.account_number}')" class="btn btn--info btn--xs" title="Copy Account Number">
                            📋
                        </button>
                    </div>
                </td>
                <td>
                    <div class="holder-info">
                        <strong>${holderName}</strong>
                        <small>${account.holder?.relationship || 'Account Holder'}</small>
                    </div>
                </td>
                <td>
                    <div class="nominee-info">
                        <strong>${nomineeName}</strong>
                        ${nomineeName !== 'N/A' ? `<small>${account.nominee?.relationship || 'Nominee'}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="status ${getAccountStatusClass(account.status)}">
                        ${getAccountStatusIcon(account.status)} ${account.status || 'Active'}
                    </span>
                </td>
                <td class="credentials-cell">
                    ${credentialsDisplay}
                </td>
                <td>
                    <div class="comments-info">
                        ${commentsDisplay}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editAccount('${account.id}')" class="btn btn--warning btn--sm" title="Edit Account">
                            ✏️
                        </button>
                        <button onclick="deleteAccount('${account.id}')" class="btn btn--danger btn--sm" title="Delete Account">
                            🗑️
                        </button>
                        <button onclick="viewAccountDetails('${account.id}')" class="btn btn--info btn--sm" title="View Details">
                            👁️
                        </button>
                        ${hasPasswordAccess ? `
                            <button onclick="testAccountConnection('${account.id}')" class="btn btn--secondary btn--sm" title="Test Connection">
                                🔗
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== ENHANCED EXPORT FUNCTIONS WITH CREDENTIAL PROTECTION =====
async function exportFamilyData() {
    try {
        console.log('📤 Starting complete family data export...');
        showLoading(true);
        
        const exportData = {
            metadata: {
                export_date: new Date().toISOString(),
                exported_by: currentUser?.email || 'Unknown',
                export_version: '2.0',
                has_full_access: hasPasswordAccess,
                total_records: familyMembers.length + investments.length + liabilities.length + accounts.length + reminders.length,
                export_settings: exportSettings
            },
            family_members: familyMembers.map(member => ({
                ...member,
                // Include all family member data
            })),
            investments: investments.map(investment => ({
                ...investment,
                // Include all investment data with enhanced fields
                member_name: investment.family_members?.name || 'Unknown'
            })),
            liabilities: liabilities.map(liability => ({
                ...liability,
                // Include all liability data
                member_name: liability.family_members?.name || 'Unknown'
            })),
            accounts: hasPasswordAccess ? 
                // Full access: include all account data
                accounts.map(account => ({
                    ...account,
                    holder_name: account.holder?.name || account.holder_name || 'Unknown',
                    nominee_name: account.nominee?.name || account.nominee_name || null
                })) :
                // Limited access: exclude credentials
                accounts.map(account => {
                    const { username, password, website_url, pin, ...publicData } = account;
                    return {
                        ...publicData,
                        holder_name: account.holder?.name || account.holder_name || 'Unknown',
                        nominee_name: account.nominee?.name || account.nominee_name || null,
                        credentials_note: 'Credentials excluded - requires administrator access'
                    };
                }),
            reminders: reminders.map(reminder => ({
                ...reminder,
                // Include all reminder data
                member_name: reminder.family_members?.name || null
            }))
        };

        // Create and download the export file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-wealth-data-${new Date().toISOString().split('T')[0]}-${hasPasswordAccess ? 'full' : 'limited'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Log export activity
        console.log('✅ Family data export completed successfully');
        console.log(`📊 Export summary:
            - Family Members: ${familyMembers.length}
            - Investments: ${investments.length}
            - Liabilities: ${liabilities.length}
            - Accounts: ${accounts.length}
            - Reminders: ${reminders.length}
            - Access Level: ${hasPasswordAccess ? 'Full' : 'Limited'}
        `);
        
        showToast(
            `Family data exported successfully! ${hasPasswordAccess ? 'Full access' : 'Limited access'} export completed.`,
            'success'
        );
        
    } catch (error) {
        console.error('❌ Error exporting family data:', error);
        showToast('Error exporting family data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportInvestments() {
    try {
        console.log('📈 Starting enhanced investments export...');
        showLoading(true);
        
        const csvData = investments.map(inv => {
            const baseData = {
                'Member Name': inv.family_members?.name || 'Unknown',
                'Member Relationship': inv.family_members?.relationship || 'Unknown',
                'Investment Type': INVESTMENT_TYPES[inv.type] || inv.type,
                'Investment Name': inv.name,
                'Platform/Broker': inv.platform || '',
                'Invested Amount': inv.invested_amount || 0,
                'Current Value': inv.current_value || inv.invested_amount || 0,
                'Gain/Loss': (inv.current_value || inv.invested_amount || 0) - (inv.invested_amount || 0),
                'Return %': inv.invested_amount > 0 ? 
                    (((inv.current_value || inv.invested_amount) - inv.invested_amount) / inv.invested_amount * 100).toFixed(2) : 0,
                'Created Date': formatDate(inv.created_at)
            };
            
            // Enhanced FD export fields
            if (inv.type === 'fixedDeposits') {
                return {
                    ...baseData,
                    'FD Invested Date': inv.fd_invested_date ? formatDate(inv.fd_invested_date) : '',
                    'Bank Name': inv.fd_bank_name || '',
                    'Interest Rate (%)': inv.fd_interest_rate || '',
                    'Interest Payout Frequency': inv.fd_interest_payout || '',
                    'FD Start Date': inv.fd_start_date ? formatDate(inv.fd_start_date) : '',
                    'FD Maturity Date': inv.fd_maturity_date ? formatDate(inv.fd_maturity_date) : '',
                    'FD Account Number': inv.fd_account_number || '',
                    'FD Nominee': inv.fd_nominee || '',
                    'FD Comments': inv.fd_comments || ''
                };
            }
            
            // Enhanced Insurance export fields
            if (inv.type === 'insurance') {
                return {
                    ...baseData,
                    'Insurance Invested Date': inv.insurance_invested_date ? formatDate(inv.insurance_invested_date) : '',
                    'Insurance Type': inv.insurance_type || '',
                    'Premium Amount': inv.insurance_premium || '',
                    'Sum Assured': inv.insurance_sum_assured || '',
                    'Payment Frequency': inv.insurance_payment_frequency || '',
                    'Policy Start Date': inv.insurance_start_date ? formatDate(inv.insurance_start_date) : '',
                    'Policy Maturity Date': inv.insurance_maturity_date ? formatDate(inv.insurance_maturity_date) : '',
                    'Policy Number': inv.insurance_policy_number || '',
                    'Insurance Comments': inv.insurance_comments || ''
                };
            }
            
            // Enhanced Equity export fields
            if (inv.type === 'equity') {
                return {
                    ...baseData,
                    'Stock Symbol': inv.equity_symbol || '',
                    'Sector': inv.equity_sector || '',
                    'Quantity': inv.equity_quantity || '',
                    'Average Price': inv.equity_avg_price || ''
                };
            }
            
            // Enhanced Bank Balance export fields
            if (inv.type === 'bankBalances') {
                return {
                    ...baseData,
                    'Account Type': inv.bank_account_type || '',
                    'As of Date': inv.bank_as_of_date ? formatDate(inv.bank_as_of_date) : '',
                    'Current Balance': inv.bank_current_balance || ''
                };
            }
            
            return baseData;
        });
        
        downloadCSV(csvData, 'investments-enhanced');
        
        console.log(`✅ Enhanced investments export completed - ${investments.length} records`);
        showToast('Enhanced investments exported successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting investments:', error);
        showToast('Error exporting investments: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportAccounts() {
    try {
        console.log('🏦 Starting secure accounts export...');
        showLoading(true);
        
        const csvData = accounts.map(acc => {
            const baseData = {
                'Account Type': acc.account_type,
                'Institution': acc.institution,
                'Account Number': acc.account_number,
                'Account Holder': acc.holder?.name || acc.holder_name || 'Unknown',
                'Account Holder Relationship': acc.holder?.relationship || 'Unknown',
                'Nominee': acc.nominee?.name || acc.nominee_name || '',
                'Nominee Relationship': acc.nominee?.relationship || '',
                'Status': acc.status || 'Active',
                'Comments': acc.comments || '',
                'Created Date': formatDate(acc.created_at)
            };
            
            // Enhanced credential export (only for authorized users)
            if (hasPasswordAccess) {
                return {
                    ...baseData,
                    'Username': acc.username || '',
                    'Password': acc.password || '',
                    'Website URL': acc.website_url || '',
                    'PIN/MPIN': acc.pin || '',
                    'Credential Status': 'Full access export'
                };
            } else {
                return {
                    ...baseData,
                    'Credential Status': 'Limited access - credentials excluded'
                };
            }
        });
        
        const filename = `accounts-${hasPasswordAccess ? 'full' : 'limited'}-access`;
        downloadCSV(csvData, filename);
        
        console.log(`✅ Secure accounts export completed - ${accounts.length} records with ${hasPasswordAccess ? 'full' : 'limited'} access`);
        showToast(
            `Accounts exported successfully! ${hasPasswordAccess ? 'Full credentials included.' : 'Limited access - credentials excluded.'}`,
            'success'
        );
        
    } catch (error) {
        console.error('❌ Error exporting accounts:', error);
        showToast('Error exporting accounts: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    return new Intl.NumberFormat('en-IN').format(Math.abs(amount));
}

function formatNumber(number) {
    if (number === null || number === undefined || isNaN(number)) return '0';
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(number);
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function maskPassword(password) {
    if (!password) return '';
    return '*'.repeat(Math.min(password.length, 8));
}

function maskAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
}

function getAccountStatusClass(status) {
    switch(status?.toLowerCase()) {
        case 'active': return 'status--success';
        case 'inactive': return 'status--warning';
        case 'closed': return 'status--error';
        case 'frozen': return 'status--info';
        default: return 'status--success';
    }
}

function getAccountStatusIcon(status) {
    switch(status?.toLowerCase()) {
        case 'active': return '✅';
        case 'inactive': return '⏸️';
        case 'closed': return '❌';
        case 'frozen': return '🧊';
        default: return '✅';
    }
}

function getAccountCategory(accountType) {
    if (accountType?.toLowerCase().includes('bank')) return 'Banking';
    if (accountType?.toLowerCase().includes('demat')) return 'Trading';
    if (accountType?.toLowerCase().includes('mutual')) return 'Investments';
    if (accountType?.toLowerCase().includes('insurance')) return 'Insurance';
    if (accountType?.toLowerCase().includes('trading')) return 'Trading';
    if (accountType?.toLowerCase().includes('ppf') || accountType?.toLowerCase().includes('epf')) return 'Retirement';
    return 'Financial';
}

function getInvestmentTypeIcon(type) {
    const icons = {
        equity: '📊',
        mutualFunds: '📈',
        fixedDeposits: '🏦',
        insurance: '🛡️',
        bankBalances: '💰',
        others: '📦'
    };
    return icons[type] || '💼';
}

function getInvestmentInvestedDate(investment, type) {
    switch(type) {
        case 'fixedDeposits':
            return investment.fd_invested_date;
        case 'insurance':
            return investment.insurance_invested_date;
        case 'bankBalances':
            return investment.bank_as_of_date;
        default:
            return null;
    }
}

// ===== ENHANCED UI FUNCTIONS =====
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showLoading(show, message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay') || createLoadingOverlay();
    const loadingText = overlay.querySelector('.loading-text');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    overlay.style.display = show ? 'flex' : 'none';
    document.body.style.overflow = show ? 'hidden' : '';
}

function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading...</div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input field
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Reset form state
    resetModalState(modalId);
}

function resetModalState(modalId) {
    // Reset editing state
    isEditMode = false;
    editingInvestmentId = null;
    editingAccountId = null;
    editingLiabilityId = null;
    editingReminderId = null;
    editingMemberId = null;
    
    // Reset forms
    switch(modalId) {
        case 'investment-modal':
            resetInvestmentForm();
            break;
        case 'account-modal':
            resetAccountForm();
            break;
        case 'liability-modal':
            resetLiabilityForm();
            break;
        case 'reminder-modal':
            resetReminderForm();
            break;
        case 'member-modal':
            resetMemberForm();
            break;
    }
}

// ===== FORM RESET FUNCTIONS =====
function resetInvestmentForm() {
    const form = document.getElementById('investment-form');
    if (form) {
        form.reset();
        
        // Hide all conditional fields
        document.querySelectorAll('.conditional-fields').forEach(field => {
            field.style.display = 'none';
        });
        
        // Reset to default values
        initializeDefaultValues();
        
        // Reset modal title
        document.getElementById('investment-modal-title').textContent = 'Add Investment';
    }
}

function resetAccountForm() {
    const form = document.getElementById('account-form');
    if (form) {
        form.reset();
        document.getElementById('account-status').value = 'Active';
        document.getElementById('account-modal-title').textContent = 'Add Account';
    }
}

function resetLiabilityForm() {
    const form = document.getElementById('liability-form');
    if (form) {
        form.reset();
        document.getElementById('liability-modal-title').textContent = 'Add Liability';
    }
}

function resetReminderForm() {
    const form = document.getElementById('reminder-form');
    if (form) {
        form.reset();
        document.getElementById('reminder-priority').value = 'medium';
        document.getElementById('recurring-options').style.display = 'none';
        document.getElementById('reminder-modal-title').textContent = 'Add Reminder';
    }
}

function resetMemberForm() {
    const form = document.getElementById('member-form');
    if (form) {
        form.reset();
        document.getElementById('current-photo').innerHTML = '👤';
        selectedPhoto = null;
        document.getElementById('member-modal-title').textContent = 'Add Family Member';
    }
}

// ===== INITIALIZATION FUNCTIONS =====
function initializeDefaultValues() {
    const today = new Date().toISOString().split('T')[0];
    
    // Set default dates for enhanced forms
    const dateFields = [
        'fd-invested-date',
        'fd-start-date', 
        'insurance-invested-date',
        'insurance-start-date',
        'bank-as-of-date',
        'reminder-date'
    ];
    
    dateFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value) {
            field.value = today;
        }
    });
    
    // Set default values for select fields
    const selectDefaults = {
        'fd-interest-payout': 'Yearly',
        'insurance-payment-frequency': 'Annual',
        'bank-account-type': 'Savings',
        'account-status': 'Active',
        'reminder-priority': 'medium'
    };
    
    Object.entries(selectDefaults).forEach(([fieldId, defaultValue]) => {
        const field = document.getElementById(fieldId);
        if (field && !field.value) {
            field.value = defaultValue;
        }
    });
}

function initializeUIComponents() {
    // Update access level UI
    updatePasswordAccessUI();
    
    // Initialize tab counts
    updateAllTabCounts();
    
    // Initialize statistics
    updateAllStatistics();
    
    // Setup responsive handlers
    handleWindowResize();
}

// ===== STATISTICAL UPDATE FUNCTIONS =====
function updateAllStatistics() {
    updateOverviewStatistics();
    updateInvestmentTypeCounts();
    updateLiabilityTypeCounts();
    updateAccountStatistics();
    updateReminderCounts();
}

function updateOverviewStatistics() {
    // Calculate family statistics
    const totalMembers = familyMembers.length;
    const totalAssets = investments.reduce((sum, inv) => sum + (inv.current_value || inv.invested_amount || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, lib) => sum + (lib.outstanding_amount || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    
    // Calculate FD statistics
    const fdInvestments = investments.filter(inv => inv.type === 'fixedDeposits');
    const totalFDValue = fdInvestments.reduce((sum, fd) => sum + (fd.current_value || fd.invested_amount || 0), 0);
    
    // Calculate Insurance statistics
    const insuranceInvestments = investments.filter(inv => inv.type === 'insurance');
    const totalInsuranceValue = insuranceInvestments.reduce((sum, ins) => sum + (ins.insurance_sum_assured || 0), 0);
    
    // Calculate portfolio performance
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const portfolioReturn = totalInvested > 0 ? ((totalAssets - totalInvested) / totalInvested * 100).toFixed(2) : '0.00';
    
    // Update UI elements
    updateStatElement('total-members-stat', totalMembers);
    updateStatElement('total-assets-stat', `₹${formatNumber(totalAssets)}`);
    updateStatElement('total-liabilities-stat', `₹${formatNumber(totalLiabilities)}`);
    updateStatElement('net-worth-stat', `₹${formatNumber(Math.abs(netWorth))}`);
    updateStatElement('fd-total-stat', `₹${formatNumber(totalFDValue)}`);
    updateStatElement('insurance-total-stat', `₹${formatNumber(totalInsuranceValue)}`);
    updateStatElement('secure-accounts-stat', accounts.length);
    updateStatElement('portfolio-performance-stat', `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn}%`);
    
    // Update counts
    updateStatElement('fd-count-stat', `${fdInvestments.length} FDs tracked`);
    updateStatElement('insurance-count-stat', `${insuranceInvestments.length} policies active`);
    
    // Update net worth color
    const netWorthElement = document.getElementById('net-worth-stat');
    if (netWorthElement) {
        netWorthElement.className = `stat-value ${netWorth >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Update performance color
    const performanceElement = document.getElementById('portfolio-performance-stat');
    if (performanceElement) {
        performanceElement.className = `stat-value ${portfolioReturn >= 0 ? 'positive' : 'negative'}`;
    }
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateInvestmentTypeCounts() {
    const typeCounts = {
        equity: 0,
        mutualFunds: 0,
        fixedDeposits: 0,
        insurance: 0,
        bankBalances: 0,
        others: 0
    };
    
    investments.forEach(inv => {
        if (typeCounts.hasOwnProperty(inv.type)) {
            typeCounts[inv.type]++;
        }
    });
    
    // Update tab counts
    Object.entries(typeCounts).forEach(([type, count]) => {
        const tabCountElement = document.getElementById(`${type === 'mutualFunds' ? 'mf' : type === 'fixedDeposits' ? 'fd' : type === 'bankBalances' ? 'bank' : type}-tab-count`);
        if (tabCountElement) {
            tabCountElement.textContent = count;
        }
    });
}

function updateLiabilityTypeCounts() {
    const typeCounts = {
        homeLoan: 0,
        personalLoan: 0,
        creditCard: 0,
        carLoan: 0,
        educationLoan: 0,
        other: 0
    };
    
    liabilities.forEach(lib => {
        if (typeCounts.hasOwnProperty(lib.type)) {
            typeCounts[lib.type]++;
        }
    });
    
    // Update tab counts
    Object.entries(typeCounts).forEach(([type, count]) => {
        const tabCountElement = document.getElementById(`${type === 'homeLoan' ? 'home-loan' : type === 'personalLoan' ? 'personal-loan' : type === 'creditCard' ? 'credit-card' : type === 'carLoan' ? 'car-loan' : type === 'educationLoan' ? 'education-loan' : 'other-liability'}-count`);
        if (tabCountElement) {
            tabCountElement.textContent = count;
        }
    });
}

function updateAccountStatistics() {
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(acc => acc.status === 'Active').length;
    const accountsWithCredentials = accounts.filter(acc => acc.username || acc.password).length;
    const membersWithAccounts = new Set(accounts.map(acc => acc.holder_id)).size;
    
    updateStatElement('total-accounts-count', totalAccounts);
    updateStatElement('active-accounts-count', activeAccounts);
    updateStatElement('secure-accounts-count', accountsWithCredentials);
    updateStatElement('members-with-accounts', membersWithAccounts);
    
    // Update account type counts
    const typeCountMap = {};
    accounts.forEach(acc => {
        typeCountMap[acc.account_type] = (typeCountMap[acc.account_type] || 0) + 1;
    });
    
    updateStatElement('all-accounts-count', totalAccounts);
    updateStatElement('bank-accounts-count', typeCountMap['Bank Account'] || 0);
    updateStatElement('demat-accounts-count', typeCountMap['Demat Account'] || 0);
    updateStatElement('insurance-accounts-count', typeCountMap['Insurance Account'] || 0);
    updateStatElement('trading-accounts-count', typeCountMap['Trading Account'] || 0);
}

function updateReminderCounts() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const pendingReminders = reminders.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        return reminderDate >= today && !r.completed;
    });
    
    const todayReminders = reminders.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        return reminderDate.toDateString() === today.toDateString() && !r.completed;
    });
    
    const overdueReminders = reminders.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        return reminderDate < today && !r.completed;
    });
    
    const completedReminders = reminders.filter(r => r.completed);
    
    const upcomingReminders = reminders.filter(r => {
        const reminderDate = new Date(r.reminder_date);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return reminderDate > today && reminderDate <= nextWeek && !r.completed;
    });
    
    updateStatElement('pending-reminders-count', pendingReminders.length);
    updateStatElement('today-reminders-count', todayReminders.length);
    updateStatElement('overdue-reminders-count', overdueReminders.length);
    updateStatElement('completed-reminders-count', completedReminders.length);
    updateStatElement('upcoming-reminders-count', upcomingReminders.length);
}

function updateAllTabCounts() {
    updateInvestmentTypeCounts();
    updateLiabilityTypeCounts();
    updateReminderCounts();
}

// ===== HELPER FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function downloadCSV(data, filename) {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let value = row[header] ?? '';
                // Escape quotes and wrap in quotes if contains comma
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function populateAllMemberSelects() {
    const selectIds = [
        'investment-member', 'liability-member', 'reminder-member',
        'account-holder', 'account-nominee'
    ];
    
    selectIds.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            const isNominee = selectId.includes('nominee');
            const isOptional = selectId.includes('reminder') || isNominee;
            
            select.innerHTML = isOptional ? 
                `<option value="">Select ${isNominee ? 'Nominee' : 'Member'} (Optional)</option>` :
                '<option value="">Select Member</option>';
            
            familyMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.name}${member.relationship ? ` (${member.relationship})` : ''}`;
                select.appendChild(option);
            });
            
            // Restore previous value if editing
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const elements = ['last-updated', 'last-updated-display'];
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = timeString;
        }
    });
}

function updateUserInformation(email) {
    const userEmailSpan = document.getElementById('user-email');
    if (userEmailSpan) {
        userEmailSpan.textContent = email;
    }
    
    const totalRecordsSpan = document.getElementById('total-records-count');
    if (totalRecordsSpan) {
        const totalRecords = familyMembers.length + investments.length + liabilities.length + accounts.length + reminders.length;
        totalRecordsSpan.textContent = totalRecords;
    }
    
    const dbStatusSpan = document.getElementById('db-status');
    if (dbStatusSpan) {
        dbStatusSpan.textContent = 'Connected';
        dbStatusSpan.className = 'status status--success';
    }
}

function updateLoginButtonState(isLoading) {
    const loginForm = document.getElementById('login-form');
    const submitButton = loginForm?.querySelector('button[type="submit"]');
    const buttonText = submitButton?.querySelector('.btn-text');
    
    if (submitButton) {
        submitButton.disabled = isLoading;
        if (buttonText) {
            buttonText.textContent = isLoading ? 'Signing In...' : 'Login to Dashboard';
        }
    }
}

// ===== NAVIGATION AND UI FUNCTIONS =====
function showSection(sectionId) {
    console.log(`🔄 Switching to section: ${sectionId}`);
    
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation state
    updateActiveNavigation(event?.target);
    
    // Load section-specific data if needed
    loadSectionData(sectionId);
}

function updateActiveNavigation(clickedElement) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'analytics-section':
            renderAnalyticsTab(currentAnalyticsTab);
            break;
        case 'reminders-section':
            renderReminderTab(currentReminderType);
            break;
        case 'investments-section':
            renderInvestmentTabContent(currentInvestmentType);
            break;
        case 'liabilities-section':
            renderLiabilityTabContent(currentLiabilityType);
            break;
        case 'accounts-section':
            renderAccounts();
            break;
        default:
            break;
    }
}

// ===== WINDOW AND RESPONSIVE HANDLERS =====
function handleWindowResize() {
    const width = window.innerWidth;
    
    // Handle mobile navigation
    if (width < 768) {
        handleMobileLayout();
    } else {
        handleDesktopLayout();
    }
    
    // Handle table responsiveness
    handleTableResponsiveness(width);
}

function handleMobileLayout() {
    // Implement mobile-specific layout changes
    const navbar = document.querySelector('.navbar-nav');
    if (navbar) {
        navbar.classList.add('mobile-nav');
    }
}

function handleDesktopLayout() {
    // Implement desktop-specific layout changes
    const navbar = document.querySelector('.navbar-nav');
    if (navbar) {
        navbar.classList.remove('mobile-nav');
    }
}

function handleTableResponsiveness(width) {
    const tables = document.querySelectorAll('.investment-table table, .family-table');
    tables.forEach(table => {
        if (width < 768) {
            table.classList.add('mobile-table');
        } else {
            table.classList.remove('mobile-table');
        }
    });
}

function handleOnlineStatus() {
    showToast('Connection restored', 'success');
    const dbStatus = document.getElementById('db-status');
    if (dbStatus) {
        dbStatus.textContent = 'Connected';
        dbStatus.className = 'status status--success';
    }
}

function handleOfflineStatus() {
    showToast('Connection lost - working offline', 'warning');
    const dbStatus = document.getElementById('db-status');
    if (dbStatus) {
        dbStatus.textContent = 'Offline';
        dbStatus.className = 'status status--warning';
    }
}

// ===== ADDITIONAL MODAL OPENING FUNCTIONS =====
function openAddInvestmentModal(type = null) {
    isEditMode = false;
    editingInvestmentId = null;
    
    resetInvestmentForm();
    populateAllMemberSelects();
    updatePasswordAccessUI();
    
    if (type) {
        document.getElementById('investment-type').value = type;
        updateInvestmentForm();
    }
    
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    showModal('investment-modal');
}

function openAddAccountModal() {
    isEditMode = false;
    editingAccountId = null;
    
    resetAccountForm();
    populateAllMemberSelects();
    updatePasswordAccessUI();
    
    document.getElementById('account-modal-title').textContent = 'Add Account';
    showModal('account-modal');
}

function openAddMemberModal() {
    isEditMode = false;
    editingMemberId = null;
    
    resetMemberForm();
    
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    showModal('member-modal');
}

function openAddLiabilityModal() {
    isEditMode = false;
    editingLiabilityId = null;
    
    resetLiabilityForm();
    populateAllMemberSelects();
    
    document.getElementById('liability-modal-title').textContent = 'Add Liability';
    showModal('liability-modal');
}

function openAddReminderModal() {
    isEditMode = false;
    editingReminderId = null;
    
    resetReminderForm();
    populateAllMemberSelects();
    
    document.getElementById('reminder-modal-title').textContent = 'Add Reminder';
    showModal('reminder-modal');
}

// ===== FORM VALIDATION LISTENERS =====
function setupFormValidationListeners() {
    // Real-time validation for PAN number
    const panField = document.getElementById('member-pan');
    if (panField) {
        panField.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (this.value && !panRegex.test(this.value)) {
                this.setCustomValidity('Please enter a valid PAN number (e.g., ABCDE1234F)');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Email validation
    const emailFields = document.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (this.value && !this.validity.valid) {
                this.setCustomValidity('Please enter a valid email address');
            } else {
                this.setCustomValidity('');
            }
        });
    });
    
    // Phone number validation
    const phoneField = document.getElementById('member-phone');
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9+\-\s()]/g, '');
            if (this.value.length > 15) {
                this.value = this.value.slice(0, 15);
            }
        });
    }
}

// ===== AUTO-CALCULATION LISTENERS =====
function setupAutoCalculationListeners() {
    // Investment amount auto-formatting
    const amountFields = document.querySelectorAll('input[type="number"]');
    amountFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (this.value) {
                const value = parseFloat(this.value);
                if (!isNaN(value)) {
                    this.value = value.toFixed(2);
                }
            }
        });
    });
    
    // Current value auto-population
    const investedAmountField = document.getElementById('investment-amount');
    const currentValueField = document.getElementById('investment-current-value');
    
    if (investedAmountField && currentValueField) {
        investedAmountField.addEventListener('change', function() {
            if (!currentValueField.value && this.value) {
                currentValueField.value = this.value;
            }
        });
    }
}

// ===== ADDITIONAL UTILITY FUNCTIONS =====
function hasUnsavedChanges() {
    // Check if any forms have been modified
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            if (value && value.trim() !== '') {
                const modal = form.closest('.modal');
                if (modal && !modal.classList.contains('hidden')) {
                    return true;
                }
            }
        }
    }
    return false;
}

function saveCurrentForm() {
    // Save the currently open form
    const openModal = document.querySelector('.modal:not(.hidden)');
    if (openModal) {
        const form = openModal.querySelector('form');
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.click();
            }
        }
    }
}

function showNewItemMenu() {
    // Show a quick menu for adding new items
    showToast('Quick Add: Use Ctrl+I for Investment, Ctrl+A for Account, Ctrl+M for Member', 'info', 3000);
}

function showExportMenu() {
    // Navigate to export section
    showSection('export-section');
}

async function refreshDashboard() {
    showToast('Refreshing dashboard data...', 'info', 2000);
    await loadCompleteDashboard();
}

// ===== REAL-TIME SUBSCRIPTIONS (IF SUPPORTED) =====
function setupRealTimeSubscriptions() {
    // Setup real-time subscriptions for data changes
    // This would be implemented if real-time features are needed
    console.log('📡 Real-time subscriptions could be setup here for live updates');
}

// ===== ERROR HANDLING AND RECOVERY =====
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);
    showToast('An unexpected error occurred. Please refresh the page if issues persist.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('A network error occurred. Please check your connection.', 'error');
    e.preventDefault();
});

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
// Authentication functions
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;

// Modal functions
window.openAddMemberModal = openAddMemberModal;
window.openAddInvestmentModal = openAddInvestmentModal;
window.openAddAccountModal = openAddAccountModal;
window.openAddLiabilityModal = openAddLiabilityModal;
window.openAddReminderModal = openAddReminderModal;
window.closeModal = closeModal;
window.showModal = showModal;

// Form functions
window.saveMember = saveMember;
window.saveInvestment = saveInvestment;
window.saveAccount = saveAccount;
window.saveLiability = saveLiability;
window.saveReminder = saveReminder;
window.updateInvestmentForm = updateInvestmentForm;

// Rendering functions
window.renderInvestmentTabContent = renderInvestmentTabContent;
window.renderAccounts = renderAccounts;
window.showSection = showSection;

// Export functions
window.exportFamilyData = exportFamilyData;
window.exportInvestments = exportInvestments;
window.exportAccounts = exportAccounts;

// Utility functions
window.refreshDashboard = refreshDashboard;
window.showToast = showToast;

console.log('✅ Enhanced Family Wealth Dashboard - Complete 2800+ lines JavaScript loaded successfully');
console.log('🔧 All enhanced features including FD tracking, Insurance management, and secure credentials are ready');

// End of Enhanced Family Investment Dashboard JavaScript Implementation
