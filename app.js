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

        // Initialize db-helpers with supabase client
        if (typeof initializeSupabaseClient === 'function') {
            initializeSupabaseClient(supabase);
            console.log('✅ DB Helpers initialized with Supabase client');
        }

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
            console.log('🚀 Starting data load from Supabase...');
            
            // STEP 1: Load family members (SHARED - All users see this data)
            console.log('📋 Loading family members...');
            const { data: membersData, error: membersError } = await supabase
                .from('family_members')
                .select('*')
                .order('created_at', { ascending: true });
                
            if (membersError) {
                console.error('❌ Error fetching family members:', membersError);
                showMessage(`Failed to load members: ${membersError.message}`, 'error');
                setLoadingState(false);
                return;
            }
            
            familyMembers = membersData || [];
            console.log(`✅ Loaded ${familyMembers.length} members`);
            const memberIds = familyMembers.map(member => member.id);
            
            // STEP 2: Load investments from OLD table (for FD, insurance, gold, etc.)
            console.log('💰 Loading investments from old table...');
            let investmentsData = [];
            if (memberIds.length > 0) {
                const { data, error } = await supabase
                    .from('investments')
                    .select('*')
                    .in('member_id', memberIds)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('❌ Error fetching investments:', error);
                    showMessage(`Failed to load investments: ${error.message}`, 'error');
                    setLoadingState(false);
                    return;
                }
                investmentsData = data || [];
            }
            investments = investmentsData;
            console.log(`✅ Loaded ${investments.length} old investments`);

            // STEP 2b: Load equity holdings from NEW table
            console.log('📈 Loading equity holdings from new table...');
            let equityHoldings = [];
            if (typeof getEquityHoldings === 'function') {
                try {
                    equityHoldings = await getEquityHoldings(currentUser.id);
                    console.log(`✅ Loaded ${equityHoldings.length} equity holdings`);
                } catch (err) {
                    console.error('❌ Error loading equity holdings:', err);
                }
            }

            // STEP 2c: Load mutual fund holdings from NEW table
            console.log('📊 Loading mutual fund holdings from new table...');
            let mutualFundHoldings = [];
            if (typeof getMutualFundHoldings === 'function') {
                try {
                    mutualFundHoldings = await getMutualFundHoldings(currentUser.id);
                    console.log(`✅ Loaded ${mutualFundHoldings.length} mutual fund holdings`);
                } catch (err) {
                    console.error('❌ Error loading mutual fund holdings:', err);
                }
            }

            // Store equity and mutual funds separately for rendering
            window.equityHoldings = equityHoldings;
            window.mutualFundHoldings = mutualFundHoldings;
            
            // STEP 3: Load liabilities for all members
            console.log('📉 Loading liabilities...');
            let liabilitiesData = [];
            if (memberIds.length > 0) {
                const { data, error } = await supabase
                    .from('liabilities')
                    .select('*')
                    .in('member_id', memberIds)
                    .order('created_at', { ascending: false });
                    
                if (error) {
                    console.error('❌ Error fetching liabilities:', error);
                    showMessage(`Failed to load liabilities: ${error.message}`, 'error');
                    setLoadingState(false);
                    return;
                }
                liabilitiesData = data || [];
            }
            liabilities = liabilitiesData;
            console.log(`✅ Loaded ${liabilities.length} liabilities`);
            
            // STEP 4: Load all accounts (shared data)
            console.log('🏦 Loading accounts...');
            const { data: accountsData, error: accountsError } = await supabase
                .from('accounts')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (accountsError) {
                console.error('❌ Error fetching accounts:', accountsError);
                showMessage(`Failed to load accounts: ${accountsError.message}`, 'error');
                setLoadingState(false);
                return;
            }
            accounts = accountsData || [];
            console.log(`✅ Loaded ${accounts.length} accounts`);
            
            // STEP 5: Load reminders (shared data) with debug info
            console.log('🔔 Loading reminders...');
            const { data: remindersData, error: remindersError } = await supabase
                .from('reminders')
                .select('*')
                .order('date', { ascending: true });
                
            if (remindersError) {
                console.error('❌ Error fetching reminders:', remindersError);
                showMessage(`Failed to load reminders: ${remindersError.message}`, 'error');
                reminders = [];
            } else {
                reminders = remindersData || [];
                console.log(`✅ Loaded ${reminders.length} reminders`);
                console.log('Raw reminders:', remindersData);
                const autoGenerated = reminders.filter(r => r.auto_generated).length;
                const manual = reminders.filter(r => !r.auto_generated).length;
                console.log(`Reminders breakdown: ${autoGenerated} auto, ${manual} manual`);
            }
            
            // STEP 6: Create automatic reminders if needed
            console.log('🔄 Creating automatic reminders...');
            await createAutomaticReminders();
            await refreshGoldInvestments();
            
            // STEP 7: Render UI components
            console.log('🎨 Rendering UI components...');
            renderFamilyMembers();
            renderStatsOverview();
            renderInvestmentTabContent('equity');
            renderLiabilityTabContent('homeLoan');
            renderAccounts();
            renderReminders();
            renderInvestmentsByMember('bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'); // Replace with your actual member ID
            updateLastUpdated();
            
            setLoadingState(false);
            console.log('✅ Dashboard data loaded successfully');
        } catch (error) {
            console.error('🔥 Critical error loading dashboard:', error);
            showMessage(`Critical error loading data: ${error.message}`, 'error');
            setLoadingState(false);
            
            // Fallback render to partial UI
            try {
                renderFamilyMembers();
                renderStatsOverview();
                renderInvestmentTabContent('equity');
                renderLiabilityTabContent('homeLoan');
                renderAccounts();
                renderInvestmentsByMember('bef9db5e-2f21-4038-8f3f-f78ce1bbfb49'); // Replace with your member ID
                renderReminders();
                updateLastUpdated();
                console.log('🛠️ Rendered fallback dashboard');
            } catch (renderError) {
                console.error('🔥 Failed fallback render:', renderError);
            }
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
// ===== AUTOMATIC REMINDER CREATION =====
async function createAutomaticReminders() {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    console.log('🔔 Creating automatic reminders...');
    
    // Clear existing automatic reminders to avoid duplicates
    reminders = reminders.filter(reminder => !reminder.auto_generated);
    
    let newReminders = [];
    
    // ... your existing reminder creation logic ...
    
    // Save to database if using Supabase
    if (newReminders.length > 0) {
        const savedReminders = await saveRemindersToDatabase(newReminders);
        if (savedReminders) {
            console.log(`✅ Created ${savedReminders.length} automatic reminders`);
            // Don't manually add to reminders array here - saveRemindersToDatabase already did it
        } else {
            // Fallback: add to local array if database save failed
            reminders.push(...newReminders);
        }
    }
    
    // Re-render reminders
    renderReminders();
}

async function saveRemindersToDatabase(newReminders) {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'demo' || !supabase) {
        console.log('📝 Demo mode - reminders saved to local array only');
        return;
    }
    
    try {
        console.log('💾 Saving reminders to database:', newReminders);
        
        // 🔥 KEY FIX: Add .select() to get the inserted data back
        const { data, error } = await supabase
            .from('reminders')
            .insert(newReminders)
            .select('*'); // This is crucial!
            
        if (error) {
            console.error('❌ Supabase insert error:', error);
            showMessage(`Failed to save reminders: ${error.message}`, 'error');
            return;
        }
        
        console.log('✅ Reminders saved successfully:', data);
        console.log(`📊 Inserted ${data.length} new reminders`);
        
        // 🔥 IMPORTANT: Update your local reminders array with the actual inserted data
        // This ensures the IDs match what's in the database
        if (data && data.length > 0) {
            // Replace the temporary IDs with the actual database data
            reminders = reminders.filter(r => !r.auto_generated); // Remove old auto-generated
            reminders.push(...data); // Add the real database records
        }
        
        return data; // Return the inserted data
        
    } catch (error) {
        console.error('💥 Unexpected error saving reminders:', error);
        showMessage(`Unexpected error saving reminders: ${error.message}`, 'error');
    }
}
// ===== CALCULATION FUNCTIONS =====
function calculateMemberAssets(memberId) {
    // Calculate from old investments table (exclude equity and mutualFunds as they're in new tables)
    let total = investments
        .filter(inv =>
            inv.member_id === memberId &&
            inv.investment_type !== 'equity' &&
            inv.investment_type !== 'mutualFunds'
        )
        .reduce((sum, inv) => sum + (inv.current_value || inv.invested_amount || 0), 0);

    // Add equity holdings from new table
    const equityHoldings = window.equityHoldings || [];
    total += equityHoldings
        .filter(h => h.member_id === memberId)
        .reduce((sum, h) => sum + (parseFloat(h.current_value) || 0), 0);

    // Add mutual fund holdings from new table
    const mutualFundHoldings = window.mutualFundHoldings || [];
    total += mutualFundHoldings
        .filter(h => h.member_id === memberId)
        .reduce((sum, h) => sum + (parseFloat(h.current_value) || 0), 0);

    return total;
}

function calculateMemberLiabilities(memberId) {
    return liabilities
        .filter(lib => lib.member_id === memberId)
        .reduce((total, lib) => total + (lib.outstanding_amount || 0), 0);
}

function getMemberInvestmentCount(memberId) {
    // Count from old investments table (exclude equity and mutualFunds as they're in new tables)
    let count = investments.filter(inv =>
        inv.member_id === memberId &&
        inv.investment_type !== 'equity' &&
        inv.investment_type !== 'mutualFunds'
    ).length;

    // Add equity holdings count
    const equityHoldings = window.equityHoldings || [];
    count += equityHoldings.filter(h => h.member_id === memberId).length;

    // Add mutual fund holdings count
    const mutualFundHoldings = window.mutualFundHoldings || [];
    count += mutualFundHoldings.filter(h => h.member_id === memberId).length;

    return count;
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
// CRITICAL FIX 1: renderFamilyMembers - Better image handling
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
        
        // CRITICAL FIX: Determine photo source
        let photoSrc;
        console.log(`🖼️ Member ${member.name} photo:`, member.photo);
        
        if (member.photo && member.photo.startsWith('http')) {
            photoSrc = member.photo;
            console.log('✅ Using uploaded photo');
        } else if (member.photo && member.photo.includes('.png')) {
            photoSrc = getEmojiDataUrl(member.photo);
            console.log('✅ Using emoji preset');
        } else {
            photoSrc = getEmojiDataUrl('default.png');
            console.log('✅ Using default');
        }

        const memberCard = document.createElement('div');
        memberCard.className = 'family-card';
        memberCard.onclick = () => showMemberDetails(member.id);

        // CRITICAL FIX: Use createElement for image
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
                <button onclick="event.stopPropagation(); openPhotoModal('${member.id}')" class="btn btn-sm btn-photo">📷</button>
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
        'gold': 'Gold',
        'immovable': 'Immovable Assets',
        'others': 'Others'
    };

    parentTabs.forEach(tab => {
        if (tab.textContent.trim() === typeMap[type]) {
            tab.classList.add('active');
        }
    });

    const tabContent = document.getElementById('investment-tab-content');

    let filteredInvestments = [];

    // Use NEW tables for equity and mutual funds
    if (type === 'equity') {
        const equityHoldings = window.equityHoldings || [];
        filteredInvestments = equityHoldings.map(holding => ({
            id: holding.id,
            member_id: holding.member_id,
            symbol_or_name: holding.company_name || holding.symbol,
            invested_amount: parseFloat(holding.invested_amount) || 0,
            current_value: parseFloat(holding.current_value) || 0,
            broker_platform: holding.broker_platform,
            investment_type: 'equity',
            import_date: holding.import_date,
            quantity: holding.quantity,
            symbol: holding.symbol
        }));
    } else if (type === 'mutualFunds') {
        const mutualFundHoldings = window.mutualFundHoldings || [];
        filteredInvestments = mutualFundHoldings.map(holding => ({
            id: holding.id,
            member_id: holding.member_id,
            symbol_or_name: holding.scheme_name,
            invested_amount: parseFloat(holding.invested_amount) || 0,
            current_value: parseFloat(holding.current_value) || 0,
            broker_platform: holding.broker_platform,
            investment_type: 'mutualFunds',
            import_date: holding.import_date,
            units: holding.units,
            scheme_code: holding.scheme_code
        }));
    } else {
        // Use OLD table for other investment types
        filteredInvestments = investments.filter(inv => inv.investment_type === type || inv.type === type);
    }

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
                        <th onclick="sortTable('investments-table', 6)">Import Date <span class="sort-indicator"></span></th>
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
                        const importDate = inv.import_date ? new Date(inv.import_date).toLocaleDateString() : '-';

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
                                <td>${importDate}</td>
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
  const today = new Date();
  // Show reminders whose date is today or later
  const upcomingReminders = reminders
    .filter(rem => new Date(rem.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`${upcomingReminders.length} upcoming reminders found`);

  renderStatsOverview();  

  const remindersSection = document.getElementById('reminders-list');
  if (!remindersSection) return;

  if (upcomingReminders.length === 0) {
    remindersSection.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔔</div>
        <p>No upcoming reminders</p>
        <p>Reminders will automatically appear 30 days before FD maturity and insurance premium due dates.</p>
      </div>
    `;
    return;
  }

  remindersSection.innerHTML = `
    <div class="reminders-list">
      ${upcomingReminders.map(rem => {
        const date = new Date(rem.date);
        const daysDiff = calculateDaysDifference(today, date);
        const urgencyClass = daysDiff <= 7
          ? 'reminder-urgent'
          : daysDiff <= 15
            ? 'reminder-warning'
            : 'reminder-normal';
        const urgencyText = daysDiff === 0 ? 'Today' : `${daysDiff} days`;

        const icon =
          rem.type === 'fd_maturity' ? '💰' :
          rem.type === 'insurance_premium' ? '🛡️' :
          '📋';

        return `
          <div class="reminder-card ${urgencyClass}">
            <div class="reminder-icon">${icon}</div>
            <div class="reminder-content">
              <h4 class="reminder-title">${rem.title}</h4>
              <p class="reminder-description">${rem.description || ''}</p>
              <div class="reminder-meta">
                <span class="reminder-date">📅 ${formatDate(date)}</span>
                <span class="reminder-urgency">${urgencyText}</span>
                ${rem.auto_generated ? '<span class="auto-tag">Auto</span>' : ''}
              </div>
            </div>
            ${!rem.auto_generated ? `
              <div class="reminder-actions">
                <button onclick="deleteReminder('${rem.id}')" class="btn btn-sm btn-delete">✕</button>
              </div>
            ` : ''}
          </div>`;
      }).join('')}
    </div>
  `;
}

// ===== ENHANCED MEMBER DETAILS FUNCTIONS =====
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

    // FIXED: Better photo handling
    let photoSrc;
    if (member.photo && member.photo.startsWith('http')) {
        photoSrc = member.photo;
    } else if (member.photo && member.photo.includes('.png')) {
        photoSrc = getEmojiDataUrl(member.photo);
    } else {
        photoSrc = getEmojiDataUrl('default.png');
    }

    // Calculate member's financial data
    const memberAssets = calculateMemberAssets(member.id);
    const memberLiabilities = calculateMemberLiabilities(member.id);
    const netWorth = memberAssets - memberLiabilities;

    // Get equity holdings from NEW table
    const equityHoldings = window.equityHoldings || [];
    const memberEquityHoldings = equityHoldings.filter(h => h.member_id === memberId).map(h => ({
        symbol_or_name: h.company_name || h.symbol,
        investment_type: 'equity',
        invested_amount: parseFloat(h.invested_amount) || 0,
        current_value: parseFloat(h.current_value) || 0,
        broker_platform: h.broker_platform,
        import_date: h.import_date
    }));

    // Get mutual fund holdings from NEW table
    const mutualFundHoldings = window.mutualFundHoldings || [];
    const memberMutualFundHoldings = mutualFundHoldings.filter(h => h.member_id === memberId).map(h => ({
        symbol_or_name: h.scheme_name,
        investment_type: 'mutualFunds',
        invested_amount: parseFloat(h.invested_amount) || 0,
        current_value: parseFloat(h.current_value) || 0,
        broker_platform: h.broker_platform,
        import_date: h.import_date
    }));

    // Get other investments from OLD table (FD, insurance, gold, etc.)
    const otherInvestments = investments.filter(inv =>
        inv.member_id === memberId &&
        inv.investment_type !== 'equity' &&
        inv.investment_type !== 'mutualFunds'
    );

    // Combine all investments
    const memberInvestments = [...memberEquityHoldings, ...memberMutualFundHoldings, ...otherInvestments];

    const memberLiabilityRecords = liabilities.filter(lib => lib.member_id === memberId);
    const memberAccounts = accounts.filter(acc => acc.holder_id === memberId);

    // ENHANCED: Render detailed breakdown of investments, liabilities, and accounts
    const detailsContent = document.getElementById('member-details-content');
    detailsContent.innerHTML = `
        <div class="member-details-overview">
            <div class="member-profile">
                <img src="${photoSrc}" alt="${member.name}" class="member-photo" 
                     onerror="this.src='${getEmojiDataUrl('default.png')}'" />
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

        <!-- DETAILED INVESTMENTS BREAKDOWN -->
        <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="color: #2d3748; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span>📈</span> Investment Portfolio (${memberInvestments.length})
            </h3>
            ${memberInvestments.length === 0 ? `
                <div class="empty-state" style="padding: 30px;">
                    <div class="emoji">📈</div>
                    <p>No investments found for ${member.name}</p>
                </div>
            ` : `
                <div class="table-responsive">
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
                            ${memberInvestments.map(inv => {
                                const currentValue = inv.current_value || inv.invested_amount;
                                const gain = currentValue - inv.invested_amount;
                                const gainClass = gain >= 0 ? 'text-green' : 'text-red';
                                const gainPercentage = inv.invested_amount > 0 ? ((gain / inv.invested_amount) * 100).toFixed(2) : '0.00';
                                
                                const typeMap = {
                                    'equity': 'Equity',
                                    'mutualFunds': 'Mutual Funds',
                                    'fixedDeposits': 'Fixed Deposits',
                                    'insurance': 'Insurance',
                                    'bankBalances': 'Bank Balances',
                                    'others': 'Others'
                                };
                                
                                return `
                                    <tr>
                                        <td>${inv.symbol_or_name || inv.name || 'Unknown'}</td>
                                        <td>${typeMap[inv.investment_type] || inv.investment_type}</td>
                                        <td>${formatCurrency(inv.invested_amount)}</td>
                                        <td>${formatCurrency(currentValue)}</td>
                                        <td class="${gainClass}">
                                            ${formatCurrency(gain)} (${gain >= 0 ? '+' : ''}${gainPercentage}%)
                                        </td>
                                        <td>${inv.broker_platform || inv.platform || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>

        <!-- DETAILED LIABILITIES BREAKDOWN -->
        <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="color: #2d3748; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span>📉</span> Liabilities (${memberLiabilityRecords.length})
            </h3>
            ${memberLiabilityRecords.length === 0 ? `
                <div class="empty-state" style="padding: 30px;">
                    <div class="emoji">📉</div>
                    <p>No liabilities found for ${member.name}</p>
                </div>
            ` : `
                <div class="table-responsive">
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
                            ${memberLiabilityRecords.map(lib => {
                                const typeMap = {
                                    'homeLoan': 'Home Loan',
                                    'personalLoan': 'Personal Loan',
                                    'creditCard': 'Credit Card',
                                    'other': 'Other'
                                };
                                
                                return `
                                    <tr>
                                        <td>${lib.lender}</td>
                                        <td>${typeMap[lib.type] || lib.type}</td>
                                        <td class="text-red">${formatCurrency(lib.outstanding_amount)}</td>
                                        <td>${formatCurrency(lib.emi_amount || 0)}</td>
                                        <td>${lib.interest_rate ? lib.interest_rate + '%' : '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>

        <!-- DETAILED ACCOUNTS BREAKDOWN -->
        <div style="padding: 30px;">
            <h3 style="color: #2d3748; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <span>🏦</span> Accounts (${memberAccounts.length})
            </h3>
            ${memberAccounts.length === 0 ? `
                <div class="empty-state" style="padding: 30px;">
                    <div class="emoji">🏦</div>
                    <p>No accounts found for ${member.name}</p>
                </div>
            ` : `
                <div class="table-responsive">
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
                            ${memberAccounts.map(acc => {
                                const nominee = familyMembers.find(m => m.id === acc.nominee_id);
                                const statusClass = acc.status === 'Active' ? 'status active' : 'status inactive';
                                
                                return `
                                    <tr>
                                        <td>${acc.account_type}</td>
                                        <td>${acc.institution}</td>
                                        <td>${acc.account_number}</td>
                                        <td>${nominee ? nominee.name : '-'}</td>
                                        <td><span class="${statusClass}">${acc.status}</span></td>
                                        <td>${acc.comments || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
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

// ===== PHOTO FUNCTIONS - FIXED FOR REAL UPLOADS =====
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

// FIXED: Real photo upload to Supabase Storage with proper error handling
async function uploadPhoto(file) {
    if (!file) return null;

    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file.');
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must be less than 5MB.');
        }

        // Check if Supabase is available
        if (!supabase) {
            throw new Error('Photo upload requires database connection.');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${generateId()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        console.log('📁 Uploading photo to:', filePath);

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('❌ Upload error:', error);
            throw new Error('Upload failed: ' + error.message);
        }

        console.log('✅ Upload successful:', data);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        console.log('🔗 Public URL:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('❌ Photo upload failed:', error);
        throw error;
    }
}

// FIXED: Handle both file uploads and preset photo selection
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showMessage('Uploading photo...', 'info');
        
        const photoUrl = await uploadPhoto(file);
        
        if (!photoUrl) {
            throw new Error('Failed to get photo URL');
        }

        console.log('✅ Photo uploaded, URL:', photoUrl);

        // Update member's photo immediately with the URL
        await updateMemberPhoto(currentPhotoMemberId, photoUrl);

        // Refresh UI to show new photo
        renderFamilyMembers();
        closeModal('photo-modal');
        showMessage('Photo uploaded successfully! 📸', 'success');

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('❌ Photo upload error:', error);
        showMessage(`Photo upload failed: ${error.message}`, 'error');
        event.target.value = '';
    }
}

// FIXED: Helper function to update member photo (only uses photo field, not photo_url)
async function updateMemberPhoto(memberId, photoValue) {
    const authType = localStorage.getItem('famwealth_auth_type');

    if (authType === 'demo' || !supabase) {
        // Demo mode - update local data
        const member = familyMembers.find(m => m.id === memberId);
        if (member) {
            member.photo = photoValue;
        }
    } else {
        // Supabase mode - update database (FIXED: only update photo field)
        const { error } = await supabase
            .from('family_members')
            .update({ 
                photo: photoValue  // FIXED: Only update photo, not photo_url
            })
            .eq('id', memberId);

        if (error) {
            console.error('❌ Database update error:', error);
            throw error;
        }

        // Update local data
        const member = familyMembers.find(m => m.id === memberId);
        if (member) {
            member.photo = photoValue;
        }
    }
}

// FIXED: Updated savePhoto to handle both presets and uploads
async function savePhoto() {
    if (!selectedPhoto) {
        showMessage('Please select a photo or upload one.', 'error');
        return;
    }

    try {
        // Update member's photo in database
        await updateMemberPhoto(currentPhotoMemberId, selectedPhoto);

        // Force re-render to show updated photo
        renderFamilyMembers();
        closeModal('photo-modal');
        showMessage('Photo updated successfully! ✅', 'success');
    } catch (error) {
        console.error('❌ Error updating photo:', error);
        showMessage('Error updating photo: ' + error.message, 'error');
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
    // Hide all investment-type-fields and conditional-fields
    document.querySelectorAll('.conditional-fields, .investment-type-fields').forEach(field => {
        field.style.display = 'none';
    });
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
    } else if (investmentType === 'gold') {
        document.querySelector('.gold-fields').style.display = 'block';
        // Fetch live gold rate whenever gold is selected
        fetchGoldRate();
    } else if (investmentType === 'immovable') {
        document.querySelector('.immovable-fields').style.display = 'block';
        // Calculate total value if quantity and rate already have values
        updatePropertyValue();
    }
}


// ENHANCED: saveInvestment with additional fields for FD, Insurance, and Bank Balance
async function saveInvestment() {
    const memberId = document.getElementById('investment-member').value;
    const type = document.getElementById('investment-type').value;
    const name = document.getElementById('investment-name').value.trim();
    const amount = parseFloat(document.getElementById('investment-amount').value);
    let currentValueInput = parseFloat(document.getElementById('investment-current-value').value) || 0;
    const platform = document.getElementById('investment-platform').value.trim() || 'Not Specified';

    // Basic validation
    if (!memberId || !type || !name || !amount) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    if (amount <= 0) {
        showMessage('Invested amount must be greater than 0.', 'error');
        return;
    }

    try {
        // 1) Override for Insurance: use Sum Assured
        if (type === 'insurance') {
            const sumAssured = parseFloat(document.getElementById('ins-sum-assured').value) || 0;
            currentValueInput = sumAssured;
        }

        // 2) Override for Gold: grams × rate
        if (type === 'gold') {
            const grams = parseFloat(document.getElementById('gold-quantity').value) || 0;
            const rate = parseFloat(document.getElementById('gold-rate').value) || 0;
            currentValueInput = grams * rate;
        }

        // 3) Fallback to invested amount if currentValueInput is zero
        const currentValue = currentValueInput > 0 ? currentValueInput : amount;

        // 4) Build base investmentData
        const investmentData = {
            member_id:       memberId,
            investment_type: type,
            symbol_or_name:  name,
            invested_amount: amount,
            current_value:   currentValue,
            broker_platform: platform,
            created_at:      new Date().toISOString()
        };

        // 5) Append type-specific fields

        if (type === 'fixedDeposits') {
            investmentData.fd_bank_name      = document.getElementById('fd-bank-name')?.value || null;
            investmentData.fd_interest_rate  = parseFloat(document.getElementById('fd-interest-rate')?.value) || null;
            investmentData.fd_interest_payout= document.getElementById('fd-interest-payout')?.value || null;
            investmentData.fd_start_date     = document.getElementById('fd-start-date')?.value || null;
            investmentData.fd_maturity_date  = document.getElementById('fd-maturity-date')?.value || null;
            investmentData.fd_account_number = document.getElementById('fd-account-number')?.value || null;
            investmentData.fd_nominee        = document.getElementById('fd-nominee')?.value || null;
            investmentData.fd_comments       = document.getElementById('fd-comments')?.value || null;
        }

        if (type === 'insurance') {
            investmentData.policy_name       = document.getElementById('ins-policy-name')?.value?.trim() || null;
            investmentData.policy_number     = document.getElementById('ins-policy-number')?.value?.trim() || null;
            investmentData.company           = document.getElementById('ins-company')?.value?.trim() || null;
            investmentData.insurance_type    = document.getElementById('ins-type')?.value || null;
            investmentData.sum_assured       = parseFloat(document.getElementById('ins-sum-assured')?.value) || 0;
            investmentData.premium_amount    = parseFloat(document.getElementById('ins-premium-amount')?.value) || null;
            investmentData.premium_frequency = document.getElementById('ins-premium-frequency')?.value || null;
            investmentData.start_date        = document.getElementById('ins-start-date')?.value || null;
            investmentData.maturity_date     = document.getElementById('ins-maturity-date')?.value || null;
            investmentData.next_premium_date = document.getElementById('ins-next-premium-date')?.value || null;
            investmentData.nominee           = document.getElementById('ins-nominee')?.value || null;
            investmentData.policy_status     = document.getElementById('ins-policy-status')?.value || null;
            investmentData.comments          = document.getElementById('ins-comments')?.value || null;
        }

        if (type === 'bankBalances') {
            investmentData.bank_current_balance = parseFloat(document.getElementById('bank-current-balance')?.value) || null;
            investmentData.bank_as_of_date      = document.getElementById('bank-as-of-date')?.value || null;
            investmentData.bank_account_type    = document.getElementById('bank-account-type')?.value || null;
        }

        if (type === 'gold') {
            investmentData.gold_quantity    = parseFloat(document.getElementById('gold-quantity')?.value) || 0;
            investmentData.gold_rate        = parseFloat(document.getElementById('gold-rate')?.value)     || 0;
            investmentData.comments         = document.getElementById('gold-comments')?.value || null;
        }

        if (type === 'immovable') {
            investmentData.property_name     = document.getElementById('property-name')?.value || null;
            investmentData.property_sqft     = parseFloat(document.getElementById('property-sqft')?.value) || 0;
            investmentData.cost_per_sqft     = parseFloat(document.getElementById('cost-per-sqft')?.value)  || 0;
            investmentData.total_value       = parseFloat(document.getElementById('property-total-value')?.value) || 0;
            investmentData.comments          = document.getElementById('property-comments')?.value || null;
        }

        // 6) Persist data
        if (editingInvestmentId) {
            await updateInvestmentData(editingInvestmentId, investmentData);
            showMessage('Investment updated successfully! ✅', 'success');
        } else {
            await addInvestmentData(investmentData);
            showMessage('Investment added successfully! ✅', 'success');
        }

        renderInvestmentTabContent(type);
        renderStatsOverview();
        closeModal('investment-modal');

    } catch (error) {
        console.error('❌ Investment save error:', error);
        showMessage(`Error: ${error.message}`, 'error');
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

// Add this at the top of app.js, before any functions that call safeSet
function safeSet(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`safeSet: element "${elementId}" not found`);
    return;
  }
  if (el.type === 'checkbox') {
    el.checked = Boolean(value);
  } else if (el.type === 'date' && value) {
    const d = new Date(value);
    el.value = isNaN(d) ? '' : d.toISOString().split('T')[0];
  } else if (el.type === 'number' && (value !== null && value !== undefined)) {
    el.value = Number(value);
  } else {
    el.value = value || '';
  }
}

async function fetchGoldRate() {
  try {
    const res = await fetch('https://www.goldapi.io/api/XAU/INR', {
      headers: {
        'x-access-token': 'goldapi-8dupsmf59jqzx-io',
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    const rate22k = data.price_gram_24k * (22 / 24);
    document.getElementById('gold-rate').value = rate22k.toFixed(2);
    console.log('✅ 22K Gold rate fetched:', rate22k);
    return rate22k;
  } catch (e) {
    console.error('❌ Failed to fetch gold rate:', e);
    const fallback = 6300.00;
    document.getElementById('gold-rate').value = fallback.toFixed(2);
    showMessage('Using fallback gold rate.', 'warning');
    return fallback;
  }
}

      
// Fetch and update all gold investments with the latest rate
async function refreshGoldInvestments() {
  try {
    // 1. Get the latest 22K gold rate
    console.log('⏳ Refreshing gold rate for all gold investments…');
    await fetchGoldRate(); // sets document.getElementById('gold-rate').value
    const latestRate = parseFloat(document.getElementById('gold-rate').value);
    if (isNaN(latestRate)) throw new Error('Invalid gold rate');

    // 2. Update each gold investment locally and in the database
    const goldInvs = investments.filter(inv => inv.investment_type === 'gold');
    for (const inv of goldInvs) {
      const newValue = inv.gold_quantity * latestRate;
      inv.current_value = newValue;
      inv.gold_rate = latestRate;

      // Persist change to Supabase
      const { error } = await supabase
        .from('investments')
        .update({ current_value: newValue, gold_rate: latestRate })
        .eq('id', inv.id);

      if (error) {
        console.error(`❌ Failed to update gold inv ${inv.id}:`, error);
      } else {
        console.log(`✅ Updated gold inv ${inv.id} to ₹${newValue.toFixed(2)}`);
      }
    }
  } catch (e) {
    console.error('💥 Error refreshing gold investments:', e);
    showMessage(`Gold refresh failed: ${e.message}`, 'error');
  }
}


function updatePropertyValue() {
  const sqft = parseFloat(document.getElementById('property-sqft')?.value) || 0;
  const rate = parseFloat(document.getElementById('cost-per-sqft')?.value) || 0;
  const total = sqft * rate;
  document.getElementById('property-total-value').value = total.toFixed(2);
}
 
// ENHANCED: editInvestment with additional fields
  function editInvestment(investmentId) {
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) {
        console.error('Investment not found:', investmentId);
        return;
    }
    editingInvestmentId = investmentId;
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';

    // Populate basic fields
    document.getElementById('investment-member').value = investment.member_id || '';
    document.getElementById('investment-type').value = investment.investment_type || investment.type || '';
    document.getElementById('investment-name').value = investment.symbol_or_name || investment.name || '';
    document.getElementById('investment-amount').value = investment.invested_amount || '';
    document.getElementById('investment-current-value').value = investment.current_value || '';
    document.getElementById('investment-platform').value = investment.broker_platform || investment.platform || '';

    const investmentType = investment.investment_type || investment.type;

    // Populate type-specific fields
    if (investmentType === 'fixedDeposits') {
        document.getElementById('fd-bank-name').value = investment.fd_bank_name || '';
        document.getElementById('fd-interest-rate').value = investment.fd_interest_rate || '';
        document.getElementById('fd-interest-payout').value = investment.fd_interest_payout || 'Yearly';
        document.getElementById('fd-start-date').value = investment.fd_start_date || '';
        document.getElementById('fd-maturity-date').value = investment.fd_maturity_date || '';
        document.getElementById('fd-account-number').value = investment.fd_account_number || '';
        document.getElementById('fd-nominee').value = investment.fd_nominee || '';
        document.getElementById('fd-comments').value = investment.fd_comments || '';
        console.log('✅ Populated FD fields for edit');
    }

    if (investmentType === 'insurance') {
        safeSet('ins-policy-name', investment.policy_name || '');
        safeSet('ins-policy-number', investment.policy_number);
        safeSet('ins-company', investment.company);
        safeSet('ins-type', investment.insurance_type);
        safeSet('ins-sum-assured', investment.sum_assured);
        safeSet('ins-premium-amount', investment.premium_amount);
        safeSet('ins-premium-frequency', investment.premium_frequency);
        safeSet('ins-start-date', investment.start_date);
        safeSet('ins-maturity-date', investment.maturity_date);
        safeSet('ins-next-premium-date', investment.next_premium_date);
        safeSet('ins-nominee', investment.nominee);
        safeSet('ins-policy-status', investment.policy_status);
        safeSet('ins-comments', investment.comments);
        console.log('✅ Populated Insurance fields for edit');
    }

    if (investmentType === 'bankBalances') {
        document.getElementById('bank-current-balance').value = investment.bank_current_balance || '';
        document.getElementById('bank-as-of-date').value = investment.bank_as_of_date || '';
        document.getElementById('bank-account-type').value = investment.bank_account_type || '';
        console.log('✅ Populated Bank Balance fields for edit');
    }

    if (investmentType === 'equity') {
        if (document.getElementById('equity-quantity'))
            document.getElementById('equity-quantity').value = investment.equity_quantity || '';
        if (document.getElementById('equity-avg-price'))
            document.getElementById('equity-avg-price').value = investment.equity_avg_price || '';
        if (document.getElementById('equity-symbol'))
            document.getElementById('equity-symbol').value = investment.equity_symbol || '';
        if (document.getElementById('equity-sector'))
            document.getElementById('equity-sector').value = investment.equity_sector || '';
        console.log('✅ Populated Equity fields for edit');
    }

    if (investmentType === 'mutualFunds') {
        safeSet('mf-fund-name', investment.fund_name || '');
        safeSet('mf-scheme-code', investment.scheme_code);
        safeSet('mf-fund-house', investment.fund_house);
        safeSet('mf-sip-amount', investment.sip_amount);
        safeSet('mf-folio-number', investment.folio_number);
        console.log('✅ Populated Mutual Fund fields for edit');
    }

    if (investmentType === 'others') {
        safeSet('other-description', investment.description);
        safeSet('other-category', investment.category);
        console.log('✅ Populated Other investment fields for edit');
    }
if (investmentType === 'gold') {
  safeSet('gold-quantity', investment.gold_quantity);
  safeSet('gold-rate', investment.gold_rate);
  safeSet('gold-comments', investment.comments);
}

if (investmentType === 'immovable') {
  safeSet('property-name', investment.property_name);
  safeSet('property-sqft', investment.property_sqft);
  safeSet('cost-per-sqft', investment.cost_per_sqft);
  safeSet('property-total-value', investment.total_value);
  safeSet('property-comments', investment.comments);
}


    // Update form display and populate member options
    updateInvestmentForm();
    populateMemberOptions('investment-member');
    openModal('investment-modal');
    
    console.log('📝 Investment form populated for edit:', {
        id: investmentId,
        type: investmentType,
        name: investment.symbol_or_name || investment.name
    });
}

// Helper function to safely get element value
function safeGetElementValue(elementId, fallback = '') {
    const element = document.getElementById(elementId);
    return element ? element.value : fallback;
}

// Helper function to safely set element value
function safeSetElementValue(elementId, value = '') {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
        return true;
    }
    return false;
}

async function deleteInvestment(investmentId) {
  if (!confirm('Delete this investment and its associated reminders?')) return;

  try {
    // 1. Delete all reminders referencing this investment
    const { error: remError } = await supabase
      .from('reminders')
      .delete()
      .eq('investment_id', investmentId);

    if (remError) {
      console.error('Error deleting reminders:', remError);
      showMessage(`Failed to delete reminders: ${remError.message}`, 'error');
      return;
    }
    console.log(`✅ Deleted reminders for investment ${investmentId}`);

    // 2. Delete the investment
    const { error: invError } = await supabase
      .from('investments')
      .delete()
      .eq('id', investmentId);

    if (invError) {
      console.error('Error deleting investment:', invError);
      showMessage(`Failed to delete investment: ${invError.message}`, 'error');
      return;
    }
    console.log(`✅ Deleted investment ${investmentId}`);

    // 3. Update local state and re-render UI
    reminders = reminders.filter(r => r.investment_id !== investmentId);
    investments = investments.filter(inv => inv.id !== investmentId);
    renderInvestmentTabContent(/* current tab type */);
    renderReminders();
    renderStatsOverview();
    showMessage('Investment and its reminders deleted successfully!', 'success');

  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    showMessage(`Unexpected error: ${error.message}`, 'error');
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

function exportLiabilities(format) {
    if (liabilities.length === 0) {
        showMessage('No liabilities to export.', 'warning');
        return;
    }

    // ENHANCED: Add member names to export data
    const liabilitiesWithMemberNames = liabilities.map(lib => {
        const member = familyMembers.find(m => m.id === lib.member_id);
        return {
            ...lib,
            member_name: member ? member.name : 'Unknown Member'
        };
    });

    if (format === 'csv') {
        const csvContent = convertToCSV(liabilitiesWithMemberNames);
        downloadFile('liabilities.csv', csvContent, 'text/csv');
    } else if (format === 'json') {
        const jsonContent = JSON.stringify(liabilitiesWithMemberNames, null, 2);
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

// ===== IMPORT FUNCTIONALITY =====
function openImportModal(type) {
    currentImportType = type;
    document.getElementById('import-modal-title').textContent = `Import ${capitalizeFirst(type)}`;

    const instructions = getImportInstructions(type);
    document.getElementById('import-instructions').innerHTML = instructions;

    document.getElementById('import-file').value = '';
    document.getElementById('import-preview').style.display = 'none';
    document.getElementById('import-btn').disabled = true;
    document.getElementById('file-name').textContent = '';

    openModal('import-modal');
}

function getImportInstructions(type) {
    const templates = {
        investments: `
            <h4>📊 Investment Import Instructions</h4>
            <p>CSV should contain these columns (exact names required):</p>
            <div class="csv-template">
                <strong>Required columns:</strong>
                <ul>
                    <li><code>member_name</code> - Name of family member</li>
                    <li><code>investment_type</code> - equity, mutualFunds, fixedDeposits, insurance, bankBalances, others</li>
                    <li><code>name</code> - Investment/stock/fund name</li>
                    <li><code>invested_amount</code> - Amount invested</li>
                    <li><code>current_value</code> - Current value (optional, defaults to invested_amount)</li>
                    <li><code>platform</code> - Broker/platform name (optional)</li>
                </ul>
            </div>
        `,
        liabilities: `
            <h4>📉 Liability Import Instructions</h4>
            <p>CSV should contain these columns (exact names required):</p>
            <div class="csv-template">
                <strong>Required columns:</strong>
                <ul>
                    <li><code>member_name</code> - Name of family member</li>
                    <li><code>liability_type</code> - homeLoan, personalLoan, creditCard, other</li>
                    <li><code>lender</code> - Name of lender/bank</li>
                    <li><code>outstanding_amount</code> - Outstanding amount</li>
                    <li><code>emi_amount</code> - Monthly EMI (optional)</li>
                    <li><code>interest_rate</code> - Interest rate % (optional)</li>
                </ul>
            </div>
        `,
        accounts: `
            <h4>🏦 Account Import Instructions</h4>
            <p>CSV should contain these columns (exact names required):</p>
            <div class="csv-template">
                <strong>Required columns:</strong>
                <ul>
                    <li><code>account_type</code> - Type of account</li>
                    <li><code>institution</code> - Bank/institution name</li>
                    <li><code>account_number</code> - Account number</li>
                    <li><code>holder_name</code> - Name of account holder</li>
                    <li><code>nominee_name</code> - Name of nominee (optional)</li>
                    <li><code>status</code> - Active, Inactive (optional, defaults to Active)</li>
                    <li><code>comments</code> - Additional comments (optional)</li>
                </ul>
            </div>
        `
    };
    return templates[type] || '';
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('file-name').textContent = file.name;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showMessage('Please select a CSV file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const parsedData = parseCSV(csvText);

            if (parsedData.length === 0) {
                showMessage('CSV file is empty or invalid.', 'error');
                return;
            }

            importData = parsedData;
            showImportPreview(parsedData);
            document.getElementById('import-btn').disabled = false;

        } catch (error) {
            console.error('Error parsing CSV:', error);
            showMessage('Error parsing CSV file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = [];
        let currentValue = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim().replace(/"/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim().replace(/"/g, ''));

        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }

    return data;
}

function showImportPreview(data) {
    const previewDiv = document.getElementById('import-preview');

    if (data.length === 0) {
        previewDiv.innerHTML = '<p>No valid data found in CSV.</p>';
        previewDiv.style.display = 'block';
        return;
    }

    const headers = Object.keys(data[0]);
    let tableHTML = `
        <h4>📋 Import Preview (${data.length} records)</h4>
        <div class="table-responsive" style="max-height: 300px; overflow: auto;">
            <table class="data-table">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.slice(0, 10).map(row => 
                        `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (data.length > 10) {
        tableHTML += `<p><em>Showing first 10 records. Total: ${data.length} records</em></p>`;
    }

    previewDiv.innerHTML = tableHTML;
    previewDiv.style.display = 'block';
}

async function processImport() {
    if (!importData || !currentImportType) {
        showMessage('No data to import.', 'error');
        return;
    }

    try {
        document.getElementById('import-btn').disabled = true;
        document.getElementById('import-btn').textContent = 'Importing...';

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < importData.length; i++) {
            try {
                const row = importData[i];
                await importSingleRecord(currentImportType, row, i + 2);
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`Import error for row ${i + 2}:`, error);
            }
        }

        if (successCount > 0) {
            showMessage(`Successfully imported ${successCount} records!`, 'success');
            await loadDashboardData();
        }

        if (errorCount > 0) {
            showMessage(`${errorCount} records failed to import.`, 'warning');
        }

        closeModal('import-modal');

    } catch (error) {
        console.error('Import process error:', error);
        showMessage('Import failed: ' + error.message, 'error');
    } finally {
        document.getElementById('import-btn').disabled = false;
        document.getElementById('import-btn').textContent = 'Import Data';
    }
}

async function importSingleRecord(type, row, rowNumber) {
    switch (type) {
        case 'investments':
            return await importInvestmentRecord(row, rowNumber);
        case 'liabilities':
            return await importLiabilityRecord(row, rowNumber);
        case 'accounts':
            return await importAccountRecord(row, rowNumber);
        default:
            throw new Error(`Unknown import type: ${type}`);
    }
}

async function importInvestmentRecord(row, rowNumber) {
    const required = ['member_name', 'investment_type', 'name', 'invested_amount'];
    for (const field of required) {
        if (!row[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    const member = familyMembers.find(m => m.name.toLowerCase() === row.member_name.toLowerCase());
    if (!member) {
        throw new Error(`Member not found: ${row.member_name}. Please add this member first.`);
    }

    // SHARED DATA - Removed user_id
    const investmentData = {
        member_id: member.id,
        investment_type: row.investment_type,
        symbol_or_name: row.name,
        invested_amount: parseFloat(row.invested_amount) || 0,
        current_value: parseFloat(row.current_value) || parseFloat(row.invested_amount) || 0,
        broker_platform: row.platform || '',
        created_at: new Date().toISOString()
    };

    await addInvestmentData(investmentData);
}

async function importLiabilityRecord(row, rowNumber) {
    const required = ['member_name', 'liability_type', 'lender', 'outstanding_amount'];
    for (const field of required) {
        if (!row[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    const member = familyMembers.find(m => m.name.toLowerCase() === row.member_name.toLowerCase());
    if (!member) {
        throw new Error(`Member not found: ${row.member_name}. Please add this member first.`);
    }

    // SHARED DATA - Removed user_id
    const liabilityData = {
        member_id: member.id,
        liability_type: row.liability_type,
        type: row.liability_type,
        lender: row.lender,
        outstanding_amount: parseFloat(row.outstanding_amount) || 0,
        emi_amount: parseFloat(row.emi_amount) || 0,
        interest_rate: parseFloat(row.interest_rate) || 0,
        created_at: new Date().toISOString()
    };

    await addLiabilityData(liabilityData);
}

async function importAccountRecord(row, rowNumber) {
    const required = ['account_type', 'institution', 'account_number', 'holder_name'];
    for (const field of required) {
        if (!row[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    const holder = familyMembers.find(m => m.name.toLowerCase() === row.holder_name.toLowerCase());
    if (!holder) {
        throw new Error(`Holder not found: ${row.holder_name}. Please add this member first.`);
    }

    let nominee = null;
    let nomineeId = null;
    if (row.nominee_name) {
        nominee = familyMembers.find(m => m.name.toLowerCase() === row.nominee_name.toLowerCase());
        if (nominee) {
            nomineeId = nominee.id;
        }
    }

    // SHARED DATA - Removed user_id
    const accountData = {
        account_type: row.account_type,
        institution: row.institution,
        account_number: row.account_number,
        holder_id: holder.id,
        holder_name: holder.name,
        nominee_id: nomineeId,
        nominee_name: nominee ? nominee.name : '',
        status: row.status || 'Active',
        comments: row.comments || '',
        created_at: new Date().toISOString()
    };

    await addAccountData(accountData);
}

// Your existing global variables and utility functions

// ===== START of DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 FamWealth Dashboard DOM loaded');

    // ====== Zerodha Functions and Initialization ========
    function updateConnectionStatus() {
        try {
            const statusEl = document.getElementById('connection-status');
            const syncEl = document.getElementById('last-sync');

            if (statusEl) {
                const connected = localStorage.getItem('zerodha_access_token');
                const userData = JSON.parse(localStorage.getItem('zerodha_user_data') || '{}');

                if (connected) {
                    statusEl.textContent = `✅ Connected ${userData.user_name ? '(' + userData.user_name + ')' : ''}`;
                    statusEl.style.color = '#28a745';
                } else {
                    statusEl.textContent = '❌ Not Connected';
                    statusEl.style.color = '#dc3545';
                }
            }

            if (syncEl) {
                const lastSync = localStorage.getItem('zerodha_last_sync');
                if (lastSync) {
                    const syncDate = new Date(lastSync);
                    syncEl.textContent = `Last sync: ${syncDate.toLocaleString()}`;
                } else {
                    syncEl.textContent = 'Last sync: Never';
                }
            }
        } catch (error) {
            console.error('Error updating Zerodha connection status:', error);
        }
    }

   
    function showZerodhaSection() {
        const section = document.getElementById('zerodha-section');
        if (section) {
            section.style.display = 'block'; // make sure it's visible
            console.log('✅ Zerodha section is now visible');
        }
    }

    // ====== Initialize Zerodha Section
    showZerodhaSection();
    updateConnectionStatus();
    // setTimeout(checkZerodhaFunctions, 1000); // Delay to ensure scripts loaded

    // ====== Register Event Listeners (inside DOMContentLoaded)
    // Modal close buttons
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });

    // Modal background to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Escape key for closing modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) closeModal(openModal.id);
        }
    });

    // Form submissions
    const forms = ['member-form', 'investment-form', 'liability-form', 'account-form'];
    forms.forEach(fid => {
        const form = document.getElementById(fid);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                switch (fid) {
                    case 'member-form': saveMember(); break;
                    case 'investment-form': saveInvestment(); break;
                    case 'liability-form': saveLiability(); break;
                    case 'account-form': saveAccount(); break;
                }
            });
        }
    });

    // Property value calculation
    const sqftInput = document.getElementById('property-sqft');
    const rateInput = document.getElementById('cost-per-sqft');
    if (sqftInput && rateInput) {
        sqftInput.addEventListener('input', updatePropertyValue);
        rateInput.addEventListener('input', updatePropertyValue);
    }

    // Load other initializations, e.g., populate dashboard
    // ... your remaining code ...

    // Set interval to update connection status
    setInterval(updateConnectionStatus, 30000);

    // Populate member dropdown if applicable
    // setTimeout(() => {
     //   if (typeof familyMembers !== 'undefined') {
       //     populateMemberDropdown();
       // }
  //  }, 2000);
});

// ====== Any globally accessible functions
function zerodhaViewPortfolio() {
    try {
        const connected = localStorage.getItem('zerodha_access_token');
        if (!connected) {
            showMessage('Please connect to Zerodha first', 'warning');
            return;
        }
        const portfolioDiv = document.getElementById('zerodha-portfolio');
        if (portfolioDiv) {
            portfolioDiv.style.display = 'block';
            if (typeof renderInvestmentsByMember === 'function') {
                renderInvestmentsByMember('YOUR_MEMBER_ID');
            }
        }
    } catch (e) {
        console.error('Error viewing Zerodha portfolio:', e);
        showMessage('Error viewing portfolio: ' + e.message, 'error');
    }
}


    
function renderInvestmentsByMember(memberId) {
  const container = document.getElementById('investment-list-container');
  if (!container) return;

  // Get equity holdings from NEW table
  const equityHoldings = window.equityHoldings || [];
  const memberEquityHoldings = equityHoldings.filter(h => h.member_id === memberId).map(h => ({
    symbol_or_name: h.company_name || h.symbol,
    quantity: h.quantity,
    invested_amount: parseFloat(h.invested_amount) || 0,
    current_value: parseFloat(h.current_value) || 0,
    broker_platform: h.broker_platform
  }));

  // Get mutual fund holdings from NEW table
  const mutualFundHoldings = window.mutualFundHoldings || [];
  const memberMutualFundHoldings = mutualFundHoldings.filter(h => h.member_id === memberId).map(h => ({
    symbol_or_name: h.scheme_name,
    quantity: h.units,
    invested_amount: parseFloat(h.invested_amount) || 0,
    current_value: parseFloat(h.current_value) || 0,
    broker_platform: h.broker_platform
  }));

  // Get other investments from OLD table
  const otherInvestments = investments.filter(inv =>
    inv.member_id === memberId &&
    inv.investment_type !== 'equity' &&
    inv.investment_type !== 'mutualFunds'
  );

  // Combine all investments
  const memberInvestments = [...memberEquityHoldings, ...memberMutualFundHoldings, ...otherInvestments];

  // Clear current list.
  container.innerHTML = '';

  if (memberInvestments.length === 0) {
    container.innerHTML = '<p>No investments found for this member.</p>';
    return;
  }

  // Create a simple table
  let html = '<table class="data-table"><thead><tr>' +
    '<th>Symbol</th><th>Quantity</th><th>Invested Amount (₹)</th><th>Current Value (₹)</th><th>Platform</th></tr></thead><tbody>';

  memberInvestments.forEach(inv => {
    html += '<tr>' +
      `<td>${inv.symbol_or_name}</td>` +
      `<td>${inv.quantity || '-'}</td>` +
      `<td>${inv.invested_amount.toFixed(2)}</td>` +
      `<td>${inv.current_value.toFixed(2)}</td>` +
      `<td>${inv.broker_platform || '-'}</td>` +
      '</tr>';
  });

  html += '</tbody></table>';

  container.innerHTML = html;
}


// ===== HELPER FUNCTION TO REFRESH HOLDINGS =====
async function refreshHoldingsFromNewTables() {
    if (!currentUser) {
        console.warn('No user logged in, cannot refresh holdings');
        return;
    }

    try {
        console.log('🔄 Refreshing equity and mutual fund holdings from new tables...');

        // Refresh equity holdings
        if (typeof getEquityHoldings === 'function') {
            const equityHoldings = await getEquityHoldings(currentUser.id);
            window.equityHoldings = equityHoldings;
            console.log(`✅ Refreshed ${equityHoldings.length} equity holdings`);
        }

        // Refresh mutual fund holdings
        if (typeof getMutualFundHoldings === 'function') {
            const mutualFundHoldings = await getMutualFundHoldings(currentUser.id);
            window.mutualFundHoldings = mutualFundHoldings;
            console.log(`✅ Refreshed ${mutualFundHoldings.length} mutual fund holdings`);
        }

        // Refresh the dashboard
        renderStatsOverview();
        renderFamilyMembers();

        console.log('✅ Dashboard refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing holdings:', error);
    }
}

// ===== MAKE FUNCTIONS GLOBALLY AVAILABLE =====
window.refreshHoldingsFromNewTables = refreshHoldingsFromNewTables;
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
// Import functions
window.openImportModal = openImportModal;
window.handleImportFile = handleImportFile;
window.processImport = processImport;
// Additional functions
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

console.log('✅ FamWealth Dashboard app.js loaded - ENHANCED VERSION WITH COMPLETE FEATURES');
console.log('🔧 Ready for initialization');
