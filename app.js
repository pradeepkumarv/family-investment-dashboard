// Sample data from the provided JSON
const sampleData = {
    familyMembers: [
        {
            id: "member-1",
            name: "Rajesh Kumar",
            relationship: "Self",
            avatar: "/api/placeholder/40/40",
            isPrimary: true,
            totalAssets: 550000,
            pnl: 25000,
            pnlPercentage: 4.76,
            accounts: ["HDFC Securities", "HDFC Bank", "Zerodha", "FundsIndia"]
        },
        {
            id: "member-2", 
            name: "Priya Kumar",
            relationship: "Spouse",
            avatar: "/api/placeholder/40/40",
            isPrimary: false,
            totalAssets: 320000,
            pnl: 15000,
            pnlPercentage: 4.92,
            accounts: ["ICICI Securities", "ICICI Bank"]
        },
        {
            id: "member-3",
            name: "Ramesh Kumar",
            relationship: "Father",
            avatar: "/api/placeholder/40/40", 
            isPrimary: false,
            totalAssets: 180000,
            pnl: 5000,
            pnlPercentage: 2.86,
            accounts: ["HDFC Bank"]
        },
        {
            id: "member-4",
            name: "Sunita Kumar", 
            relationship: "Mother",
            avatar: "/api/placeholder/40/40",
            isPrimary: false,
            totalAssets: 210000,
            pnl: 8000,
            pnlPercentage: 3.96,
            accounts: ["HDFC Bank"]
        }
    ],
    assetAllocation: [
        {name: "Equity", value: 504000, color: "#8B5CF6", percentage: 40},
        {name: "Mutual Funds", value: 378000, color: "#10B981", percentage: 30},
        {name: "Fixed Deposits", value: 252000, color: "#F59E0B", percentage: 20},
        {name: "Bank Balance", value: 126000, color: "#3B82F6", percentage: 10}
    ],
    monthlyGrowth: [
        {month: "Mar 24", totalValue: 1180000},
        {month: "Apr 24", totalValue: 1195000},
        {month: "May 24", totalValue: 1210000},
        {month: "Jun 24", totalValue: 1235000},
        {month: "Jul 24", totalValue: 1248000},
        {month: "Aug 24", totalValue: 1260000}
    ],
    equityHoldings: [
        {symbol: "RELIANCE", quantity: 50, investedAmount: 125000, currentValue: 142500, pnl: 17500, memberName: "Rajesh Kumar"},
        {symbol: "TCS", quantity: 30, investedAmount: 108000, currentValue: 118500, pnl: 10500, memberName: "Rajesh Kumar"},
        {symbol: "HDFCBANK", quantity: 40, investedAmount: 72000, currentValue: 78000, pnl: 6000, memberName: "Priya Kumar"},
        {symbol: "INFY", quantity: 25, investedAmount: 42500, currentValue: 47000, pnl: 4500, memberName: "Priya Kumar"}
    ],
    mutualFunds: [
        {fundName: "SBI Bluechip Fund", investedAmount: 150000, currentValue: 168000, pnl: 18000, memberName: "Rajesh Kumar"},
        {fundName: "HDFC Top 100 Fund", investedAmount: 100000, currentValue: 112000, pnl: 12000, memberName: "Rajesh Kumar"},
        {fundName: "ICICI Prudential Value Fund", investedAmount: 80000, currentValue: 86400, pnl: 6400, memberName: "Priya Kumar"}
    ],
    fixedDeposits: [
        {bankName: "HDFC Bank", amount: 200000, interestRate: 7.5, maturityDate: "2026-03-15", memberName: "Ramesh Kumar"},
        {bankName: "SBI", amount: 150000, interestRate: 7.25, maturityDate: "2025-12-20", memberName: "Sunita Kumar"}
    ],
    insurancePolicies: [
        {company: "LIC", policyNumber: "LIC123456", policyType: "Term", premiumAmount: 50000, renewalDate: "2025-04-01", memberName: "Rajesh Kumar"},
        {company: "HDFC Life", policyNumber: "HDFC789012", policyType: "ULIP", premiumAmount: 75000, renewalDate: "2025-06-15", memberName: "Priya Kumar"}
    ],
    bankBalances: [
        {bankName: "HDFC Bank", accountType: "Savings", balance: 45000, memberName: "Rajesh Kumar"},
        {bankName: "ICICI Bank", accountType: "Savings", balance: 32000, memberName: "Priya Kumar"},
        {bankName: "HDFC Bank", accountType: "Savings", balance: 28000, memberName: "Ramesh Kumar"},
        {bankName: "HDFC Bank", accountType: "Savings", balance: 21000, memberName: "Sunita Kumar"}
    ]
};

// Global variables
let currentSection = 'overview';
let assetChart = null;
let growthChart = null;

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

// Navigation functions
function showDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    initializeDashboard();
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    currentSection = sectionName;
}

// Initialize dashboard
function initializeDashboard() {
    renderFamilyMembers();
    renderFamilyManagement();
    renderInvestmentTables();
    initializeCharts();
    setupEventListeners();
}

// Render family members overview
function renderFamilyMembers() {
    const container = document.getElementById('members-grid');
    container.innerHTML = '';
    
    sampleData.familyMembers.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        
        const pnlClass = member.pnl >= 0 ? 'positive' : 'negative';
        const pnlSign = member.pnl >= 0 ? '+' : '';
        
        memberCard.innerHTML = `
            <div class="member-header">
                <div class="member-avatar">${getInitials(member.name)}</div>
                <div class="member-info">
                    <h4>${member.name}</h4>
                    <div class="member-relationship">${member.relationship}</div>
                </div>
            </div>
            <div class="member-stats">
                <div>
                    <div class="member-stat-value">${formatCurrency(member.totalAssets)}</div>
                    <div class="member-pnl ${pnlClass}">
                        ${pnlSign}${formatCurrency(member.pnl)} (${pnlSign}${member.pnlPercentage}%)
                    </div>
                </div>
            </div>
            <div class="member-accounts">
                <div class="accounts-label">Connected Accounts</div>
                <div class="accounts-list">
                    ${member.accounts.map(account => `<span class="account-tag">${account}</span>`).join('')}
                </div>
            </div>
        `;
        
        container.appendChild(memberCard);
    });
}

// Render family management section
function renderFamilyManagement() {
    const container = document.getElementById('family-management-grid');
    container.innerHTML = '';
    
    sampleData.familyMembers.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = 'family-member-card';
        
        memberCard.innerHTML = `
            <div class="family-member-header">
                <div class="member-header">
                    <div class="member-avatar">${getInitials(member.name)}</div>
                    <div class="member-info">
                        <h4>${member.name}</h4>
                        <div class="member-relationship">${member.relationship}</div>
                    </div>
                </div>
                <div class="member-actions">
                    <button class="btn btn--sm btn--outline">Edit</button>
                    ${!member.isPrimary ? '<button class="btn btn--sm btn--outline">Remove</button>' : ''}
                </div>
            </div>
            <div class="member-accounts">
                <div class="accounts-label">Connected Accounts (${member.accounts.length})</div>
                <div class="accounts-list">
                    ${member.accounts.map(account => `<span class="account-tag">${account}</span>`).join('')}
                </div>
            </div>
        `;
        
        container.appendChild(memberCard);
    });
}

// Render investment tables
function renderInvestmentTables() {
    renderEquityTable();
    renderMutualFundsTable();
    renderFixedDepositsTable();
    renderInsuranceTable();
    renderBankBalanceTable();
}

function renderEquityTable() {
    const tbody = document.querySelector('#equity-table tbody');
    tbody.innerHTML = '';
    
    sampleData.equityHoldings.forEach(holding => {
        const row = document.createElement('tr');
        const pnlClass = holding.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        const pnlSign = holding.pnl >= 0 ? '+' : '';
        
        row.innerHTML = `
            <td><strong>${holding.symbol}</strong></td>
            <td>${holding.quantity}</td>
            <td>${formatCurrency(holding.investedAmount)}</td>
            <td>${formatCurrency(holding.currentValue)}</td>
            <td class="${pnlClass}">${pnlSign}${formatCurrency(holding.pnl)}</td>
            <td>${holding.memberName}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderMutualFundsTable() {
    const tbody = document.querySelector('#mutual-funds-table tbody');
    tbody.innerHTML = '';
    
    sampleData.mutualFunds.forEach(fund => {
        const row = document.createElement('tr');
        const pnlClass = fund.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        const pnlSign = fund.pnl >= 0 ? '+' : '';
        
        row.innerHTML = `
            <td><strong>${fund.fundName}</strong></td>
            <td>${formatCurrency(fund.investedAmount)}</td>
            <td>${formatCurrency(fund.currentValue)}</td>
            <td class="${pnlClass}">${pnlSign}${formatCurrency(fund.pnl)}</td>
            <td>${fund.memberName}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderFixedDepositsTable() {
    const tbody = document.querySelector('#fd-table tbody');
    tbody.innerHTML = '';
    
    sampleData.fixedDeposits.forEach(fd => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${fd.bankName}</strong></td>
            <td>${formatCurrency(fd.amount)}</td>
            <td>${fd.interestRate}%</td>
            <td>${formatDate(fd.maturityDate)}</td>
            <td>${fd.memberName}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderInsuranceTable() {
    const tbody = document.querySelector('#insurance-table tbody');
    tbody.innerHTML = '';
    
    sampleData.insurancePolicies.forEach(policy => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${policy.company}</strong></td>
            <td>${policy.policyNumber}</td>
            <td>${policy.policyType}</td>
            <td>${formatCurrency(policy.premiumAmount)}</td>
            <td>${formatDate(policy.renewalDate)}</td>
            <td>${policy.memberName}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function renderBankBalanceTable() {
    const tbody = document.querySelector('#bank-table tbody');
    tbody.innerHTML = '';
    
    sampleData.bankBalances.forEach(bank => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${bank.bankName}</strong></td>
            <td>${bank.accountType}</td>
            <td>${formatCurrency(bank.balance)}</td>
            <td>${bank.memberName}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Initialize charts
function initializeCharts() {
    initializeAssetChart();
    initializeGrowthChart();
}

function initializeAssetChart() {
    const ctx = document.getElementById('assetChart').getContext('2d');
    
    if (assetChart) {
        assetChart.destroy();
    }
    
    assetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sampleData.assetAllocation.map(item => item.name),
            datasets: [{
                data: sampleData.assetAllocation.map(item => item.value),
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const percentage = sampleData.assetAllocation[context.dataIndex].percentage;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function initializeGrowthChart() {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    if (growthChart) {
        growthChart.destroy();
    }
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sampleData.monthlyGrowth.map(item => item.month),
            datasets: [{
                label: 'Portfolio Value',
                data: sampleData.monthlyGrowth.map(item => item.totalValue),
                borderColor: '#1FB8CD',
                backgroundColor: 'rgba(31, 184, 205, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#1FB8CD',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Portfolio Value: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// Event listeners setup
function setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Investment tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            showInvestmentTab(tabName);
        });
    });
    
    // Form submissions
    document.getElementById('add-member-form').addEventListener('submit', handleAddMember);
    document.getElementById('add-investment-form').addEventListener('submit', handleAddInvestment);
}

// Investment tab switching
function showInvestmentTab(tabName) {
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.investment-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Modal functions
function showAddMemberModal() {
    document.getElementById('add-member-modal').classList.remove('hidden');
}

function hideAddMemberModal() {
    document.getElementById('add-member-modal').classList.add('hidden');
    document.getElementById('add-member-form').reset();
}

function showAddInvestmentModal(type) {
    const modal = document.getElementById('add-investment-modal');
    const title = document.getElementById('investment-modal-title');
    const formFields = document.getElementById('investment-form-fields');
    
    // Set modal title and form fields based on investment type
    const config = getInvestmentFormConfig(type);
    title.textContent = config.title;
    formFields.innerHTML = config.fields;
    
    modal.setAttribute('data-investment-type', type);
    modal.classList.remove('hidden');
}

function hideAddInvestmentModal() {
    document.getElementById('add-investment-modal').classList.add('hidden');
    document.getElementById('add-investment-form').reset();
}

function getInvestmentFormConfig(type) {
    const configs = {
        equity: {
            title: 'Add Stock Investment',
            fields: `
                <div class="form-group">
                    <label class="form-label">Stock Symbol</label>
                    <input type="text" class="form-control" name="symbol" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-control" name="quantity" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Invested Amount</label>
                    <input type="number" class="form-control" name="investedAmount" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Current Value</label>
                    <input type="number" class="form-control" name="currentValue" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Member</label>
                    <select class="form-control" name="memberName" required>
                        ${sampleData.familyMembers.map(member => 
                            `<option value="${member.name}">${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `
        },
        'mutual-fund': {
            title: 'Add Mutual Fund Investment',
            fields: `
                <div class="form-group">
                    <label class="form-label">Fund Name</label>
                    <input type="text" class="form-control" name="fundName" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Invested Amount</label>
                    <input type="number" class="form-control" name="investedAmount" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Current Value</label>
                    <input type="number" class="form-control" name="currentValue" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Member</label>
                    <select class="form-control" name="memberName" required>
                        ${sampleData.familyMembers.map(member => 
                            `<option value="${member.name}">${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `
        },
        fd: {
            title: 'Add Fixed Deposit',
            fields: `
                <div class="form-group">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-control" name="bankName" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Amount</label>
                    <input type="number" class="form-control" name="amount" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Interest Rate (%)</label>
                    <input type="number" step="0.01" class="form-control" name="interestRate" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Maturity Date</label>
                    <input type="date" class="form-control" name="maturityDate" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Member</label>
                    <select class="form-control" name="memberName" required>
                        ${sampleData.familyMembers.map(member => 
                            `<option value="${member.name}">${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `
        },
        insurance: {
            title: 'Add Insurance Policy',
            fields: `
                <div class="form-group">
                    <label class="form-label">Insurance Company</label>
                    <input type="text" class="form-control" name="company" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Policy Number</label>
                    <input type="text" class="form-control" name="policyNumber" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Policy Type</label>
                    <select class="form-control" name="policyType" required>
                        <option value="Term">Term</option>
                        <option value="ULIP">ULIP</option>
                        <option value="Endowment">Endowment</option>
                        <option value="Whole Life">Whole Life</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Premium Amount</label>
                    <input type="number" class="form-control" name="premiumAmount" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Renewal Date</label>
                    <input type="date" class="form-control" name="renewalDate" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Member</label>
                    <select class="form-control" name="memberName" required>
                        ${sampleData.familyMembers.map(member => 
                            `<option value="${member.name}">${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `
        },
        bank: {
            title: 'Add Bank Account',
            fields: `
                <div class="form-group">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-control" name="bankName" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Account Type</label>
                    <select class="form-control" name="accountType" required>
                        <option value="Savings">Savings</option>
                        <option value="Current">Current</option>
                        <option value="Salary">Salary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Balance</label>
                    <input type="number" class="form-control" name="balance" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Member</label>
                    <select class="form-control" name="memberName" required>
                        ${sampleData.familyMembers.map(member => 
                            `<option value="${member.name}">${member.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `
        }
    };
    
    return configs[type] || configs.equity;
}

// Form handlers
function handleAddMember(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newMember = {
        id: `member-${Date.now()}`,
        name: formData.get('member-name'),
        relationship: formData.get('member-relationship'),
        avatar: "/api/placeholder/40/40",
        isPrimary: false,
        totalAssets: 0,
        pnl: 0,
        pnlPercentage: 0,
        accounts: []
    };
    
    sampleData.familyMembers.push(newMember);
    renderFamilyMembers();
    renderFamilyManagement();
    hideAddMemberModal();
}

function handleAddInvestment(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const investmentType = document.getElementById('add-investment-modal').getAttribute('data-investment-type');
    
    // Add to appropriate data array based on investment type
    switch(investmentType) {
        case 'equity':
            const newEquity = {
                symbol: formData.get('symbol'),
                quantity: parseInt(formData.get('quantity')),
                investedAmount: parseFloat(formData.get('investedAmount')),
                currentValue: parseFloat(formData.get('currentValue')),
                pnl: parseFloat(formData.get('currentValue')) - parseFloat(formData.get('investedAmount')),
                memberName: formData.get('memberName')
            };
            sampleData.equityHoldings.push(newEquity);
            renderEquityTable();
            break;
            
        case 'mutual-fund':
            const newMF = {
                fundName: formData.get('fundName'),
                investedAmount: parseFloat(formData.get('investedAmount')),
                currentValue: parseFloat(formData.get('currentValue')),
                pnl: parseFloat(formData.get('currentValue')) - parseFloat(formData.get('investedAmount')),
                memberName: formData.get('memberName')
            };
            sampleData.mutualFunds.push(newMF);
            renderMutualFundsTable();
            break;
            
        case 'fd':
            const newFD = {
                bankName: formData.get('bankName'),
                amount: parseFloat(formData.get('amount')),
                interestRate: parseFloat(formData.get('interestRate')),
                maturityDate: formData.get('maturityDate'),
                memberName: formData.get('memberName')
            };
            sampleData.fixedDeposits.push(newFD);
            renderFixedDepositsTable();
            break;
            
        case 'insurance':
            const newInsurance = {
                company: formData.get('company'),
                policyNumber: formData.get('policyNumber'),
                policyType: formData.get('policyType'),
                premiumAmount: parseFloat(formData.get('premiumAmount')),
                renewalDate: formData.get('renewalDate'),
                memberName: formData.get('memberName')
            };
            sampleData.insurancePolicies.push(newInsurance);
            renderInsuranceTable();
            break;
            
        case 'bank':
            const newBank = {
                bankName: formData.get('bankName'),
                accountType: formData.get('accountType'),
                balance: parseFloat(formData.get('balance')),
                memberName: formData.get('memberName')
            };
            sampleData.bankBalances.push(newBank);
            renderBankBalanceTable();
            break;
    }
    
    hideAddInvestmentModal();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up initial event listeners for landing page
    console.log('Family Investment Dashboard initialized');
});