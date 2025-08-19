// ===== SUPABASE CONNECTION SETUP =====
// Replace these with your actual Supabase credentials from Day 2
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DATABASE FUNCTIONS =====

// Function to fetch family members from database
async function fetchFamilyMembers() {
    try {
        const { data, error } = await supabase
            .from('family_members')
            .select('*')
            .order('is_primary', { ascending: false });
            
        if (error) throw error;
        console.log('Family members fetched:', data);
        return data || [];
    } catch (error) {
        console.error('Error fetching family members:', error);
        return [];
    }
}

// Function to fetch holdings with member names
async function fetchHoldings() {
    try {
        const { data, error } = await supabase
            .from('holdings')
            .select(`
                *,
                family_members(name, relationship)
            `)
            .order('last_updated', { ascending: false });
            
        if (error) throw error;
        console.log('Holdings fetched:', data);
        return data || [];
    } catch (error) {
        console.error('Error fetching holdings:', error);
        return [];
    }
}

// Function to fetch fixed deposits
async function fetchFixedDeposits() {
    try {
        const { data, error } = await supabase
            .from('fixed_deposits')
            .select(`
                *,
                family_members(name, relationship)
            `)
            .eq('is_active', true)
            .order('maturity_date', { ascending: true });
            
        if (error) throw error;
        console.log('Fixed deposits fetched:', data);
        return data || [];
    } catch (error) {
        console.error('Error fetching fixed deposits:', error);
        return [];
    }
}

// Function to fetch insurance policies
async function fetchInsurancePolicies() {
    try {
        const { data, error } = await supabase
            .from('insurance_policies')
            .select(`
                *,
                family_members(name, relationship)
            `)
            .eq('is_active', true)
            .order('renewal_date', { ascending: true });
            
        if (error) throw error;
        console.log('Insurance policies fetched:', data);
        return data || [];
    } catch (error) {
        console.error('Error fetching insurance policies:', error);
        return [];
    }
}

// Function to fetch bank balances
async function fetchBankBalances() {
    try {
        const { data, error } = await supabase
            .from('bank_balances')
            .select(`
                *,
                family_members(name, relationship)
            `)
            .order('last_updated', { ascending: false });
            
        if (error) throw error;
        console.log('Bank balances fetched:', data);
        return data || [];
    } catch (error) {
        console.error('Error fetching bank balances:', error);
        return [];
    }
}

// ===== DASHBOARD INITIALIZATION =====

// Updated function to load dashboard with real data
async function loadDashboard() {
    try {
        // Show loading indicator
        console.log('Loading dashboard data...');
        
        // Fetch all data from database
        const [familyMembers, holdings, fixedDeposits, insurancePolicies, bankBalances] = await Promise.all([
            fetchFamilyMembers(),
            fetchHoldings(),
            fetchFixedDeposits(),
            fetchInsurancePolicies(),
            fetchBankBalances()
        ]);

        // Calculate totals and update UI
        await updateFamilyOverview(familyMembers, holdings, bankBalances);
        await updateAssetAllocation(holdings, fixedDeposits, bankBalances);
        await updateHoldingsTable(holdings);
        await updateFixedDepositsTable(fixedDeposits);
        await updateInsurancePoliciesTable(insurancePolicies);
        await updateBankBalancesTable(bankBalances);
        
        console.log('Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Show error message to user
        showErrorMessage('Failed to load dashboard data. Please check your connection.');
    }
}

// Function to calculate member totals
function calculateMemberTotals(memberId, holdings, bankBalances) {
    const memberHoldings = holdings.filter(h => h.member_id === memberId);
    const memberBankBalances = bankBalances.filter(b => b.member_id === memberId);
    
    const totalAssets = memberHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0) + 
                       memberBankBalances.reduce((sum, b) => sum + (b.balance || 0), 0);
    
    const totalInvested = memberHoldings.reduce((sum, h) => sum + (h.invested_amount || 0), 0);
    const pnl = totalAssets - totalInvested;
    const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested * 100) : 0;
    
    return { totalAssets, pnl, pnlPercentage };
}

// Function to update family overview cards
async function updateFamilyOverview(familyMembers, holdings, bankBalances) {
    const overviewContainer = document.getElementById('family-overview');
    if (!overviewContainer) return;
    
    let totalFamilyNetWorth = 0;
    
    overviewContainer.innerHTML = familyMembers.map(member => {
        const totals = calculateMemberTotals(member.id, holdings, bankBalances);
        totalFamilyNetWorth += totals.totalAssets;
        
        return `
            <div class="card premium-card">
                <div class="card-header">
                    <div class="member-info">
                        <div class="avatar">
                            <img src="/api/placeholder/40/40" alt="${member.name}" />
                        </div>
                        <div>
                            <h3>${member.name}</h3>
                            <p>${member.relationship}</p>
                        </div>
                    </div>
                </div>
                <div class="card-content">
                    <div class="stat-row">
                        <span>Total Assets:</span>
                        <span class="amount">₹${formatCurrency(totals.totalAssets)}</span>
                    </div>
                    <div class="stat-row">
                        <span>P&L:</span>
                        <span class="amount ${totals.pnl >= 0 ? 'profit' : 'loss'}">
                            ₹${formatCurrency(totals.pnl)} (${totals.pnlPercentage.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Update total family net worth
    const netWorthElement = document.getElementById('total-networth');
    if (netWorthElement) {
        netWorthElement.textContent = `₹${formatCurrency(totalFamilyNetWorth)}`;
    }
}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Function to show error message
function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-message') || document.body;
    errorContainer.innerHTML = `
        <div class="alert alert-error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

// ===== EVENT LISTENERS =====

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    loadDashboard();
});

// Function to show dashboard (called from landing page)
function showDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    loadDashboard();
}
