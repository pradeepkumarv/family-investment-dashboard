// ===== FIXED SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

let supabase = null;
let familyData = { members: [], investments: {}, totals: {} };
let editingMemberId = null;
let deletingMemberId = null;

// ===== AUTHENTICATION FUNCTIONS =====
async function testSupabaseConnection() {
    console.log('🔍 TESTING SUPABASE CONNECTION');
    
    if (!window.supabase) {
        console.log('❌ Supabase library not loaded');
        updateAuthStatus('❌ Supabase Library Missing');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.log('❌ Connection test failed:', error);
            updateAuthStatus('❌ Connection Failed');
            return false;
        }
        
        console.log('✅ Supabase connection successful');
        updateAuthStatus('✅ Supabase Connected & Ready');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase setup error:', error);
        updateAuthStatus('❌ Setup Error');
        return false;
    }
}

// FIXED: Login function with proper comparison operators
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }
    
    setLoginLoading(true);
    showMessage('🔄 Authenticating...', 'info');
    
    const supabaseReady = await testSupabaseConnection();
    
    if (supabaseReady) {
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
                return;
            }
            
        } catch (error) {
            console.error('❌ Login exception:', error);
            showMessage(`❌ Login error: ${error.message}`, 'error');
        }
    }
    
    // FIXED: Demo login with === instead of =
    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        localStorage.setItem('famwealth_auth_type', 'demo');
        setTimeout(() => {
            showDashboard();
            updateUserInfo({ email: 'demo@famwealth.com' });
            loadDashboardData();
        }, 1000);
    } else {
        showMessage('❌ Invalid credentials. Try demo@famwealth.com / demo123', 'error');
    }
    
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
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';
        
        if (!supabase) await testSupabaseConnection();
        
        if (!supabase) {
            loadSampleData();
            return;
        }
        
        const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .order('is_primary', { ascending: false });

        if (membersError) {
            console.error('Error loading family members:', membersError);
            loadSampleData();
            return;
        }

        familyData.members = members || [];
        await loadInvestmentsData();
        renderDashboard();
        
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        loadSampleData();
    }
}

function loadSampleData() {
    familyData.members = [
        { id: '1', name: 'Pradeep Kumar', relationship: 'Self', is_primary: true },
        { id: '2', name: 'Priya Kumar', relationship: 'Spouse', is_primary: false },
        { id: '3', name: 'Ramesh Kumar', relationship: 'Father', is_primary: false },
        { id: '4', name: 'Sunita Kumar', relationship: 'Mother', is_primary: false }
    ];
    
    familyData.investments = {
        '1': { holdings: [{ invested_amount: 525000, current_value: 575000 }], fixedDeposits: [], bankBalances: [{ current_balance: 85000 }] },
        '2': { holdings: [{ invested_amount: 300000, current_value: 345000 }], fixedDeposits: [], bankBalances: [{ current_balance: 45000 }] },
        '3': { holdings: [{ invested_amount: 180000, current_value: 185000 }], fixedDeposits: [{ invested_amount: 200000 }], bankBalances: [{ current_balance: 32000 }] },
        '4': { holdings: [], fixedDeposits: [{ invested_amount: 150000 }], bankBalances: [{ current_balance: 78000 }] }
    };
    
    renderDashboard();
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    updateLastUpdated();
}

async function loadInvestmentsData() {
    for (const member of familyData.members) {
        const { data: holdings } = await supabase.from('holdings').select('*').eq('member_id', member.id);
        const { data: fixedDeposits } = await supabase.from('fixed_deposits').select('*').eq('member_id', member.id).eq('is_active', true);
        const { data: bankBalances } = await supabase.from('bank_balances').select('*').eq('member_id', member.id);

        familyData.investments[member.id] = {
            holdings: holdings || [],
            fixedDeposits: fixedDeposits || [],
            bankBalances: bankBalances || []
        };
    }
}

// ===== RENDER FUNCTIONS =====
function calculateTotals() {
    let totalInvested = 0;
    let totalCurrentValue = 0;

    familyData.members.forEach(member => {
        const investments = familyData.investments[member.id] || {};
        
        (investments.holdings || []).forEach(holding => {
            totalInvested += parseFloat(holding.invested_amount || 0);
            totalCurrentValue += parseFloat(holding.current_value || holding.invested_amount || 0);
        });

        (investments.fixedDeposits || []).forEach(fd => {
            totalInvested += parseFloat(fd.invested_amount || 0);
            totalCurrentValue += parseFloat(fd.invested_amount || 0);
        });

        (investments.bankBalances || []).forEach(bank => {
            totalCurrentValue += parseFloat(bank.current_balance || 0);
        });
    });

    const totalPnL = totalCurrentValue - totalInvested;
    const pnlPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrentValue, totalPnL, pnlPercentage };
}

function renderDashboard() {
    const totals = calculateTotals();
    renderStats(totals);
    renderFamilyMembers();
    populateInvestmentMemberDropdown();
}

function renderStats(totals) {
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Family Net Worth</div>
            <div class="stat-value primary">₹${totals.totalCurrentValue.toLocaleString()}</div>
            <div class="stat-change ${totals.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${totals.totalPnL >= 0 ? '+' : ''}₹${totals.totalPnL.toLocaleString()} (${totals.pnlPercentage.toFixed(2)}%)
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Invested</div>
            <div class="stat-value neutral">₹${totals.totalInvested.toLocaleString()}</div>
            <div class="stat-change neutral">Principal Amount</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total P&L</div>
            <div class="stat-value ${totals.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${totals.totalPnL >= 0 ? '+' : ''}₹${totals.totalPnL.toLocaleString()}
            </div>
            <div class="stat-change ${totals.totalPnL >= 0 ? 'positive' : 'negative'}">
                ${totals.pnlPercentage.toFixed(2)}% Returns
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Members</div>
            <div class="stat-value neutral">${familyData.members.length}</div>
            <div class="stat-change neutral">Family Members</div>
        </div>
    `;
    document.getElementById('stats-grid').innerHTML = statsHTML;
}

function renderFamilyMembers() {
    const membersHTML = familyData.members.map(member => {
        const memberTotal = calculateMemberTotal(member.id);
        const avatarColors = ['#007acc', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const avatarColor = avatarColors[familyData.members.indexOf(member) % avatarColors.length];
        
        return `
            <div class="member-card">
                <div class="member-actions">
                    <button class="action-btn edit-btn" onclick="editMember('${member.id}')" title="Edit Member">✏️</button>
                    <button class="action-btn delete-btn" onclick="deleteMember('${member.id}')" title="Delete Member">🗑️</button>
                </div>
                <div class="member-header">
                    <div class="member-avatar" style="background-color: ${avatarColor}">
                        ${member.name.charAt(0)}
                    </div>
                    <div class="member-info">
                        <h4>${member.name} ${member.is_primary ? '👑' : ''}</h4>
                        <div class="member-relationship">${member.relationship}</div>
                    </div>
                </div>
                <div class="member-stats">
                    <div>
                        <div>Total Assets:</div>
                        <div class="member-stat-value">₹${memberTotal.currentValue.toLocaleString()}</div>
                    </div>
                    <div>
                        <div>P&L:</div>
                        <div class="member-pnl ${memberTotal.pnl >= 0 ? 'positive' : 'negative'}">
                            ${memberTotal.pnl >= 0 ? '+' : ''}₹${memberTotal.pnl.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('members-grid').innerHTML = membersHTML;
}

function calculateMemberTotal(memberId) {
    const investments = familyData.investments[memberId] || {};
    let invested = 0;
    let currentValue = 0;

    (investments.holdings || []).forEach(holding => {
        invested += parseFloat(holding.invested_amount || 0);
        currentValue += parseFloat(holding.current_value || holding.invested_amount || 0);
    });

    (investments.fixedDeposits || []).forEach(fd => {
        invested += parseFloat(fd.invested_amount || 0);
        currentValue += parseFloat(fd.invested_amount || 0);
    });

    (investments.bankBalances || []).forEach(bank => {
        currentValue += parseFloat(bank.current_balance || 0);
    });

    const pnl = currentValue - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    return { invested, currentValue, pnl, pnlPercent };
}

// ===== MODAL FUNCTIONS =====
function openAddMemberModal() {
    editingMemberId = null;
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('member-submit-btn').textContent = 'Add Member';
    document.getElementById('member-form').reset();
    document.getElementById('member-modal').classList.remove('hidden');
}

function editMember(memberId) {
    editingMemberId = memberId;
    const member = familyData.members.find(m => m.id === memberId);
    
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    document.getElementById('member-submit-btn').textContent = 'Update Member';
    document.getElementById('member-name').value = member.name;
    document.getElementById('member-relationship').value = member.relationship;
    document.getElementById('member-primary').checked = member.is_primary;
    
    document.getElementById('member-modal').classList.remove('hidden');
}

function deleteMember(memberId) {
    deletingMemberId = memberId;
    const member = familyData.members.find(m => m.id === memberId);
    document.getElementById('delete-message').textContent = `Are you sure you want to delete "${member.name}"?`;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeMemberModal() {
    document.getElementById('member-modal').classList.add('hidden');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
}

function closeAddInvestmentModal() {
    document.getElementById('add-investment-modal').classList.add('hidden');
}

function openAddInvestmentModal() {
    document.getElementById('add-investment-modal').classList.remove('hidden');
}

async function confirmDelete() {
    if (!deletingMemberId) return;

    try {
        if (supabase) {
            await supabase.from('holdings').delete().eq('member_id', deletingMemberId);
            await supabase.from('fixed_deposits').delete().eq('member_id', deletingMemberId);
            await supabase.from('bank_balances').delete().eq('member_id', deletingMemberId);
            
            const { error } = await supabase.from('family_members').delete().eq('id', deletingMemberId);
            if (error) throw error;
        } else {
            familyData.members = familyData.members.filter(m => m.id !== deletingMemberId);
            delete familyData.investments[deletingMemberId];
        }

        showMessage('✅ Family member deleted successfully!', 'success');
        closeDeleteModal();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error deleting member:', error);
        showMessage('❌ Failed to delete member. Please try again.', 'error');
    }
}

function populateInvestmentMemberDropdown() {
    const select = document.getElementById('investment-member');
    select.innerHTML = '<option value="">Select family member...</option>';
    
    familyData.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.name} (${member.relationship})`;
        select.appendChild(option);
    });
}

async function refreshData() {
    await loadDashboardData();
    showMessage('✅ Data refreshed successfully!', 'success');
}

function exportData() {
    showMessage('📊 Export functionality coming soon!', 'info');
}

// ===== UTILITY FUNCTIONS =====
function updateAuthStatus(status) {
    const element = document.getElementById('auth-status');
    if (element) element.textContent = status;
}

function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function updateUserInfo(user) {
    const element = document.getElementById('user-display');
    if (element) element.textContent = user.email.split('@')[0];
}

function setLoginLoading(loading) {
    const btn = document.getElementById('login-btn');
    const text = document.getElementById('login-text');
    const spinner = document.getElementById('login-spinner');
    
    if (btn && text && spinner) {
        if (loading) {
            btn.disabled = true;
            text.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            btn.disabled = false;
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('login-message');
    if (!messageDiv) return;
    
    messageDiv.style.display = 'block';
    messageDiv.textContent = text;
    
    if (type === 'success') {
        messageDiv.style.background = '#d1fae5';
        messageDiv.style.borderColor = '#10b981';
        messageDiv.style.color = '#065f46';
    } else if (type === 'info') {
        messageDiv.style.background = '#dbeafe';
        messageDiv.style.borderColor = '#3b82f6';
        messageDiv.style.color = '#1d4ed8';
    } else {
        messageDiv.style.background = '#fee';
        messageDiv.style.borderColor = '#f87171';
        messageDiv.style.color = '#dc2626';
    }
    
    if (type !== 'info') {
        setTimeout(() => messageDiv.style.display = 'none', 4000);
    }
}

function updateLastUpdated() {
    const element = document.getElementById('last-updated');
    if (element) element.textContent = new Date().toLocaleString();
}

async function checkExistingLogin() {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'supabase' && await testSupabaseConnection()) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                showDashboard();
                updateUserInfo(user);
                loadDashboardData();
                return;
            }
        } catch (error) {
            console.log('No existing session found');
        }
    }
    
    if (authType === 'demo') {
        showDashboard();
        updateUserInfo({ email: 'demo@famwealth.com' });
        loadDashboardData();
    }
}

// ===== EVENT HANDLERS =====
// FIXED: Enter key login with === instead of =
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const email = document.getElementById('login-email');
        const password = document.getElementById('login-password');
        if (document.activeElement === email || document.activeElement === password) {
            handleLogin();
        }
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    await testSupabaseConnection();
    checkExistingLogin();

    // Member form handler
    document.getElementById('member-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const memberData = {
            name: document.getElementById('member-name').value,
            relationship: document.getElementById('member-relationship').value,
            is_primary: document.getElementById('member-primary').checked,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('member-name').value)}&background=007acc&color=fff`
        };
        
        try {
            if (supabase) {
                if (editingMemberId) {
                    const { error } = await supabase.from('family_members').update(memberData).eq('id', editingMemberId);
                    if (error) throw error;
                    showMessage('✅ Family member updated successfully!', 'success');
                } else {
                    const { error } = await supabase.from('family_members').insert([memberData]);
                    if (error) throw error;
                    showMessage('✅ Family member added successfully!', 'success');
                }
            } else {
                // Demo mode
                if (editingMemberId) {
                    const memberIndex = familyData.members.findIndex(m => m.id === editingMemberId);
                    if (memberIndex !== -1) {
                        familyData.members[memberIndex] = { ...familyData.members[memberIndex], ...memberData };
                    }
                } else {
                    const newId = Date.now().toString();
                    familyData.members.push({ id: newId, ...memberData });
                    familyData.investments[newId] = { holdings: [], fixedDeposits: [], bankBalances: [] };
                }
                showMessage('✅ Family member added successfully! (Demo mode)', 'success');
            }
            
            closeMemberModal();
            await loadDashboardData();
            
        } catch (error) {
            console.error('Error saving member:', error);
            showMessage('❌ Failed to save member. Please try again.', 'error');
        }
    });

    // FIXED: Investment form handler - removed generated columns
    document.getElementById('add-investment-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            member_id: document.getElementById('investment-member').value,
            type: document.getElementById('investment-type').value,
            name: document.getElementById('investment-name').value,
            invested_amount: parseFloat(document.getElementById('investment-amount').value),
            current_value: parseFloat(document.getElementById('investment-current-value').value) || null
        };
        
        try {
            if (supabase) {
                if (formData.type === 'equity' || formData.type === 'mutual_fund') {
                    // DON'T insert profit_loss or profit_loss_percentage - they're auto-calculated
                    const { error } = await supabase.from('holdings').insert([{
                        member_id: formData.member_id,
                        asset_type: formData.type === 'equity' ? 'Equity' : 'Mutual Fund',
                        symbol_or_name: formData.name,
                        invested_amount: formData.invested_amount,
                        current_value: formData.current_value || formData.invested_amount
                    }]);
                    if (error) throw error;
                } else if (formData.type === 'fixed_deposit') {
                    const { error } = await supabase.from('fixed_deposits').insert([{
                        member_id: formData.member_id,
                        institution_name: formData.name,
                        invested_amount: formData.invested_amount,
                        is_active: true
                    }]);
                    if (error) throw error;
                }
            } else {
                // Demo mode
                const investments = familyData.investments[formData.member_id] || { holdings: [], fixedDeposits: [], bankBalances: [] };
                if (formData.type === 'equity' || formData.type === 'mutual_fund') {
                    investments.holdings.push({
                        symbol_or_name: formData.name,
                        invested_amount: formData.invested_amount,
                        current_value: formData.current_value || formData.invested_amount
                    });
                }
                familyData.investments[formData.member_id] = investments;
            }
            
            showMessage('✅ Investment added successfully!', 'success');
            closeAddInvestmentModal();
            await loadDashboardData();
            
        } catch (error) {
            console.error('Error adding investment:', error);
            showMessage('❌ Failed to add investment. Please try again.', '
