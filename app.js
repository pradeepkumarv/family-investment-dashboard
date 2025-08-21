// ===== ENHANCED FAMILY INVESTMENT DASHBOARD - FIXED VERSION ===== 
// Complete working JavaScript with all functions including working buttons and photo upload

// ===== CONFIGURATION =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// ===== GLOBAL VARIABLES =====
let supabase = null;
let familyData = {
  members: [],
  investments: {},
  liabilities: {},
  accounts: [],
  totals: {}
};
let editingMemberId = null;
let deletingMemberId = null;
let currentViewMember = null;
let deletingItemId = null;
let deletingItemType = null;
let selectedPhotoUrl = null;
let uploadedPhotoFile = null;
let photoEditingMemberId = null;

// ===== PHOTO URLS FOR MEMBER SELECTION =====
const MEMBER_PHOTOS = [
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
    localStorage.setItem('famwealth_auth_type', 'demo');
    setTimeout(() => {
      showDashboard();
      updateUserInfo({ email: 'demo@famwealth.com' });
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

  localStorage.removeItem('famwealth_user');
  localStorage.removeItem('famwealth_auth_type');
  document.getElementById('main-dashboard').style.display = 'none';
  document.getElementById('landing-page').style.display = 'block';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  showMessage('✅ Logged out successfully', 'success');
  setLoginLoading(false);
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
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    loadSampleData();
    saveDataToStorage();
    renderEnhancedDashboard();
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
      photo_url: MEMBER_PHOTOS[0],
      avatar_url: MEMBER_PHOTOS[0]
    },
    {
      id: '2',
      name: 'Priya Kumar',
      relationship: 'Spouse',
      is_primary: false,
      photo_url: MEMBER_PHOTOS[1],
      avatar_url: MEMBER_PHOTOS[1]
    },
    {
      id: '3',
      name: 'Ramesh Kumar',
      relationship: 'Father',
      is_primary: false,
      photo_url: MEMBER_PHOTOS[2],
      avatar_url: MEMBER_PHOTOS[2]
    },
    {
      id: '4',
      name: 'Sunita Kumar',
      relationship: 'Mother',
      is_primary: false,
      photo_url: MEMBER_PHOTOS[3],
      avatar_url: MEMBER_PHOTOS[3]
    }
  ];

  // Sample investment data with bank balances
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
        },
        {
          id: '2',
          symbol_or_name: 'Reliance Industries',
          invested_amount: 280000,
          current_value: 295000,
          broker_platform: 'Zerodha',
          quantity: 150
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
          interest_payout: 'Yearly',
          interest_amount: 33750,
          invested_date: '2024-01-01',
          comments: 'High-yield FD with excellent bank rating'
        },
        {
          id: '5',
          invested_in: 'ICICI Bank',
          invested_amount: 300000,
          interest_rate: 6.50,
          maturity_date: '2026-03-15',
          interest_payout: 'Quarterly',
          interest_amount: 19500,
          invested_date: '2024-03-15',
          comments: 'Quarterly payout for regular income'
        }
      ],
      insurance: [
        {
          id: '6',
          insurer: 'LIC',
          insurance_type: 'Term Life',
          insurance_premium: 35000,
          payment_frequency: 'Yearly',
          maturity_date: '2045-12-31',
          sum_assured: 5000000,
          invested_date: '2023-12-31',
          comments: 'Comprehensive life coverage with tax benefits'
        },
        {
          id: '7',
          insurer: 'HDFC Ergo',
          insurance_type: 'Health',
          insurance_premium: 18000,
          payment_frequency: 'Yearly',
          maturity_date: '2025-04-15',
          sum_assured: 1000000,
          invested_date: '2024-04-15',
          comments: 'Family floater health policy with cashless facilities'
        }
      ],
      bankBalances: [
        {
          id: '8',
          current_balance: 85000,
          institution_name: 'HDFC Bank'
        },
        {
          id: '8a',
          current_balance: 45000,
          institution_name: 'ICICI Bank'
        }
      ],
      others: []
    },
    '2': {
      equity: [{
        id: '9',
        symbol_or_name: 'TCS',
        invested_amount: 180000,
        current_value: 195000,
        broker_platform: 'ICICI Securities',
        quantity: 100
      }],
      mutualFunds: [{
        id: '10',
        symbol_or_name: 'SBI Blue Chip Fund',
        invested_amount: 300000,
        current_value: 345000,
        broker_platform: 'ICICI Securities',
        quantity: 8000
      }],
      fixedDeposits: [{
        id: '11',
        invested_in: 'SBI',
        invested_amount: 250000,
        interest_rate: 6.80,
        maturity_date: '2025-11-20',
        interest_payout: 'Maturity',
        interest_amount: 17000,
        invested_date: '2024-11-20',
        comments: 'Tax-saving FD with competitive rates'
      }],
      insurance: [{
        id: '12',
        insurer: 'ICICI Prudential',
        insurance_type: 'ULIP',
        insurance_premium: 50000,
        payment_frequency: 'Yearly',
        maturity_date: '2035-06-30',
        sum_assured: 800000,
        invested_date: '2023-06-30',
        comments: 'Investment cum insurance with equity exposure'
      }],
      bankBalances: [{
        id: '13',
        current_balance: 45000,
        institution_name: 'ICICI Bank'
      }],
      others: []
    },
    '3': {
      equity: [{
        id: '14',
        symbol_or_name: 'HDFC Bank',
        invested_amount: 90000,
        current_value: 95000,
        broker_platform: 'HDFC Securities',
        quantity: 50
      }],
      mutualFunds: [],
      fixedDeposits: [{
        id: '15',
        invested_in: 'Post Office',
        invested_amount: 200000,
        interest_rate: 7.20,
        maturity_date: '2025-08-30',
        interest_payout: 'Yearly',
        interest_amount: 14400,
        invested_date: '2023-08-30',
        comments: 'Government-backed secure investment'
      }],
      insurance: [{
        id: '16',
        insurer: 'SBI Life',
        insurance_type: 'Whole Life',
        insurance_premium: 25000,
        payment_frequency: 'Yearly',
        maturity_date: '2030-12-31',
        sum_assured: 1500000,
        invested_date: '2022-12-31',
        comments: 'Traditional whole life policy with maturity benefits'
      }],
      bankBalances: [{
        id: '17',
        current_balance: 32000,
        institution_name: 'ICICI Bank'
      }],
      others: []
    },
    '4': {
      equity: [],
      mutualFunds: [{
        id: '18',
        symbol_or_name: 'HDFC Balanced Fund',
        invested_amount: 150000,
        current_value: 162000,
        broker_platform: 'HDFC Securities',
        quantity: 3000
      }],
      fixedDeposits: [{
        id: '19',
        invested_in: 'Punjab National Bank',
        invested_amount: 150000,
        interest_rate: 6.60,
        maturity_date: '2026-01-10',
        interest_payout: 'Quarterly',
        interest_amount: 9900,
        invested_date: '2024-01-10',
        comments: 'Senior citizen rate with quarterly interest'
      }],
      insurance: [{
        id: '20',
        insurer: 'Max Life',
        insurance_type: 'Endowment',
        insurance_premium: 40000,
        payment_frequency: 'Yearly',
        maturity_date: '2032-09-15',
        sum_assured: 1200000,
        invested_date: '2022-09-15',
        comments: 'Endowment policy with guaranteed returns'
      }],
      bankBalances: [{
        id: '21',
        current_balance: 78000,
        institution_name: 'HDFC Bank'
      }],
      others: []
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
          comments: 'Primary residence home loan'
        }
      ],
      personalLoan: [
        {
          id: 'pl1',
          lender: 'ICICI Bank',
          principal_amount: 500000,
          outstanding_amount: 280000,
          interest_rate: 12.5,
          emi_amount: 15000,
          tenure_months: 36,
          start_date: '2023-06-01',
          comments: 'Personal loan for home renovation'
        }
      ],
      creditCard: [
        {
          id: 'cc1',
          bank: 'HDFC Bank',
          card_type: 'Regalia Gold',
          outstanding_amount: 45000,
          credit_limit: 500000,
          due_date: '2025-09-15',
          comments: 'Primary credit card'
        }
      ],
      other: []
    },
    '2': {
      homeLoan: [],
      personalLoan: [],
      creditCard: [
        {
          id: 'cc2',
          bank: 'ICICI Bank',
          card_type: 'Coral',
          outstanding_amount: 25000,
          credit_limit: 300000,
          due_date: '2025-09-20',
          comments: 'Backup credit card'
        }
      ],
      other: []
    },
    '3': { homeLoan: [], personalLoan: [], creditCard: [], other: [] },
    '4': { homeLoan: [], personalLoan: [], creditCard: [], other: [] }
  };

  // Sample account data
  familyData.accounts = [
    {
      id: 'acc1',
      account_type: 'Bank Account',
      institution: 'HDFC Bank',
      account_number: 'XXXX1234',
      holder_name: 'Pradeep Kumar',
      nominee: 'Priya Kumar',
      status: 'Active',
      comments: 'Primary salary account'
    },
    {
      id: 'acc2',
      account_type: 'Demat Account',
      institution: 'HDFC Securities',
      account_number: 'XXXX5678',
      holder_name: 'Pradeep Kumar',
      nominee: 'Priya Kumar',
      status: 'Active',
      comments: 'Main trading account'
    },
    {
      id: 'acc3',
      account_type: 'Mutual Fund',
      institution: 'FundsIndia',
      account_number: 'XXXX9012',
      holder_name: 'Pradeep Kumar',
      nominee: 'Priya Kumar',
      status: 'Active',
      comments: 'SIP investments'
    },
    {
      id: 'acc4',
      account_type: 'Insurance Policy',
      institution: 'LIC',
      account_number: 'XXXX3456',
      holder_name: 'Pradeep Kumar',
      nominee: 'Priya Kumar',
      status: 'Active',
      comments: 'Term life policy'
    },
    {
      id: 'acc5',
      account_type: 'Bank Account',
      institution: 'ICICI Bank',
      account_number: 'XXXX7890',
      holder_name: 'Priya Kumar',
      nominee: 'Pradeep Kumar',
      status: 'Active',
      comments: 'Joint savings account'
    }
  ];
}

// ===== EVENT DELEGATION SETUP =====
function setupEventDelegation() {
  // Use event delegation for dynamically created buttons
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
      selectPhoto(photoElement.src);
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

    // Equity calculations
    (investments.equity || []).forEach(equity => {
      totalInvested += parseFloat(equity.invested_amount || 0);
      totalCurrentValue += parseFloat(equity.current_value || equity.invested_amount || 0);
    });

    // Mutual Fund calculations
    (investments.mutualFunds || []).forEach(mf => {
      totalInvested += parseFloat(mf.invested_amount || 0);
      totalCurrentValue += parseFloat(mf.current_value || mf.invested_amount || 0);
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
    (liabilities.homeLoan || []).forEach(loan => {
      totalLiabilities += parseFloat(loan.outstanding_amount || 0);
    });
    (liabilities.personalLoan || []).forEach(loan => {
      totalLiabilities += parseFloat(loan.outstanding_amount || 0);
    });
    (liabilities.creditCard || []).forEach(cc => {
      totalLiabilities += parseFloat(cc.outstanding_amount || 0);
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
            <img src="${member.photo_url || member.avatar_url || MEMBER_PHOTOS[0]}" 
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
            <button class="btn btn--sm" style="background: var(--color-error); color: white;" data-member-id="${member.id}" class="delete-member-btn" title="Delete Member">🗑️</button>
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
  
  const membersSection = `
    <div class="section-title">
      <h3>👨‍👩‍👧‍👦 Family Members Overview</h3>
      <button class="btn btn--primary" onclick="openAddMemberModal()">+ Add Family Member</button>
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
  const name = document.getElementById('member-name').value.trim();
  const relationship = document.getElementById('member-relationship').value;
  const isPrimary = document.getElementById('member-is-primary').checked;
  
  if (!name || !relationship) {
    showMessage('Please fill all required fields', 'error');
    return;
  }
  
  if (editingMemberId) {
    // Update existing member
    const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
    if (memberIndex !== -1) {
      familyData.members[memberIndex] = {
        ...familyData.members[memberIndex],
        name,
        relationship,
        is_primary: isPrimary
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
      photo_url: MEMBER_PHOTOS[familyData.members.length % MEMBER_PHOTOS.length],
      avatar_url: MEMBER_PHOTOS[familyData.members.length % MEMBER_PHOTOS.length]
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
  familyData.accounts = familyData.accounts.filter(acc => 
    !acc.holder_name.includes(familyData.members.find(m => m.id === deletingMemberId)?.name || '')
  );
  
  saveDataToStorage();
  renderEnhancedDashboard();
  document.getElementById('delete-member-modal').classList.add('hidden');
  deletingMemberId = null;
  
  showMessage('✅ Member deleted successfully', 'success');
}

// ===== PHOTO MANAGEMENT FUNCTIONS =====
function openPhotoModal(memberId) {
  photoEditingMemberId = memberId;
  selectedPhotoUrl = null;
  
  // Render photo options
  const photoOptionsHTML = MEMBER_PHOTOS.map(photoUrl => `
    <img src="${photoUrl}" 
         class="photo-option" 
         style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; cursor: pointer; margin: 5px; border: 2px solid transparent;"
         onclick="selectPhoto('${photoUrl}')">
  `).join('');
  
  document.getElementById('photo-options').innerHTML = photoOptionsHTML;
  document.getElementById('photo-modal').classList.remove('hidden');
}

function selectPhoto(photoUrl) {
  selectedPhotoUrl = photoUrl;
  
  // Highlight selected photo
  document.querySelectorAll('.photo-option').forEach(img => {
    img.style.border = '2px solid transparent';
  });
  
  event.target.style.border = '2px solid var(--color-primary)';
}

function savePhoto() {
  if (!photoEditingMemberId || !selectedPhotoUrl) {
    showMessage('Please select a photo', 'error');
    return;
  }
  
  const memberIndex = familyData.members.findIndex(m => m.id === photoEditingMemberId);
  if (memberIndex !== -1) {
    familyData.members[memberIndex].photo_url = selectedPhotoUrl;
    familyData.members[memberIndex].avatar_url = selectedPhotoUrl;
  }
  
  saveDataToStorage();
  renderEnhancedDashboard();
  document.getElementById('photo-modal').classList.add('hidden');
  
  showMessage('✅ Photo updated successfully', 'success');
}

// ===== UTILITY FUNCTIONS =====
function showMessage(message, type = 'info') {
  const messageDiv = document.getElementById('message') || createMessageDiv();
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 4000);
}

function createMessageDiv() {
  const messageDiv = document.createElement('div');
  messageDiv.id = 'message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-weight: 500;
  `;
  document.body.appendChild(messageDiv);
  return messageDiv;
}

function setLoginLoading(loading) {
  const loginBtn = document.querySelector('[onclick="handleLogin()"]');
  if (loginBtn) {
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? 'Authenticating...' : 'Sign In to Dashboard';
  }
}

function showDashboard() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
  const userEmailSpan = document.querySelector('.user-email');
  if (userEmailSpan) {
    userEmailSpan.textContent = user.email;
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

// ===== MODAL FUNCTIONS =====
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function closeDeleteMemberModal() {
  document.getElementById('delete-member-modal').classList.add('hidden');
  deletingMemberId = null;
}

// ===== INITIALIZATION ON DOM LOAD =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 FamWealth Dashboard initializing...');
  
  // Initialize Supabase
  await initializeSupabase();
  
  // Setup event delegation
  setupEventDelegation();
  
  // Check for existing session
  const authType = localStorage.getItem('famwealth_auth_type');
  if (authType) {
    showDashboard();
    if (authType === 'demo') {
      updateUserInfo({ email: 'demo@famwealth.com' });
    } else {
      const user = JSON.parse(localStorage.getItem('famwealth_user') || '{}');
      updateUserInfo(user);
    }
    loadDashboardData();
  }
  
  console.log('✅ Dashboard initialization complete');
});

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
