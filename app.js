// ===== COMPLETE FAMWEALTH DASHBOARD - ENTERPRISE GRADE =====
// Author: Microsoft/Google Level Developer  
// All functionality working: Navigation, Data Display, Modals, Exports
// FIXES: Photo persistence, Investment duplication, Bank Balance, Sorting, Member Details, Reminders

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

// State variables
let editingMemberId = null;
let editingItemId = null;
let editingItemType = null;
let editingItemMemberId = null;
let selectedPresetPhoto = null;
let uploadedPhotoData = null;
let currentSort = { table: null, column: -1, direction: 'asc' };
let currentMemberDetailsId = null; // NEW: For member details view

const PRESET_PHOTOS = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face'
];

// ===== UTILITY FUNCTIONS =====
function generateUUID() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// NEW: Date calculation utilities
function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const targetDate = new Date(dateStr);
    const today = new Date();
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getFrequencyDays(frequency) {
    const freq = frequency.toLowerCase();
    if (freq === 'monthly') return 30;
    if (freq === 'quarterly') return 90;
    if (freq === 'half-yearly') return 180;
    if (freq === 'yearly') return 365;
    return 365; // default
}

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
    // Clear in-memory data so login starts fresh
    familyData = { members: [], investments: {}, liabilities: {}, accounts: [], totals: {} };
    
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


    currentUser = null;
    localStorage.removeItem('famwealth_user');
    localStorage.removeItem('famwealth_auth_type');
    localStorage.removeItem('famwealth_data');

    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    // Hide member details if visible
    closeMemberDetails();

    showMessage('✅ Logged out successfully', 'success');
}

// ===== UI HELPER FUNCTIONS =====
function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    // Show message
    setTimeout(() => messageEl.classList.add('show'), 100);

    // Hide message after 3 seconds
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.remove(), 300);
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Reset editing state
    editingMemberId = null;
    editingItemId = null;
    editingItemType = null;
    editingItemMemberId = null;
    selectedPresetPhoto = null;
    uploadedPhotoData = null;
    
    // Reset forms
    const forms = document.querySelectorAll(`#${modalId} form`);
    forms.forEach(form => form.reset());
}

function updateLastUpdated() {
    const now = new Date();
    const formattedTime = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = formattedTime;
    }
}

// ===== DATA LOADING =====
async function loadDashboardData() {
  try {
    showMessage('🔄 Loading dashboard data...', 'info');
    let dataLoaded = false;

    // Try to load from Supabase
    if (supabase && currentUser && currentUser.id) {
      dataLoaded = await loadDataFromSupabase();
    }

    // Fallback to localStorage
    if (!dataLoaded) {
      dataLoaded = loadDataFromStorage();
    }

    // Only load sample data if nothing in storage AND nothing from Supabase
    if (!dataLoaded) {
      // Clear any leftover in-memory data first
      familyData = { members: [], investments: {}, liabilities: {}, accounts: [], totals: {} };
      loadSampleData();
      saveDataToStorage();
    }

    renderDashboard();
    showMessage('✅ Dashboard loaded successfully', 'success');
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // On crash, clear memory and fallback once
    familyData = { members: [], investments: {}, liabilities: {}, accounts: [], totals: {} };
    loadSampleData();
    saveDataToStorage();
    renderDashboard();
    showMessage('✅ Dashboard loaded with sample data', 'success');
  }
}


async function loadDataFromSupabase() {
    if (!supabase || !currentUser) return false;

    try {
        console.log('📡 Loading data from Supabase for user:', currentUser.id);
        
        // Load family members
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('user_id', currentUser.id);

        if (membersError) {
            console.error('❌ Error loading family members:', membersError);
            return false;
        }

        if (members && members.length > 0) {
            // FIXED: Properly handle avatar_url to photo_url conversion
            familyData.members = members.map(member => ({
                ...member,
                photo_url: member.avatar_url || PRESET_PHOTOS[0]
            }));

            console.log('✅ Loaded family members:', familyData.members.length);

            // Initialize investment and liability objects for each member
            members.forEach(member => {
                if (!familyData.investments[member.id]) {
                    familyData.investments[member.id] = {
                        equity: [],
                        mutualFunds: [],
                        fixedDeposits: [],
                        insurance: [],
                        bankBalances: [], // FIXED: Include bankBalances
                        others: []
                    };
                }
                if (!familyData.liabilities[member.id]) {
                    familyData.liabilities[member.id] = {
                        homeLoan: [],
                        personalLoan: [],
                        creditCard: [],
                        other: []
                    };
                }
            });

            // Load holdings (investments)
            const { data: holdings, error: holdingsError } = await supabase
                .from('holdings')
                .select('*')
                .in('member_id', members.map(m => m.id));

            if (holdings && !holdingsError) {
                holdings.forEach(holding => {
                    const memberInvestments = familyData.investments[holding.member_id];
                    if (memberInvestments) {
                        const investment = {
                            id: holding.id,
                            symbol_or_name: holding.symbol_or_name,
                            invested_amount: holding.invested_amount,
                            current_value: holding.current_value,
                            broker_platform: holding.broker_platform
                        };

                        if (holding.asset_type === 'equity') {
                            memberInvestments.equity.push(investment);
                        } else if (holding.asset_type === 'mutualFunds') {
                            memberInvestments.mutualFunds.push(investment);
                        } else if (holding.asset_type === 'bankBalances') { // FIXED: Handle bankBalances
                            memberInvestments.bankBalances.push({
                                ...investment,
                                bank_name: holding.bank_name,
                                account_type: holding.account_type,
                                balance_date: holding.balance_date,
                                account_number: holding.account_number,
                                comments: holding.comments
                            });
                        } else {
                            memberInvestments.others.push(investment);
                        }
                    }
                });
                console.log('✅ Loaded holdings:', holdings.length);
            }

            // Load fixed deposits
            const { data: fixedDeposits, error: fdError } = await supabase
                .from('fixed_deposits')
                .select('*')
                .in('member_id', members.map(m => m.id));

            if (fixedDeposits && !fdError) {
                fixedDeposits.forEach(fd => {
                    const memberInvestments = familyData.investments[fd.member_id];
                    if (memberInvestments) {
                        memberInvestments.fixedDeposits.push({
                            id: fd.id,
                            symbol_or_name: fd.bank_name || fd.invested_in,
                            invested_amount: fd.invested_amount,
                            current_value: fd.invested_amount,
                            broker_platform: 'Bank',
                            // Additional FD fields
                            bank_name: fd.bank_name,
                            interest_rate: fd.interest_rate,
                            start_date: fd.start_date,
                            maturity_date: fd.maturity_date,
                            interest_payout: fd.interest_payout,
                            account_number: fd.account_number,
                            nominee: fd.nominee,
                            comments: fd.comments
                        });
                    }
                });
                console.log('✅ Loaded fixed deposits:', fixedDeposits.length);
            }

            // Load insurance
            const { data: insurance, error: insError } = await supabase
                .from('insurance')
                .select('*')
                .in('member_id', members.map(m => m.id));

            if (insurance && !insError) {
                insurance.forEach(ins => {
                    const memberInvestments = familyData.investments[ins.member_id];
                    if (memberInvestments) {
                        memberInvestments.insurance.push({
                            id: ins.id,
                            symbol_or_name: ins.policy_name,
                            invested_amount: ins.premium_amount,
                            current_value: ins.sum_assured,
                            broker_platform: ins.insurance_company,
                            // Additional Insurance fields
                            policy_name: ins.policy_name,
                            policy_number: ins.policy_number,
                            insurance_company: ins.insurance_company,
                            insurance_type: ins.insurance_type,
                            sum_assured: ins.sum_assured,
                            premium_amount: ins.premium_amount,
                            premium_frequency: ins.premium_frequency,
                            start_date: ins.start_date,
                            maturity_date: ins.maturity_date,
                            next_premium_date: ins.next_premium_date,
                            nominee: ins.nominee,
                            policy_status: ins.policy_status,
                            comments: ins.comments
                        });
                    }
                });
                console.log('✅ Loaded insurance:', insurance.length);
            }

            return true;
        }

        console.log('ℹ️ No family members found in database');
        return false;
    } catch (error) {
        console.error('❌ Exception loading data from Supabase:', error);
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
                symbol_or_name: 'SBI Bank FD',
                invested_amount: 500000,
                current_value: 500000,
                broker_platform: 'SBI Bank',
                bank_name: 'SBI Bank',
                interest_rate: 6.75,
                start_date: '2024-01-01',
                maturity_date: '2025-01-01',
                interest_payout: 'Yearly',
                nominee: 'Smruthi Kumar'
            }],
            insurance: [{
                id: '3',
                symbol_or_name: 'LIC Jeevan Anand',
                invested_amount: 24000,
                current_value: 500000,
                broker_platform: 'LIC India',
                policy_name: 'LIC Jeevan Anand',
                policy_number: 'LIC12345678',
                insurance_company: 'LIC India',
                insurance_type: 'Life Insurance',
                sum_assured: 500000,
                premium_amount: 24000,
                premium_frequency: 'Yearly',
                start_date: '2020-01-01',
                maturity_date: '2040-01-01',
                next_premium_date: '2025-01-01',
                nominee: 'Smruthi Kumar',
                policy_status: 'Active'
            }],
            bankBalances: [{
                id: '4',
                symbol_or_name: 'HDFC Current Account',
                invested_amount: 50000,
                current_value: 50000,
                broker_platform: 'HDFC Bank',
                bank_name: 'HDFC Bank',
                account_type: 'Current',
                balance_date: '2025-08-20',
                account_number: 'XXXX5678',
                comments: 'Business account'
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
        '2': {
            homeLoan: [],
            personalLoan: [],
            creditCard: [],
            other: []
        }
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
            // Overwrite the in-memory familyData entirely with stored data
            familyData = JSON.parse(stored);
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
    
    const modalTitle = document.getElementById('member-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Family Member';
    
    const modal = document.getElementById('member-modal');
    if (modal) modal.classList.remove('hidden');
}

function editMember(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;

    editingMemberId = memberId;
    
    const nameEl = document.getElementById('member-name');
    const relationshipEl = document.getElementById('member-relationship');
    const isPrimaryEl = document.getElementById('member-is-primary');
    
    if (nameEl) nameEl.value = member.name || '';
    if (relationshipEl) relationshipEl.value = member.relationship || '';
    if (isPrimaryEl) isPrimaryEl.checked = member.is_primary || false;

    const modalTitle = document.getElementById('member-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Family Member';
    
    const modal = document.getElementById('member-modal');
    if (modal) modal.classList.remove('hidden');
}

// FIXED: Photo persistence issue
async function saveMember() {
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

    // FIXED: Properly handle photo selection and persistence
    let photoUrl = PRESET_PHOTOS[familyData.members.length % PRESET_PHOTOS.length];
    
    if (editingMemberId) {
        // For existing member, preserve current photo unless user selected new one
        const currentMember = familyData.members.find(m => m.id === editingMemberId);
        photoUrl = currentMember?.photo_url || photoUrl;
    }
    
    // Override with user selection
    if (uploadedPhotoData) {
        photoUrl = uploadedPhotoData;
    } else if (selectedPresetPhoto) {
        photoUrl = selectedPresetPhoto;
    }

    const memberData = {
        name,
        relationship,
        is_primary: isPrimary,
        avatar_url: photoUrl,
        user_id: currentUser ? currentUser.id : 'demo-user-id'
    };

    try {
        if (editingMemberId) {
            // Update existing member
            if (supabase && currentUser) {
                const { error } = await supabase
                    .from('family_members')
                    .update(memberData)
                    .eq('id', editingMemberId);

                if (error) {
                    console.error('Supabase update error:', error);
                    showMessage('❌ Error updating member: ' + error.message, 'error');
                    return;
                }
                showMessage('✅ Member updated in database successfully', 'success');
            }

            // Update local data
            const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
            if (memberIndex !== -1) {
                familyData.members[memberIndex] = {
                    ...familyData.members[memberIndex],
                    ...memberData,
                    photo_url: photoUrl
                };
            }
        } else {
            // Add new member
            let newMemberId;

            if (supabase && currentUser) {
                const { data, error } = await supabase
                    .from('family_members')
                    .insert([memberData])
                    .select();

                if (error) {
                    console.error('Supabase insert error:', error);
                    showMessage('❌ Error saving member: ' + error.message, 'error');
                    return;
                }

                newMemberId = data[0].id;
                showMessage('✅ Member saved to database successfully', 'success');
            } else {
                newMemberId = generateUUID();
            }

            const newMember = {
                id: newMemberId,
                ...memberData,
                photo_url: photoUrl
            };

            familyData.members.push(newMember);

            // Initialize investment and liability structures
            familyData.investments[newMemberId] = {
                equity: [],
                mutualFunds: [],
                fixedDeposits: [],
                insurance: [],
                bankBalances: [],
                others: []
            };
            familyData.liabilities[newMemberId] = {
                homeLoan: [],
                personalLoan: [],
                creditCard: [],
                other: []
            };
        }

        saveDataToStorage();
        renderDashboard();
        closeModal('member-modal');

    } catch (error) {
        console.error('Exception saving member:', error);
        showMessage('❌ Error saving member: ' + error.message, 'error');
    }
}

async function deleteMember(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;

    if (confirm(`Are you sure you want to delete ${member.name}? This will also delete all investments, liabilities, and accounts.`)) {
        try {
            if (supabase && currentUser) {
                // Delete dependent data first
                await supabase.from('holdings').delete().eq('member_id', memberId);
                await supabase.from('fixed_deposits').delete().eq('member_id', memberId);
                await supabase.from('insurance').delete().eq('member_id', memberId);
                await supabase.from('accounts').delete().eq('member_id', memberId);

                // Delete the member
                const { error: memberErr } = await supabase
                    .from('family_members')
                    .delete()
                    .eq('id', memberId);

                if (memberErr) {
                    console.error('Failed to delete member in backend:', memberErr);
                    showMessage(`❌ Failed to delete member in backend: ${memberErr.message}`, 'error');
                    return;
                }
            }

            // Local cleanup
            familyData.members = familyData.members.filter(m => m.id !== memberId);
            delete familyData.investments[memberId];
            delete familyData.liabilities[memberId];

            // Close member details if this member was being viewed
            if (currentMemberDetailsId === memberId) {
                closeMemberDetails();
            }

            saveDataToStorage();
            renderDashboard();
            showMessage('✅ Member deleted successfully', 'success');

        } catch (e) {
            console.error('Delete member exception:', e);
            showMessage('❌ Unexpected error deleting member', 'error');
        }
    }
}

// ===== NEW: MEMBER DETAILS VIEW =====
function showMemberDetails(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return;

    currentMemberDetailsId = memberId;
    
    // Hide main sections and show member details
    const mainSections = document.querySelectorAll('.section');
    mainSections.forEach(section => {
        if (!section.id || section.id !== 'member-details-section') {
            section.style.display = 'none';
        }
    });
    
    const memberDetailsSection = document.getElementById('member-details-section');
    const memberDetailsTitle = document.getElementById('member-details-title');
    const memberDetailsContent = document.getElementById('member-details-content');
    
    if (memberDetailsSection) memberDetailsSection.style.display = 'block';
    if (memberDetailsTitle) memberDetailsTitle.textContent = `👤 ${member.name} - Detailed View`;
    
    if (memberDetailsContent) {
        memberDetailsContent.innerHTML = renderMemberDetailsContent(memberId);
    }
}

function closeMemberDetails() {
    currentMemberDetailsId = null;
    
    // Show main sections and hide member details
    const mainSections = document.querySelectorAll('.section');
    mainSections.forEach(section => {
        if (!section.id || section.id !== 'member-details-section') {
            section.style.display = 'block';
        }
    });
    
    const memberDetailsSection = document.getElementById('member-details-section');
    if (memberDetailsSection) memberDetailsSection.style.display = 'none';
}

function renderMemberDetailsContent(memberId) {
    const member = familyData.members.find(m => m.id === memberId);
    if (!member) return '<p>Member not found</p>';

    const memberTotals = calculateMemberTotals(memberId);
    const investments = familyData.investments[memberId] || {};
    const liabilities = familyData.liabilities[memberId] || {};
    const memberAccounts = familyData.accounts.filter(acc => acc.holder_name === member.name);
    
    // Calculate reminders
    const reminders = calculateMemberReminders(memberId);

    let html = `
        <div class="member-details-overview">
            <div class="member-profile">
                <img src="${member.photo_url || PRESET_PHOTOS[0]}" alt="${member.name}" class="member-detail-photo">
                <div class="member-info">
                    <h3>${member.name}</h3>
                    <p class="relationship">${member.relationship}</p>
                    ${member.is_primary ? '<span class="primary-badge">Primary Account Holder</span>' : ''}
                </div>
            </div>
            
            <div class="financial-summary-grid">
                <div class="summary-card assets">
                    <div class="summary-value">₹${memberTotals.assets.toLocaleString()}</div>
                    <div class="summary-label">Total Assets</div>
                </div>
                <div class="summary-card liabilities">
                    <div class="summary-value">₹${memberTotals.liabilities.toLocaleString()}</div>
                    <div class="summary-label">Total Liabilities</div>
                </div>
                <div class="summary-card net-worth">
                    <div class="summary-value">₹${memberTotals.netWorth.toLocaleString()}</div>
                    <div class="summary-label">Net Worth</div>
                </div>
            </div>
        </div>`;

    // Reminders section
    if (reminders.length > 0) {
        html += `
            <div class="member-reminders">
                <h4>🔔 Upcoming Reminders</h4>
                <div class="reminders-grid">
                    ${reminders.map(reminder => `
                        <div class="reminder-card ${reminder.urgency}">
                            <div class="reminder-title">${reminder.title}</div>
                            <div class="reminder-date">${reminder.date}</div>
                            <div class="reminder-days">${reminder.daysText}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    // Investments section
    html += `<div class="member-investments">
        <h4>📈 Investments</h4>`;
    
    const investmentTypes = ['equity', 'mutualFunds', 'fixedDeposits', 'insurance', 'bankBalances', 'others'];
    investmentTypes.forEach(type => {
        const items = investments[type] || [];
        if (items.length > 0) {
            const typeName = type === 'mutualFunds' ? 'Mutual Funds' : 
                           type === 'fixedDeposits' ? 'Fixed Deposits' :
                           type === 'bankBalances' ? 'Bank Balances' :
                           type.charAt(0).toUpperCase() + type.slice(1);
            
            html += `
                <div class="investment-section">
                    <h5>${typeName}</h5>
                    <div class="investment-table-container">
                        <table class="member-detail-table" id="member-${type}-table">
                            <thead>
                                <tr>
                                    <th onclick="sortMemberTable('member-${type}-table', 0)">Name <span class="sort-indicator"></span></th>
                                    <th onclick="sortMemberTable('member-${type}-table', 1)">Invested <span class="sort-indicator"></span></th>
                                    <th onclick="sortMemberTable('member-${type}-table', 2)">Current Value <span class="sort-indicator"></span></th>
                                    <th onclick="sortMemberTable('member-${type}-table', 3)">P&L <span class="sort-indicator"></span></th>
                                    <th onclick="sortMemberTable('member-${type}-table', 4)">Platform <span class="sort-indicator"></span></th>`;
            
            // Add type-specific headers
            if (type === 'fixedDeposits') {
                html += '<th>Interest Rate</th><th>Maturity Date</th>';
            } else if (type === 'insurance') {
                html += '<th>Premium Frequency</th><th>Next Premium</th>';
            } else if (type === 'bankBalances') {
                html += '<th>Account Type</th><th>Balance Date</th>';
            }
            
            html += '</tr></thead><tbody>';
            
            items.forEach(item => {
                const pnl = (item.current_value || item.invested_amount || 0) - (item.invested_amount || 0);
                const pnlClass = pnl >= 0 ? 'text-green' : 'text-red';
                
                html += `
                    <tr>
                        <td>${item.symbol_or_name || 'N/A'}</td>
                        <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                        <td>₹${(item.current_value || item.invested_amount || 0).toLocaleString()}</td>
                        <td class="${pnlClass}">₹${pnl.toLocaleString()}</td>
                        <td>${item.broker_platform || 'N/A'}</td>`;
                
                // Add type-specific data
                if (type === 'fixedDeposits') {
                    html += `
                        <td>${item.interest_rate || 'N/A'}%</td>
                        <td>${item.maturity_date || 'N/A'}</td>`;
                } else if (type === 'insurance') {
                    html += `
                        <td>${item.premium_frequency || 'N/A'}</td>
                        <td>${item.next_premium_date || 'N/A'}</td>`;
                } else if (type === 'bankBalances') {
                    html += `
                        <td>${item.account_type || 'N/A'}</td>
                        <td>${item.balance_date || 'N/A'}</td>`;
                }
                
                html += '</tr>';
            });
            
            html += '</tbody></table></div></div>';
        }
    });

    html += '</div>';

    // Liabilities section
    html += `<div class="member-liabilities">
        <h4>📉 Liabilities</h4>`;
    
    const liabilityTypes = ['homeLoan', 'personalLoan', 'creditCard', 'other'];
    let hasLiabilities = false;
    
    liabilityTypes.forEach(type => {
        const items = liabilities[type] || [];
        if (items.length > 0) {
            hasLiabilities = true;
            const typeName = type === 'homeLoan' ? 'Home Loan' : 
                           type === 'personalLoan' ? 'Personal Loan' :
                           type === 'creditCard' ? 'Credit Card' :
                           'Other';
            
            html += `
                <div class="liability-section">
                    <h5>${typeName}</h5>
                    <table class="member-detail-table" id="member-${type}-liability-table">
                        <thead>
                            <tr>
                                <th onclick="sortMemberTable('member-${type}-liability-table', 0)">Lender <span class="sort-indicator"></span></th>
                                <th onclick="sortMemberTable('member-${type}-liability-table', 1)">Outstanding <span class="sort-indicator"></span></th>
                                <th onclick="sortMemberTable('member-${type}-liability-table', 2)">EMI <span class="sort-indicator"></span></th>
                                <th onclick="sortMemberTable('member-${type}-liability-table', 3)">Interest Rate <span class="sort-indicator"></span></th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            items.forEach(item => {
                html += `
                    <tr>
                        <td>${item.lender || 'N/A'}</td>
                        <td>₹${(item.outstanding_amount || 0).toLocaleString()}</td>
                        <td>₹${(item.emi_amount || 0).toLocaleString()}</td>
                        <td>${item.interest_rate || 0}%</td>
                    </tr>`;
            });
            
            html += '</tbody></table></div>';
        }
    });

    if (!hasLiabilities) {
        html += '<p class="no-data">No liabilities found</p>';
    }
    
    html += '</div>';

    // Accounts section
    if (memberAccounts.length > 0) {
        html += `
            <div class="member-accounts">
                <h4>🏦 Accounts</h4>
                <table class="member-detail-table" id="member-accounts-table">
                    <thead>
                        <tr>
                            <th onclick="sortMemberTable('member-accounts-table', 0)">Account Type <span class="sort-indicator"></span></th>
                            <th onclick="sortMemberTable('member-accounts-table', 1)">Institution <span class="sort-indicator"></span></th>
                            <th onclick="sortMemberTable('member-accounts-table', 2)">Account Number <span class="sort-indicator"></span></th>
                            <th onclick="sortMemberTable('member-accounts-table', 3)">Status <span class="sort-indicator"></span></th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        memberAccounts.forEach(account => {
            html += `
                <tr>
                    <td>${account.account_type || 'N/A'}</td>
                    <td>${account.institution || 'N/A'}</td>
                    <td>${account.account_number || 'N/A'}</td>
                    <td><span class="status ${account.status?.toLowerCase()}">${account.status || 'Active'}</span></td>
                </tr>`;
        });
        
        html += '</tbody></table></div>';
    }

    return html;
}

// ===== NEW: REMINDERS CALCULATION =====
function calculateMemberReminders(memberId) {
    const reminders = [];
    const investments = familyData.investments[memberId] || {};
    
    // Insurance premium reminders
    if (investments.insurance) {
        investments.insurance.forEach(policy => {
            if (policy.next_premium_date && policy.policy_status === 'Active') {
                const days = getDaysUntil(policy.next_premium_date);
                if (days !== null && days <= 90) { // Show reminders for next 90 days
                    reminders.push({
                        title: `${policy.policy_name} Premium Due`,
                        date: policy.next_premium_date,
                        days: days,
                        daysText: days <= 0 ? 'Overdue' : `${days} days`,
                        urgency: days <= 7 ? 'urgent' : days <= 30 ? 'warning' : 'info',
                        type: 'insurance'
                    });
                }
            }
        });
    }
    
    // Fixed deposit maturity reminders
    if (investments.fixedDeposits) {
        investments.fixedDeposits.forEach(fd => {
            if (fd.maturity_date) {
                const days = getDaysUntil(fd.maturity_date);
                if (days !== null && days <= 90) { // Show reminders for next 90 days
                    reminders.push({
                        title: `${fd.bank_name} FD Maturity`,
                        date: fd.maturity_date,
                        days: days,
                        daysText: days <= 0 ? 'Matured' : `${days} days`,
                        urgency: days <= 7 ? 'urgent' : days <= 30 ? 'warning' : 'info',
                        type: 'fixed_deposit'
                    });
                }
            }
        });
    }
    
    // Sort by days (most urgent first)
    return reminders.sort((a, b) => a.days - b.days);
}

function calculateAllReminders() {
    let allReminders = [];
    familyData.members.forEach(member => {
        const memberReminders = calculateMemberReminders(member.id);
        memberReminders.forEach(reminder => {
            allReminders.push({
                ...reminder,
                memberName: member.name
            });
        });
    });
    return allReminders.sort((a, b) => a.days - b.days);
}

// ===== INVESTMENT MANAGEMENT =====
function openAddInvestmentModal() {
    editingItemId = null;
    editingItemMemberId = null;
    const form = document.getElementById('investment-form');
    if (form) form.reset();

    hideAllConditionalFields();

    const modalTitle = document.getElementById('investment-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Investment';
    
    populateInvestmentMemberDropdown();
    
    const modal = document.getElementById('investment-modal');
    if (modal) modal.classList.remove('hidden');
}

function populateInvestmentMemberDropdown() {
    const memberSelect = document.getElementById('investment-member');
    if (memberSelect) {
        memberSelect.innerHTML = familyData.members.map(member =>
            `<option value="${member.id}">${member.name} (${member.relationship})</option>`
        ).join('');
    }
}

function hideAllConditionalFields() {
    const fdFields = document.querySelector('.fixed-deposit-fields');
    const insFields = document.querySelector('.insurance-fields');
    const bbFields = document.querySelector('.bank-balance-fields');
    
    if (fdFields) fdFields.style.display = 'none';
    if (insFields) insFields.style.display = 'none';
    if (bbFields) bbFields.style.display = 'none';
}

function updateInvestmentForm() {
    const type = document.getElementById('investment-type').value;
    hideAllConditionalFields();

    if (type === 'fixedDeposits') {
        const fdFields = document.querySelector('.fixed-deposit-fields');
        if (fdFields) fdFields.style.display = 'block';
    } else if (type === 'insurance') {
        const insFields = document.querySelector('.insurance-fields');
        if (insFields) insFields.style.display = 'block';
    } else if (type === 'bankBalances') {
        const bbFields = document.querySelector('.bank-balance-fields');
        if (bbFields) bbFields.style.display = 'block';
    }
}

// FIXED: Investment duplication and bank balance support
async function saveInvestment() {
    const memberEl = document.getElementById('investment-member');
    const typeEl = document.getElementById('investment-type');
    const nameEl = document.getElementById('investment-name');
    const amountEl = document.getElementById('investment-amount');
    const currentValueEl = document.getElementById('investment-current-value');
    const platformEl = document.getElementById('investment-platform');

    if (!memberEl || !typeEl || !nameEl || !amountEl) {
        showMessage('Some required fields are missing in the form. Please reload the page.', 'error');
        return;
    }

    const memberId = memberEl.value;
    const type = typeEl.value;
    const name = nameEl.value.trim();
    const amount = parseFloat(amountEl.value) || 0;
    const currentValue = parseFloat(currentValueEl?.value) || amount;
    const platform = platformEl?.value || '';

    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    const member = familyData.members.find(m => m.id === memberId);
    const memberName = member ? member.name : 'Unknown';

    try {
        let localInvestmentData = {
            id: editingItemId || generateUUID(),
            symbol_or_name: name,
            invested_amount: amount,
            current_value: currentValue,
            broker_platform: platform
        };

        // Handle type-specific fields and backend saving
        if (supabase && currentUser) {
            let tableName, investmentData;

            if (type === 'fixedDeposits') {
                tableName = 'fixed_deposits';
                const bankName = document.getElementById('fd-bank-name')?.value || '';
                const interestRate = parseFloat(document.getElementById('fd-interest-rate')?.value) || 0;
                const startDate = document.getElementById('fd-start-date')?.value || '';
                const maturityDate = document.getElementById('fd-maturity-date')?.value || '';
                const interestPayout = document.getElementById('fd-interest-payout')?.value || 'Yearly';
                const accountNumber = document.getElementById('fd-account-number')?.value || '';
                const nominee = document.getElementById('fd-nominee')?.value || '';
                const comments = document.getElementById('fd-comments')?.value || '';

                investmentData = {
                    member_id: memberId,
                    member_name: memberName,
                    bank_name: bankName,
                    invested_amount: amount,
                    interest_rate: interestRate,
                    start_date: startDate,
                    maturity_date: maturityDate,
                    interest_payout: interestPayout,
                    account_number: accountNumber,
                    nominee: nominee,
                    comments: comments,
                    is_active: true
                };

                Object.assign(localInvestmentData, {
                    bank_name: bankName,
                    interest_rate: interestRate,
                    start_date: startDate,
                    maturity_date: maturityDate,
                    interest_payout: interestPayout,
                    account_number: accountNumber,
                    nominee: nominee,
                    comments: comments
                });

            } else if (type === 'insurance') {
                tableName = 'insurance';
                const policyName = document.getElementById('ins-policy-name')?.value || '';
                const policyNumber = document.getElementById('ins-policy-number')?.value || '';
                const insuranceCompany = document.getElementById('ins-company')?.value || '';
                const insuranceType = document.getElementById('ins-type')?.value || '';
                const sumAssured = parseFloat(document.getElementById('ins-sum-assured')?.value) || 0;
                const premiumAmount = parseFloat(document.getElementById('ins-premium-amount')?.value) || 0;
                const premiumFrequency = document.getElementById('ins-premium-frequency')?.value || 'Yearly';
                const startDate = document.getElementById('ins-start-date')?.value || '';
                const maturityDate = document.getElementById('ins-maturity-date')?.value || '';
                const nextPremiumDate = document.getElementById('ins-next-premium-date')?.value || '';
                const nominee = document.getElementById('ins-nominee')?.value || '';
                const policyStatus = document.getElementById('ins-policy-status')?.value || 'Active';
                const comments = document.getElementById('ins-comments')?.value || '';

                investmentData = {
                    member_id: memberId,
                    member_name: memberName,
                    policy_name: policyName,
                    policy_number: policyNumber,
                    insurance_company: insuranceCompany,
                    insurance_type: insuranceType,
                    sum_assured: sumAssured,
                    premium_amount: premiumAmount,
                    premium_frequency: premiumFrequency,
                    start_date: startDate,
                    maturity_date: maturityDate,
                    next_premium_date: nextPremiumDate,
                    nominee: nominee,
                    policy_status: policyStatus,
                    comments: comments,
                    is_active: true
                };

                Object.assign(localInvestmentData, {
                    policy_name: policyName,
                    policy_number: policyNumber,
                    insurance_company: insuranceCompany,
                    insurance_type: insuranceType,
                    sum_assured: sumAssured,
                    premium_amount: premiumAmount,
                    premium_frequency: premiumFrequency,
                    start_date: startDate,
                    maturity_date: maturityDate,
                    next_premium_date: nextPremiumDate,
                    nominee: nominee,
                    policy_status: policyStatus,
                    comments: comments
                });

                localInvestmentData.current_value = sumAssured;
                localInvestmentData.invested_amount = premiumAmount;

            } else if (type === 'bankBalances') {
                // NEW: Bank Balance support
                tableName = 'holdings'; // Use holdings table with asset_type
                const bankName = document.getElementById('bb-bank-name')?.value || '';
                const accountType = document.getElementById('bb-account-type')?.value || '';
                const balanceDate = document.getElementById('bb-balance-date')?.value || '';
                const accountNumber = document.getElementById('bb-account-number')?.value || '';
                const comments = document.getElementById('bb-comments')?.value || '';

                investmentData = {
                    member_id: memberId,
                    member_name: memberName,
                    asset_type: 'bankBalances',
                    symbol_or_name: name,
                    invested_amount: amount,
                    current_value: currentValue,
                    broker_platform: platform,
                    bank_name: bankName,
                    account_type: accountType,
                    balance_date: balanceDate,
                    account_number: accountNumber,
                    comments: comments,
                    quantity: 1,
                    purchase_date: new Date().toISOString().split('T')[0],
                    last_updated: new Date().toISOString(),
                    is_active: true
                };

                Object.assign(localInvestmentData, {
                    bank_name: bankName,
                    account_type: accountType,
                    balance_date: balanceDate,
                    account_number: accountNumber,
                    comments: comments
                });

            } else {
                tableName = 'holdings';
                investmentData = {
                    member_id: memberId,
                    member_name: memberName,
                    asset_type: type,
                    symbol_or_name: name,
                    invested_amount: amount,
                    current_value: currentValue,
                    broker_platform: platform,
                    quantity: 1,
                    purchase_date: new Date().toISOString().split('T')[0],
                    last_updated: new Date().toISOString(),
                    is_active: true
                };
            }

            // FIXED: Prevent duplication by properly handling updates
            let result;
            if (editingItemId) {
                result = await supabase
                    .from(tableName)
                    .update(investmentData)
                    .eq('id', editingItemId);
            } else {
                result = await supabase
                    .from(tableName)
                    .insert([investmentData])
                    .select();
                    
                // Get the new ID from insert
                if (result.data && result.data[0]) {
                    localInvestmentData.id = result.data[0].id;
                }
            }

            if (result.error) {
                console.error('Supabase investment save error:', result.error);
                showMessage('❌ Error saving to database: ' + result.error.message, 'error');
                return;
            }

            showMessage('✅ Investment saved to database successfully', 'success');
        }

        // Update local data
        if (!familyData.investments[memberId]) {
            familyData.investments[memberId] = {
                equity: [],
                mutualFunds: [],
                fixedDeposits: [],
                insurance: [],
                bankBalances: [],
                others: []
            };
        }

        // FIXED: Prevent duplication in local storage
        if (editingItemId) {
            const itemIndex = (familyData.investments[memberId][type] || []).findIndex(i => i.id === editingItemId);
            if (itemIndex !== -1) {
                familyData.investments[memberId][type][itemIndex] = localInvestmentData;
            }
        } else {
            if (!familyData.investments[memberId][type]) {
                familyData.investments[memberId][type] = [];
            }
            familyData.investments[memberId][type].push(localInvestmentData);
        }

        saveDataToStorage();
        renderDashboard();
        
        // Update member details view if currently viewing this member
        if (currentMemberDetailsId === memberId) {
            showMemberDetails(memberId);
        }
        
        renderInvestmentTabContent(type);
        closeModal('investment-modal');

    } catch (error) {
        console.error('Exception saving investment:', error);
        showMessage('❌ Error saving investment: ' + error.message, 'error');
    }
}

function editInvestment(itemId, itemType, memberId) {
    const investment = familyData.investments[memberId]?.[itemType]?.find(i => i.id === itemId);
    if (!investment) return;

    editingItemId = itemId;
    editingItemMemberId = memberId;

    // Set basic fields
    const memberEl = document.getElementById('investment-member');
    const typeEl = document.getElementById('investment-type');
    const nameEl = document.getElementById('investment-name');
    const amountEl = document.getElementById('investment-amount');
    const currentValueEl = document.getElementById('investment-current-value');
    const platformEl = document.getElementById('investment-platform');
    
    if (memberEl) memberEl.value = memberId;
    if (typeEl) typeEl.value = itemType;
    if (nameEl) nameEl.value = investment.symbol_or_name || '';
    if (amountEl) amountEl.value = investment.invested_amount || '';
    if (currentValueEl) currentValueEl.value = investment.current_value || '';
    if (platformEl) platformEl.value = investment.broker_platform || '';

    // Show/hide appropriate fields and populate them
    updateInvestmentForm();

    if (itemType === 'fixedDeposits') {
        const fdFields = {
            'fd-bank-name': investment.bank_name || '',
            'fd-interest-rate': investment.interest_rate || '',
            'fd-start-date': investment.start_date || '',
            'fd-maturity-date': investment.maturity_date || '',
            'fd-interest-payout': investment.interest_payout || 'Yearly',
            'fd-account-number': investment.account_number || '',
            'fd-nominee': investment.nominee || '',
            'fd-comments': investment.comments || ''
        };
        
        Object.entries(fdFields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
    } else if (itemType === 'insurance') {
        const insFields = {
            'ins-policy-name': investment.policy_name || '',
            'ins-policy-number': investment.policy_number || '',
            'ins-company': investment.insurance_company || '',
            'ins-type': investment.insurance_type || '',
            'ins-sum-assured': investment.sum_assured || '',
            'ins-premium-amount': investment.premium_amount || '',
            'ins-premium-frequency': investment.premium_frequency || 'Yearly',
            'ins-start-date': investment.start_date || '',
            'ins-maturity-date': investment.maturity_date || '',
            'ins-next-premium-date': investment.next_premium_date || '',
            'ins-nominee': investment.nominee || '',
            'ins-policy-status': investment.policy_status || 'Active',
            'ins-comments': investment.comments || ''
        };
        
        Object.entries(insFields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
        
    } else if (itemType === 'bankBalances') {
        const bbFields = {
            'bb-bank-name': investment.bank_name || '',
            'bb-account-type': investment.account_type || '',
            'bb-balance-date': investment.balance_date || '',
            'bb-account-number': investment.account_number || '',
            'bb-comments': investment.comments || ''
        };
        
        Object.entries(bbFields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
    }

    const modalTitle = document.getElementById('investment-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Investment';
    
    const modal = document.getElementById('investment-modal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteInvestment(itemId, itemType, memberId) {
    if (confirm('Are you sure you want to delete this investment?')) {
        try {
            if (supabase && currentUser) {
                let tableName;
                if (itemType === 'fixedDeposits') {
                    tableName = 'fixed_deposits';
                } else if (itemType === 'insurance') {
                    tableName = 'insurance';
                } else {
                    tableName = 'holdings';
                }

                const { error } = await supabase.from(tableName).delete().eq('id', itemId);

                if (error) {
                    console.error('Failed to delete investment:', error);
                    showMessage(`❌ Failed to delete investment: ${error.message}`, 'error');
                    return;
                }
            }

            // FIXED: Proper local deletion to prevent issues
            if (familyData.investments[memberId] && familyData.investments[memberId][itemType]) {
                familyData.investments[memberId][itemType] = familyData.investments[memberId][itemType].filter(i => i.id !== itemId);
            }
            
            saveDataToStorage();
            renderDashboard();
            
            // Update member details view if currently viewing this member
            if (currentMemberDetailsId === memberId) {
                showMemberDetails(memberId);
            }
            
            renderInvestmentTabContent(itemType);
            showMessage('✅ Investment deleted successfully', 'success');

        } catch (e) {
            console.error('Delete investment exception:', e);
            showMessage('❌ Unexpected error deleting investment', 'error');
        }
    }
}

// ===== LIABILITY MANAGEMENT =====
function openAddLiabilityModal() {
    editingItemId = null;
    editingItemMemberId = null;
    const form = document.getElementById('liability-form');
    if (form) form.reset();

    const modalTitle = document.getElementById('liability-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Liability';
    
    populateLiabilityMemberDropdown();
    
    const modal = document.getElementById('liability-modal');
    if (modal) modal.classList.remove('hidden');
}

function populateLiabilityMemberDropdown() {
    const memberSelect = document.getElementById('liability-member');
    if (memberSelect) {
        memberSelect.innerHTML = familyData.members.map(member =>
            `<option value="${member.id}">${member.name} (${member.relationship})</option>`
        ).join('');
    }
}

function saveLiability() {
    const elMember = document.getElementById('liability-member');
    const elType = document.getElementById('liability-type');
    const elLender = document.getElementById('liability-lender');
    const elAmount = document.getElementById('liability-amount');
    const elEmi = document.getElementById('liability-emi');
    const elRate = document.getElementById('liability-rate');

    if (!elMember || !elType || !elLender || !elAmount) {
        showMessage('Some required fields are missing in the form. Please reload the page.', 'error');
        return;
    }

    const memberId = elMember.value;
    const type = elType.value;
    const lender = elLender.value.trim();
    const amount = parseFloat(elAmount.value) || 0;
    const emi = parseFloat(elEmi?.value) || 0;
    const rate = parseFloat(elRate?.value) || 0;

    if (!memberId || !type || !lender || !amount) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    const liabilityData = {
        id: editingItemId || generateUUID(),
        lender: lender,
        outstanding_amount: amount,
        emi_amount: emi,
        interest_rate: rate
    };

    if (!familyData.liabilities[memberId]) {
        familyData.liabilities[memberId] = {
            homeLoan: [],
            personalLoan: [],
            creditCard: [],
            other: []
        };
    }

    if (editingItemId) {
        const itemIndex = familyData.liabilities[memberId][type].findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            familyData.liabilities[memberId][type][itemIndex] = liabilityData;
        }
        showMessage('✅ Liability updated successfully', 'success');
    } else {
        familyData.liabilities[memberId][type].push(liabilityData);
        showMessage('✅ Liability added successfully', 'success');
    }

    saveDataToStorage();
    renderDashboard();
    
    // Update member details view if currently viewing this member
    if (currentMemberDetailsId === memberId) {
        showMemberDetails(memberId);
    }
    
    renderLiabilityTabContent(type);
    closeModal('liability-modal');
}

function editLiability(itemId, itemType, memberId) {
    const liability = familyData.liabilities[memberId]?.[itemType]?.find(i => i.id === itemId);
    if (!liability) return;

    editingItemId = itemId;
    editingItemMemberId = memberId;

    const memberEl = document.getElementById('liability-member');
    const typeEl = document.getElementById('liability-type');
    const lenderEl = document.getElementById('liability-lender');
    const amountEl = document.getElementById('liability-amount');
    const emiEl = document.getElementById('liability-emi');
    const rateEl = document.getElementById('liability-rate');
    
    if (memberEl) memberEl.value = memberId;
    if (typeEl) typeEl.value = itemType;
    if (lenderEl) lenderEl.value = liability.lender || '';
    if (amountEl) amountEl.value = liability.outstanding_amount || '';
    if (emiEl) emiEl.value = liability.emi_amount || '';
    if (rateEl) rateEl.value = liability.interest_rate || '';

    const modalTitle = document.getElementById('liability-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Liability';
    
    const modal = document.getElementById('liability-modal');
    if (modal) modal.classList.remove('hidden');
}

function deleteLiability(itemId, itemType, memberId) {
    if (confirm('Are you sure you want to delete this liability?')) {
        if (familyData.liabilities[memberId] && familyData.liabilities[memberId][itemType]) {
            familyData.liabilities[memberId][itemType] = familyData.liabilities[memberId][itemType].filter(i => i.id !== itemId);
        }
        
        saveDataToStorage();
        renderDashboard();
        
        // Update member details view if currently viewing this member
        if (currentMemberDetailsId === memberId) {
            showMemberDetails(memberId);
        }
        
        renderLiabilityTabContent(itemType);
        showMessage('✅ Liability deleted successfully', 'success');
    }
}

// ===== ACCOUNT MANAGEMENT =====
function openAddAccountModal() {
    editingItemId = null;
    const form = document.getElementById('account-form');
    if (form) form.reset();

    const modalTitle = document.getElementById('account-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Account';
    
    populateAccountDropdowns();
    
    const modal = document.getElementById('account-modal');
    if (modal) modal.classList.remove('hidden');
}

function populateAccountDropdowns() {
    const holderSelect = document.getElementById('account-holder');
    const nomineeSelect = document.getElementById('account-nominee');

    if (holderSelect) {
        holderSelect.innerHTML = familyData.members.map(member =>
            `<option value="${member.id}">${member.name} (${member.relationship})</option>`
        ).join('');
    }

    if (nomineeSelect) {
        nomineeSelect.innerHTML = '<option value="">Select Nominee</option>' +
            familyData.members.map(member =>
                `<option value="${member.id}">${member.name} (${member.relationship})</option>`
            ).join('');
    }
}

function saveAccount() {
    const accountTypeEl = document.getElementById('account-type');
    const institutionEl = document.getElementById('account-institution');
    const accountNumberEl = document.getElementById('account-number');
    const holderEl = document.getElementById('account-holder');
    const nomineeEl = document.getElementById('account-nominee');
    const statusEl = document.getElementById('account-status');
    const commentsEl = document.getElementById('account-comments');

    if (!accountTypeEl || !institutionEl || !accountNumberEl || !holderEl) {
        showMessage('Some required fields are missing in the form. Please reload the page.', 'error');
        return;
    }

    const accountType = accountTypeEl.value;
    const institution = institutionEl.value.trim();
    const accountNumber = accountNumberEl.value.trim();
    const holderId = holderEl.value;
    const nomineeId = nomineeEl?.value || '';
    const status = statusEl?.value || 'Active';
    const comments = commentsEl?.value?.trim() || '';

    if (!accountType || !institution || !accountNumber || !holderId) {
        showMessage('Please fill all required fields', 'error');
        return;
    }

    const holder = familyData.members.find(m => m.id === holderId);
    const nominee = nomineeId ? familyData.members.find(m => m.id === nomineeId) : null;

    const accountData = {
        id: editingItemId || generateUUID(),
        account_type: accountType,
        institution: institution,
        account_number: accountNumber,
        holder_name: holder ? holder.name : 'Unknown',
        nominee: nominee ? nominee.name : '',
        status: status,
        comments: comments
    };

    if (editingItemId) {
        const accountIndex = familyData.accounts.findIndex(a => a.id === editingItemId);
        if (accountIndex !== -1) {
            familyData.accounts[accountIndex] = accountData;
        }
        showMessage('✅ Account updated successfully', 'success');
    } else {
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

    const fields = {
        'account-type': account.account_type || '',
        'account-institution': account.institution || '',
        'account-number': account.account_number || '',
        'account-status': account.status || 'Active',
        'account-comments': account.comments || ''
    };
    
    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });

    const holder = familyData.members.find(m => m.name === account.holder_name);
    if (holder) {
        const holderEl = document.getElementById('account-holder');
        if (holderEl) holderEl.value = holder.id;
    }

    const nominee = familyData.members.find(m => m.name === account.nominee);
    if (nominee) {
        const nomineeEl = document.getElementById('account-nominee');
        if (nomineeEl) nomineeEl.value = nominee.id;
    }

    const modalTitle = document.getElementById('account-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Account';
    
    const modal = document.getElementById('account-modal');
    if (modal) modal.classList.remove('hidden');
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

    const photoOptions = document.getElementById('preset-photos-grid');
    if (photoOptions) {
        photoOptions.innerHTML = PRESET_PHOTOS.map((photoUrl, index) =>
            `<img src="${photoUrl}" class="photo-option" data-photo="${photoUrl}" onclick="selectPresetPhoto('${photoUrl}')" alt="Preset ${index + 1}">`
        ).join('');
    }

    const modal = document.getElementById('photo-modal');
    if (modal) modal.classList.remove('hidden');
}

function selectPresetPhoto(photoUrl) {
    selectedPresetPhoto = photoUrl;
    uploadedPhotoData = null;

    document.querySelectorAll('.photo-option').forEach(img => {
        img.classList.remove('selected');
    });

    const selectedImg = document.querySelector(`[data-photo="${photoUrl}"]`);
    if (selectedImg) selectedImg.classList.add('selected');
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

        document.querySelectorAll('.photo-option').forEach(img => {
            img.classList.remove('selected');
        });

        showMessage('✅ Photo uploaded! Click Save to apply.', 'success');
    };
    reader.readAsDataURL(file);
}

async function savePhoto() {
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
            
            // FIXED: Save photo to backend as well
            if (supabase && currentUser) {
                try {
                    const { error } = await supabase
                        .from('family_members')
                        .update({ avatar_url: newPhotoUrl })
                        .eq('id', editingMemberId);
                        
                    if (error) {
                        console.error('Error updating photo in backend:', error);
                    }
                } catch (e) {
                    console.error('Exception updating photo:', e);
                }
            }
        }

        saveDataToStorage();
        renderDashboard();
        
        // Update member details view if currently viewing this member
        if (currentMemberDetailsId === editingMemberId) {
            showMemberDetails(editingMemberId);
        }
        
        showMessage('✅ Photo updated successfully', 'success');
        closeModal('photo-modal');
    } else {
        showMessage('Please select a photo first', 'error');
    }
}

// ===== CALCULATION FUNCTIONS =====
function calculateTotals() {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalAccounts = familyData.accounts.length;

    // Calculate assets
    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        Object.values(investments).forEach(categoryItems => {
            if (Array.isArray(categoryItems)) {
                categoryItems.forEach(item => {
                    totalAssets += parseFloat(item.current_value || item.invested_amount || 0);
                });
            }
        });
    });

    // Calculate liabilities
    familyData.members.forEach(member => {
        const liabilities = familyData.liabilities[member.id] || {};
        Object.values(liabilities).forEach(categoryItems => {
            if (Array.isArray(categoryItems)) {
                categoryItems.forEach(item => {
                    totalLiabilities += parseFloat(item.outstanding_amount || 0);
                });
            }
        });
    });

    const netWorth = totalAssets - totalLiabilities;
    
    // NEW: Calculate reminders
    const upcomingReminders = calculateAllReminders().filter(r => r.days <= 30 && r.days >= 0);

    return {
        totalAssets,
        totalLiabilities,
        netWorth,
        totalAccounts,
        upcomingReminders: upcomingReminders.length
    };
}

function calculateMemberTotals(memberId) {
    let memberAssets = 0;
    let memberLiabilities = 0;

    // Calculate member assets
    const investments = familyData.investments[memberId] || {};
    Object.values(investments).forEach(categoryItems => {
        if (Array.isArray(categoryItems)) {
            categoryItems.forEach(item => {
                memberAssets += parseFloat(item.current_value || item.invested_amount || 0);
            });
        }
    });

    // Calculate member liabilities  
    const liabilities = familyData.liabilities[memberId] || {};
    Object.values(liabilities).forEach(categoryItems => {
        if (Array.isArray(categoryItems)) {
            categoryItems.forEach(item => {
                memberLiabilities += parseFloat(item.outstanding_amount || 0);
            });
        }
    });

    return {
        assets: memberAssets,
        liabilities: memberLiabilities,
        netWorth: memberAssets - memberLiabilities
    };
}

// ===== RENDERING FUNCTIONS =====
function renderDashboard() {
    renderStatsGrid();
    renderFamilyMembersGrid();
    renderInvestmentTabContent('equity');
    renderLiabilityTabContent('homeLoan');
    renderAccountsTable();
    updateLastUpdated();
}

function renderStatsGrid() {
    const totals = calculateTotals();
    const upcomingReminders = calculateAllReminders().filter(r => r.days <= 30 && r.days >= 0);

    const statsHTML = `
        <div class="stat-card assets">
            <div class="stat-label">Total Assets</div>
            <div class="stat-value">₹${totals.totalAssets.toLocaleString()}</div>
        </div>
        <div class="stat-card liabilities">
            <div class="stat-label">Total Liabilities</div>
            <div class="stat-value">₹${totals.totalLiabilities.toLocaleString()}</div>
        </div>
        <div class="stat-card net-worth">
            <div class="stat-label">Net Worth</div>
            <div class="stat-value">₹${totals.netWorth.toLocaleString()}</div>
        </div>
        <div class="stat-card accounts">
            <div class="stat-label">Total Accounts</div>
            <div class="stat-value">${totals.totalAccounts}</div>
        </div>
        <div class="stat-card reminders">
            <div class="stat-label">Upcoming Reminders</div>
            <div class="stat-value">${upcomingReminders.length}</div>
        </div>
    `;

    const statsGridEl = document.getElementById('stats-grid');
    if (statsGridEl) {
        statsGridEl.innerHTML = statsHTML;
    }
}

function renderFamilyMembersGrid() {
    const familyGrid = document.getElementById('family-members-grid');
    if (!familyGrid) return;

    if (familyData.members.length === 0) {
        familyGrid.innerHTML = `
            <div class="empty-state">
                <div class="emoji">👨‍👩‍👧‍👦</div>
                <p>No family members added yet.</p>
                <p>Click "Add Member" to get started!</p>
            </div>
        `;
        return;
    }

    const membersHTML = familyData.members.map(member => {
        const memberTotals = calculateMemberTotals(member.id);
        
        // Count investments and liabilities
        const investments = familyData.investments[member.id] || {};
        const liabilities = familyData.liabilities[member.id] || {};
        
        let totalInvestments = 0;
        let totalLiabilities = 0;
        
        Object.values(investments).forEach(categoryItems => {
            if (Array.isArray(categoryItems)) {
                totalInvestments += categoryItems.length;
            }
        });
        
        Object.values(liabilities).forEach(categoryItems => {
            if (Array.isArray(categoryItems)) {
                totalLiabilities += categoryItems.length;
            }
        });

        return `
            <div class="family-card" onclick="showMemberDetails('${member.id}')">
                <img src="${member.photo_url || PRESET_PHOTOS[0]}" alt="${member.name}" class="member-photo">
                <div class="member-name">
                    ${member.name}
                    ${member.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
                </div>
                <div class="member-relationship">${member.relationship}</div>
                
                <div class="member-summary">
                    <div class="summary-row">
                        <span class="summary-label">Assets:</span>
                        <span class="summary-value assets">₹${memberTotals.assets.toLocaleString()}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Liabilities:</span>
                        <span class="summary-value liabilities">₹${memberTotals.liabilities.toLocaleString()}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Net Worth:</span>
                        <span class="summary-value net-worth">₹${memberTotals.netWorth.toLocaleString()}</span>
                    </div>
                    <div class="summary-counts">
                        <span class="count-item">${totalInvestments} Investments</span>
                        <span class="count-item">${totalLiabilities} Liabilities</span>
                    </div>
                </div>
                
                <div class="member-actions" onclick="event.stopPropagation()">
                    <button onclick="editMember('${member.id}')" class="btn-sm btn-edit">Edit</button>
                    <button onclick="openPhotoModal('${member.id}')" class="btn-sm btn-photo">Photo</button>
                    <button onclick="deleteMember('${member.id}')" class="btn-sm btn-delete">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    familyGrid.innerHTML = membersHTML;
}

function renderInvestmentTabContent(tabName) {
    // Update active tab
    document.querySelectorAll('.tabs .tab').forEach(tab => {
        tab.classList.remove('active');
        const tabText = tab.textContent.toLowerCase();
        if ((tabName === 'equity' && tabText.includes('equity')) ||
            (tabName === 'mutualFunds' && tabText.includes('mutual funds')) ||
            (tabName === 'fixedDeposits' && tabText.includes('fixed deposits')) ||
            (tabName === 'insurance' && tabText.includes('insurance')) ||
            (tabName === 'bankBalances' && tabText.includes('bank balance')) ||
            (tabName === 'others' && tabText.includes('others'))) {
            tab.classList.add('active');
        }
    });

    const content = document.getElementById('investment-tab-content');
    if (!content) return;
    
    let investments = [];

    // Collect all investments of this type
    familyData.members.forEach(member => {
        const memberInvestments = familyData.investments[member.id]?.[tabName] || [];
        memberInvestments.forEach(investment => {
            investments.push({ ...investment, memberName: member.name, memberId: member.id });
        });
    });

    if (investments.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📈</div>
                <p>No ${tabName} investments found.</p>
                <p>Click "Add Investment" to start tracking your investments!</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-responsive">
            <table class="data-table" id="investment-${tabName}-table">
                <thead>
                    <tr>
                        <th onclick="sortTable('investment-${tabName}-table', 0)">Member <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investment-${tabName}-table', 1)">Investment Name <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investment-${tabName}-table', 2)">Invested Amount <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investment-${tabName}-table', 3)">Current Value <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investment-${tabName}-table', 4)">P&L <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('investment-${tabName}-table', 5)">Platform <span class="sort-indicator"></span></th>`;

    // Add type-specific headers
    if (tabName === 'fixedDeposits') {
        tableHTML += `<th onclick="sortTable('investment-${tabName}-table', 6)">Interest Rate <span class="sort-indicator"></span></th><th onclick="sortTable('investment-${tabName}-table', 7)">Maturity Date <span class="sort-indicator"></span></th><th>Interest Payout</th><th>Nominee</th>`;
    } else if (tabName === 'insurance') {
        tableHTML += `<th>Policy Number</th><th onclick="sortTable('investment-${tabName}-table', 7)">Sum Assured <span class="sort-indicator"></span></th><th>Premium Frequency</th><th>Policy Status</th><th>Nominee</th>`;
    } else if (tabName === 'bankBalances') {
        tableHTML += `<th>Account Type</th><th onclick="sortTable('investment-${tabName}-table', 7)">Balance Date <span class="sort-indicator"></span></th><th>Account Number</th>`;
    }

    tableHTML += `<th>Actions</th></tr></thead><tbody>`;

    investments.forEach(item => {
        const pnl = (item.current_value || item.invested_amount || 0) - (item.invested_amount || 0);
        const pnlClass = pnl >= 0 ? 'text-green' : 'text-red';

        tableHTML += `
            <tr>
                <td>${item.memberName}</td>
                <td>${item.symbol_or_name || 'N/A'}</td>
                <td>₹${(item.invested_amount || 0).toLocaleString()}</td>
                <td>₹${(item.current_value || item.invested_amount || 0).toLocaleString()}</td>
                <td class="${pnlClass}">₹${pnl.toLocaleString()}</td>
                <td>${item.broker_platform || 'N/A'}</td>`;

        // Add type-specific data
        if (tabName === 'fixedDeposits') {
            tableHTML += `
                <td>${item.interest_rate || 'N/A'}%</td>
                <td>${item.maturity_date || 'N/A'}</td>
                <td>${item.interest_payout || 'N/A'}</td>
                <td>${item.nominee || 'N/A'}</td>`;
        } else if (tabName === 'insurance') {
            tableHTML += `
                <td>${item.policy_number || 'N/A'}</td>
                <td>₹${(item.sum_assured || 0).toLocaleString()}</td>
                <td>${item.premium_frequency || 'N/A'}</td>
                <td>${item.policy_status || 'N/A'}</td>
                <td>${item.nominee || 'N/A'}</td>`;
        } else if (tabName === 'bankBalances') {
            tableHTML += `
                <td>${item.account_type || 'N/A'}</td>
                <td>${item.balance_date || 'N/A'}</td>
                <td>${item.account_number || 'N/A'}</td>`;
        }

        tableHTML += `
                <td>
                    <button onclick="editInvestment('${item.id}', '${tabName}', '${item.memberId}')" class="btn-sm btn-edit">Edit</button>
                    <button onclick="deleteInvestment('${item.id}', '${tabName}', '${item.memberId}')" class="btn-sm btn-delete">Delete</button>
                </td>
            </tr>`;
    });

    tableHTML += `</tbody></table></div>`;

    content.innerHTML = tableHTML;
}

function renderLiabilityTabContent(tabName) {
    // Update active tab
    document.querySelectorAll('.tabs .tab').forEach((tab, index) => {
        tab.classList.remove('active');
        if ((tabName === 'homeLoan' && index === 0) ||
            (tabName === 'personalLoan' && index === 1) ||
            (tabName === 'creditCard' && index === 2) ||
            (tabName === 'other' && index === 3)) {
            tab.classList.add('active');
        }
    });

    const content = document.getElementById('liability-tab-content');
    if (!content) return;
    
    let liabilities = [];

    // Collect all liabilities of this type
    familyData.members.forEach(member => {
        const memberLiabilities = familyData.liabilities[member.id]?.[tabName] || [];
        memberLiabilities.forEach(liability => {
            liabilities.push({ ...liability, memberName: member.name, memberId: member.id });
        });
    });

    if (liabilities.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📉</div>
                <p>No ${tabName} liabilities found.</p>
                <p>Click "Add Liability" to start tracking your liabilities!</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-responsive">
            <table class="data-table" id="liability-${tabName}-table">
                <thead>
                    <tr>
                        <th onclick="sortTable('liability-${tabName}-table', 0)">Member <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liability-${tabName}-table', 1)">Lender <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liability-${tabName}-table', 2)">Outstanding Amount <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liability-${tabName}-table', 3)">EMI <span class="sort-indicator"></span></th>
                        <th onclick="sortTable('liability-${tabName}-table', 4)">Interest Rate <span class="sort-indicator"></span></th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;

    liabilities.forEach(item => {
        tableHTML += `
            <tr>
                <td>${item.memberName}</td>
                <td>${item.lender || 'N/A'}</td>
                <td>₹${(item.outstanding_amount || 0).toLocaleString()}</td>
                <td>₹${(item.emi_amount || 0).toLocaleString()}</td>
                <td>${item.interest_rate || 0}%</td>
                <td>
                    <button onclick="editLiability('${item.id}', '${tabName}', '${item.memberId}')" class="btn-sm btn-edit">Edit</button>
                    <button onclick="deleteLiability('${item.id}', '${tabName}', '${item.memberId}')" class="btn-sm btn-delete">Delete</button>
                </td>
            </tr>`;
    });

    tableHTML += `</tbody></table></div>`;

    content.innerHTML = tableHTML;
}

function renderAccountsTable() {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;

    if (familyData.accounts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <div class="emoji">🏦</div>
                        <p>No accounts found.</p>
                        <p>Click "Add Account" to start managing your accounts!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const accountsHTML = familyData.accounts.map(account => `
        <tr>
            <td>${account.account_type || 'N/A'}</td>
            <td>${account.institution || 'N/A'}</td>
            <td>${account.account_number || 'N/A'}</td>
            <td>${account.holder_name || 'N/A'}</td>
            <td>${account.nominee || 'Not specified'}</td>
            <td><span class="status ${account.status?.toLowerCase()}">${account.status || 'Active'}</span></td>
            <td>
                <button onclick="editAccount('${account.id}')" class="btn-sm btn-edit">Edit</button>
                <button onclick="deleteAccount('${account.id}')" class="btn-sm btn-delete">Delete</button>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = accountsHTML;
}

// ===== NEW: SORTING FUNCTIONS =====
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;

    let sortDirection = 'asc';
    if (currentSort.table === tableId && currentSort.column === columnIndex) {
        sortDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    currentSort = { table: tableId, column: columnIndex, direction: sortDirection };

    rows.sort((a, b) => {
        const aText = a.cells[columnIndex]?.textContent.trim() || '';
        const bText = b.cells[columnIndex]?.textContent.trim() || '';
        
        // Try to parse as numbers (for amounts, dates, etc.)
        const aNum = parseFloat(aText.replace(/[₹,%]/g, ''));
        const bNum = parseFloat(bText.replace(/[₹,%]/g, ''));
        
        let result = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
            result = aNum - bNum;
        } else {
            // Date comparison
            const aDate = new Date(aText);
            const bDate = new Date(bText);
            
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
                result = aDate - bDate;
            } else {
                // Text comparison
                result = aText.localeCompare(bText);
            }
        }
        
        return sortDirection === 'asc' ? result : -result;
    });

    rows.forEach(row => tbody.appendChild(row));
    updateSortIndicators(tableId, columnIndex, sortDirection);
}

function sortMemberTable(tableId, columnIndex) {
    // Same as sortTable but for member detail tables
    sortTable(tableId, columnIndex);
}

function updateSortIndicators(tableId, columnIndex, direction) {
    const table = document.getElementById(tableId);
    if (!table) return;

    // Clear all indicators
    table.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });

    // Set current indicator
    const headers = table.querySelectorAll('th');
    if (headers[columnIndex]) {
        const indicator = headers[columnIndex].querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = direction === 'asc' ? ' ↑' : ' ↓';
        }
    }
}

// ===== EXPORT FUNCTIONS =====
function downloadCSV(data, filename) {
    if (!data || data.length === 0) {
        showMessage('❌ No data to export', 'warning');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (value === undefined || value === null) {
                        value = '';
                    }
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

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
    const investmentData = [];

    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        
        Object.entries(investments).forEach(([type, items]) => {
            if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                    const baseData = {
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
                    };

                    // Add type-specific fields
                    if (type === 'fixedDeposits') {
                        Object.assign(baseData, {
                            'Bank Name': item.bank_name || 'N/A',
                            'Interest Rate': item.interest_rate || 'N/A',
                            'Start Date': item.start_date || 'N/A',
                            'Maturity Date': item.maturity_date || 'N/A',
                            'Interest Payout': item.interest_payout || 'N/A',
                            'Account Number': item.account_number || 'N/A',
                            'Nominee': item.nominee || 'N/A',
                            'Comments': item.comments || 'N/A'
                        });
                    } else if (type === 'insurance') {
                        Object.assign(baseData, {
                            'Policy Name': item.policy_name || 'N/A',
                            'Policy Number': item.policy_number || 'N/A',
                            'Insurance Company': item.insurance_company || 'N/A',
                            'Insurance Type': item.insurance_type || 'N/A',
                            'Sum Assured': item.sum_assured || 'N/A',
                            'Premium Amount': item.premium_amount || 'N/A',
                            'Premium Frequency': item.premium_frequency || 'N/A',
                            'Start Date': item.start_date || 'N/A',
                            'Maturity Date': item.maturity_date || 'N/A',
                            'Next Premium Date': item.next_premium_date || 'N/A',
                            'Nominee': item.nominee || 'N/A',
                            'Policy Status': item.policy_status || 'N/A',
                            'Comments': item.comments || 'N/A'
                        });
                    } else if (type === 'bankBalances') {
                        Object.assign(baseData, {
                            'Bank Name': item.bank_name || 'N/A',
                            'Account Type': item.account_type || 'N/A',
                            'Balance Date': item.balance_date || 'N/A',
                            'Account Number': item.account_number || 'N/A',
                            'Comments': item.comments || 'N/A'
                        });
                    }

                    investmentData.push(baseData);
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
    if (!familyData.members || familyData.members.length === 0) {
        showMessage('❌ No family members found to export', 'warning');
        return;
    }

    const familyExportData = {
        members: familyData.members,
        investments: familyData.investments,
        liabilities: familyData.liabilities,
        accounts: familyData.accounts,
        totals: calculateTotals(),
        exportDate: new Date().toISOString().split('T')[0],
        exportTime: new Date().toLocaleTimeString('en-IN')
    };

    const filename = `FamWealth_Complete_${new Date().toISOString().split('T')[0]}.${format}`;
    
    if (format === 'csv') {
        // For CSV, export a summary
        const summaryData = familyData.members.map(member => {
            const memberTotals = calculateMemberTotals(member.id);
            return {
                'Name': member.name,
                'Relationship': member.relationship,
                'Primary Account Holder': member.is_primary ? 'Yes' : 'No',
                'Total Assets': memberTotals.assets,
                'Total Liabilities': memberTotals.liabilities,
                'Net Worth': memberTotals.netWorth,
                'Export Date': new Date().toISOString().split('T')[0],
                'Export Time': new Date().toLocaleTimeString('en-IN')
            };
        });
        downloadCSV(summaryData, filename);
    } else {
        downloadJSON(familyExportData, filename);
    }
}
