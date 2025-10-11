// Database Helper Functions for Asset Management
// Handles CRUD operations for all asset types with import date tracking

// ===== SUPABASE CLIENT =====
let supabaseClient = null;

function initializeSupabaseClient(client) {
    supabaseClient = client;
}

// ===== EQUITY HOLDINGS =====

async function deleteEquityHoldingsByBrokerAndMember(userId, brokerId, memberId) {
    const { error } = await supabaseClient
        .from('equity_holdings')
        .delete()
        .eq('user_id', userId)
        .eq('broker_platform', brokerId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertEquityHoldings(holdings) {
    const { data, error } = await supabaseClient
        .from('equity_holdings')
        .insert(holdings)
        .select();

    if (error) throw error;
    return data;
}

async function getEquityHoldings(userId, memberId = null) {
    let query = supabaseClient
        .from('equity_holdings')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== MUTUAL FUND HOLDINGS =====

async function deleteMutualFundHoldingsByBrokerAndMember(userId, brokerId, memberId) {
    const { error } = await supabaseClient
        .from('mutual_fund_holdings')
        .delete()
        .eq('user_id', userId)
        .eq('broker_platform', brokerId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertMutualFundHoldings(holdings) {
    const { data, error } = await supabaseClient
        .from('mutual_fund_holdings')
        .insert(holdings)
        .select();

    if (error) throw error;
    return data;
}

async function getMutualFundHoldings(userId, memberId = null) {
    let query = supabaseClient
        .from('mutual_fund_holdings')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== FIXED DEPOSITS =====

async function deleteFixedDepositsByMember(userId, memberId) {
    const { error } = await supabaseClient
        .from('fixed_deposits')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertFixedDeposits(deposits) {
    const { data, error } = await supabaseClient
        .from('fixed_deposits')
        .insert(deposits)
        .select();

    if (error) throw error;
    return data;
}

async function getFixedDeposits(userId, memberId = null) {
    let query = supabaseClient
        .from('fixed_deposits')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== INSURANCE POLICIES =====

async function deleteInsurancePoliciesByMember(userId, memberId) {
    const { error } = await supabaseClient
        .from('insurance_policies')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertInsurancePolicies(policies) {
    const { data, error } = await supabaseClient
        .from('insurance_policies')
        .insert(policies)
        .select();

    if (error) throw error;
    return data;
}

async function getInsurancePolicies(userId, memberId = null) {
    let query = supabaseClient
        .from('insurance_policies')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== GOLD HOLDINGS =====

async function deleteGoldHoldingsByMember(userId, memberId) {
    const { error } = await supabaseClient
        .from('gold_holdings')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertGoldHoldings(holdings) {
    const { data, error } = await supabaseClient
        .from('gold_holdings')
        .insert(holdings)
        .select();

    if (error) throw error;
    return data;
}

async function getGoldHoldings(userId, memberId = null) {
    let query = supabaseClient
        .from('gold_holdings')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== BANK ACCOUNTS =====

async function deleteBankAccountsByMember(userId, memberId) {
    const { error } = await supabaseClient
        .from('bank_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertBankAccounts(accounts) {
    const { data, error } = await supabaseClient
        .from('bank_accounts')
        .insert(accounts)
        .select();

    if (error) throw error;
    return data;
}

async function getBankAccounts(userId, memberId = null) {
    let query = supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== OTHER ASSETS =====

async function deleteOtherAssetsByMember(userId, memberId) {
    const { error } = await supabaseClient
        .from('other_assets')
        .delete()
        .eq('user_id', userId)
        .eq('member_id', memberId);

    if (error) throw error;
}

async function insertOtherAssets(assets) {
    const { data, error } = await supabaseClient
        .from('other_assets')
        .insert(assets)
        .select();

    if (error) throw error;
    return data;
}

async function getOtherAssets(userId, memberId = null) {
    let query = supabaseClient
        .from('other_assets')
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false });

    if (memberId) {
        query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ===== FAMILY MEMBERS =====

async function getFamilyMembers(userId) {
    const { data, error } = await supabaseClient
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
}

async function insertFamilyMember(member) {
    const { data, error } = await supabaseClient
        .from('family_members')
        .insert([member])
        .select();

    if (error) throw error;
    return data[0];
}

async function updateFamilyMember(memberId, updates) {
    const { data, error } = await supabaseClient
        .from('family_members')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .select();

    if (error) throw error;
    return data[0];
}

async function deleteFamilyMember(memberId) {
    const { error } = await supabaseClient
        .from('family_members')
        .delete()
        .eq('id', memberId);

    if (error) throw error;
}

// ===== ANALYTICS FUNCTIONS =====

async function getAssetHistoryByDate(userId, assetType, startDate, endDate) {
    const tableMap = {
        'equity': 'equity_holdings',
        'mutualFunds': 'mutual_fund_holdings',
        'fixedDeposits': 'fixed_deposits',
        'insurance': 'insurance_policies',
        'gold': 'gold_holdings',
        'bank': 'bank_accounts',
        'other': 'other_assets'
    };

    const tableName = tableMap[assetType];
    if (!tableName) throw new Error('Invalid asset type');

    const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .gte('import_date', startDate)
        .lte('import_date', endDate)
        .order('import_date', { ascending: true });

    if (error) throw error;
    return data;
}

async function getLatestAssetsByType(userId, assetType) {
    const tableMap = {
        'equity': 'equity_holdings',
        'mutualFunds': 'mutual_fund_holdings',
        'fixedDeposits': 'fixed_deposits',
        'insurance': 'insurance_policies',
        'gold': 'gold_holdings',
        'bank': 'bank_accounts',
        'other': 'other_assets'
    };

    const tableName = tableMap[assetType];
    if (!tableName) throw new Error('Invalid asset type');

    const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('import_date', { ascending: false })
        .limit(100);

    if (error) throw error;

    // Get only the latest import_date records
    if (data.length === 0) return [];

    const latestDate = data[0].import_date;
    return data.filter(item => item.import_date === latestDate);
}

// Export all functions
window.dbHelpers = {
    initializeSupabaseClient,

    // Equity
    deleteEquityHoldingsByBrokerAndMember,
    insertEquityHoldings,
    getEquityHoldings,

    // Mutual Funds
    deleteMutualFundHoldingsByBrokerAndMember,
    insertMutualFundHoldings,
    getMutualFundHoldings,

    // Fixed Deposits
    deleteFixedDepositsByMember,
    insertFixedDeposits,
    getFixedDeposits,

    // Insurance
    deleteInsurancePoliciesByMember,
    insertInsurancePolicies,
    getInsurancePolicies,

    // Gold
    deleteGoldHoldingsByMember,
    insertGoldHoldings,
    getGoldHoldings,

    // Bank
    deleteBankAccountsByMember,
    insertBankAccounts,
    getBankAccounts,

    // Other Assets
    deleteOtherAssetsByMember,
    insertOtherAssets,
    getOtherAssets,

    // Family Members
    getFamilyMembers,
    insertFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,

    // Analytics
    getAssetHistoryByDate,
    getLatestAssetsByType
};

// Also export commonly used functions globally for easier access
window.initializeSupabaseClient = initializeSupabaseClient;
window.getEquityHoldings = getEquityHoldings;
window.getMutualFundHoldings = getMutualFundHoldings;
window.getFixedDeposits = getFixedDeposits;
window.getInsurancePolicies = getInsurancePolicies;
window.getGoldHoldings = getGoldHoldings;
window.getBankAccounts = getBankAccounts;
window.getOtherAssets = getOtherAssets;

console.log('Database helpers loaded successfully');
