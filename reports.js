// Updated Reports JavaScript with Fixed Table Columns
// Family Investment Dashboard - Reports Module

let currentReportCategory = 'equity';
let reportData = {};

function initializeReports() {
    reportData = {
        equity: [],
        mutualFunds: [],
        fixedDeposits: [],
        gold: [],
        insurance: [],
        bankBalances: [],
        immovable: [],
        others: []
    };
}

function openReportsSection() {
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('reports-section').style.display = 'block';
    generateReportData();
    renderReportCategory('equity');
}

function closeReportsSection() {
    document.getElementById('reports-section').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

function generateReportData() {
    initializeReports();
    
    investments.forEach(investment => {
        const member = familyMembers.find(m => m.id === investment.member_id);
        const memberName = member ? member.name : (investment.member_name || 'Unknown');
        
        const reportItem = {
            id: investment.id,
            memberName: memberName,
            name: investment.symbol_or_name,
            investedAmount: investment.invested_amount || 0,
            currentValue: investment.current_value || investment.invested_amount || 0,
            gain: (investment.current_value || investment.invested_amount || 0) - (investment.invested_amount || 0),
            gainPercent: investment.invested_amount ? 
                (((investment.current_value || investment.invested_amount) - investment.invested_amount) / investment.invested_amount * 100) : 0,
            platform: investment.broker_platform || 'N/A',
            date: investment.created_at ? new Date(investment.created_at).toLocaleDateString() : 'N/A',
            ...investment
        };
        
        const type = investment.investment_type;
        if (reportData[type]) {
            reportData[type].push(reportItem);
        } else {
            reportData.others = reportData.others || [];
            reportData.others.push(reportItem);
        }
    });
}

function renderReportCategory(category) {
    currentReportCategory = category;
    
    // Update active tab
    document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
    event?.target?.classList.add('active');
    
    const container = document.getElementById('report-content-container');
    const data = reportData[category] || [];
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <p>No ${getCategoryDisplayName(category)} investments found</p>
            </div>
        `;
        return;
    }
    
    let tableHtml = `<div class="report-table-wrapper">`;
    
    // Generate table header based on category
    if (category === 'fixedDeposits') {
        tableHtml += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Name</th>
                        <th>Invested (₹)</th>
                        <th>Bank</th>
                        <th>Interest Rate (%)</th>
                        <th>Maturity Date</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.memberName}</td>
                    <td>${item.name}</td>
                    <td>₹${formatNumber(item.investedAmount)}</td>
                    <td>${item.fd_bank_name || item.fdbankname || 'N/A'}</td>
                    <td>${item.fd_interest_rate || item.fdinterestrate || 'N/A'}</td>
                    <td>${item.fd_maturity_date || item.fdmaturitydate || 'N/A'}</td>
                    <td>${item.date}</td>
                </tr>
            `;
        });
    }
    else if (category === 'gold') {
        tableHtml += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Name</th>
                        <th>Invested (₹)</th>
                        <th>Current Value (₹)</th>
                        <th>Quantity (grams)</th>
                        <th>Rate (₹/gram)</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.memberName}</td>
                    <td>${item.name}</td>
                    <td>₹${formatNumber(item.investedAmount)}</td>
                    <td>₹${formatNumber(item.currentValue)}</td>
                    <td>${(item.gold_quantity || item.goldquantity || 0).toFixed(2)}</td>
                    <td>₹${formatNumber(item.gold_rate || item.goldrate || 0)}</td>
                    <td>${item.date}</td>
                </tr>
            `;
        });
    }
    else if (category === 'insurance') {
        tableHtml += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Name</th>
                        <th>Invested (₹)</th>
                        <th>Sum Assured (₹)</th>
                        <th>Premium (₹)</th>
                        <th>Maturity Date</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            tableHtml += `
                <tr>
                    <td>${item.memberName}</td>
                    <td>${item.name}</td>
                    <td>₹${formatNumber(item.investedAmount)}</td>
                    <td>₹${formatNumber(item.sum_assured || item.sumassured || item.insurance_sum_assured || item.insurancesumassured || 0)}</td>
                    <td>₹${formatNumber(item.premium_amount || item.premiumamount || item.insurance_premium || item.insurancepremium || 0)}</td>
                    <td>${item.maturity_date || item.maturitydate || item.insurance_maturity_date || item.insurancematuritydate || 'N/A'}</td>
                    <td>${item.date}</td>
                </tr>
            `;
        });
    }
    else {
        // Default table for equity, mutual funds, etc.
        tableHtml += `
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Name</th>
                        <th>Invested (₹)</th>
                        <th>Current Value (₹)</th>
                        <th>Gain/Loss (₹)</th>
                        <th>Gain/Loss (%)</th>
                        ${category === 'equity' || category === 'mutualFunds' ? '<th>Platform</th>' : ''}
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            const gainClass = item.gain >= 0 ? 'positive' : 'negative';
            tableHtml += `
                <tr>
                    <td>${item.memberName}</td>
                    <td>${item.name}</td>
                    <td>₹${formatNumber(item.investedAmount)}</td>
                    <td>₹${formatNumber(item.currentValue)}</td>
                    <td class="${gainClass}">₹${formatNumber(item.gain)}</td>
                    <td class="${gainClass}">${item.gainPercent.toFixed(2)}%</td>
                    ${category === 'equity' || category === 'mutualFunds' ? `<td>${item.platform}</td>` : ''}
                    <td>${item.date}</td>
                </tr>
            `;
        });
    }
    
    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    // Add summary and export buttons
    const totalInvested = data.reduce((sum, item) => sum + item.investedAmount, 0);
    const totalCurrent = data.reduce((sum, item) => sum + item.currentValue, 0);
    const totalGain = totalCurrent - totalInvested;
    
    let summaryHtml = `
        <div class="report-summary">
            <div class="summary-item">
                <span class="label">Total Investments:</span>
                <span class="value">${data.length}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Invested:</span>
                <span class="value">₹${formatNumber(totalInvested)}</span>
            </div>
    `;
    
    // Only show gain/loss for categories that have them
    if (category !== 'fixedDeposits' && category !== 'insurance') {
        const gainClass = totalGain >= 0 ? 'positive' : 'negative';
        summaryHtml += `
            <div class="summary-item">
                <span class="label">Total Current Value:</span>
                <span class="value">₹${formatNumber(totalCurrent)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Total Gain/Loss:</span>
                <span class="value ${gainClass}">₹${formatNumber(totalGain)}</span>
            </div>
        `;
    } else if (category !== 'insurance') {
        summaryHtml += `
            <div class="summary-item">
                <span class="label">Total Current Value:</span>
                <span class="value">₹${formatNumber(totalCurrent)}</span>
            </div>
        `;
    }
    
    summaryHtml += `
        </div>
        <div class="report-actions">
            <button class="export-btn" onclick="exportToPDF('${category}')">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="export-btn" onclick="exportToCSV('${category}')">
                <i class="fas fa-file-csv"></i> Export CSV
            </button>
        </div>
    `;
    
    container.innerHTML = summaryHtml + tableHtml;
}

function getCategoryDisplayName(category) {
    const names = {
        equity: 'Equity',
        mutualFunds: 'Mutual Fund',
        fixedDeposits: 'Fixed Deposit',
        gold: 'Gold',
        insurance: 'Insurance',
        bankBalances: 'Bank Balance',
        immovable: 'Immovable Property',
        others: 'Other'
    };
    return names[category] || category;
}

function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function exportToPDF(category) {
    const data = reportData[category] || [];
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    
    let content = `${getCategoryDisplayName(category)} Investment Report\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    content += `Total Investments: ${data.length}\n\n`;
    
    // Create table content based on category
    if (category === 'fixedDeposits') {
        content += `Member\tName\tInvested (₹)\tBank\tInterest Rate (%)\tMaturity Date\tDate\n`;
        data.forEach(item => {
            content += `${item.memberName}\t${item.name}\t₹${formatNumber(item.investedAmount)}\t${item.fd_bank_name || item.fdbankname || 'N/A'}\t${item.fd_interest_rate || item.fdinterestrate || 'N/A'}\t${item.fd_maturity_date || item.fdmaturitydate || 'N/A'}\t${item.date}\n`;
        });
    }
    else if (category === 'gold') {
        content += `Member\tName\tInvested (₹)\tCurrent Value (₹)\tQuantity (grams)\tRate (₹/gram)\tDate\n`;
        data.forEach(item => {
            content += `${item.memberName}\t${item.name}\t₹${formatNumber(item.investedAmount)}\t₹${formatNumber(item.currentValue)}\t${(item.gold_quantity || item.goldquantity || 0).toFixed(2)}\t₹${formatNumber(item.gold_rate || item.goldrate || 0)}\t${item.date}\n`;
        });
    }
    else if (category === 'insurance') {
        content += `Member\tName\tInvested (₹)\tSum Assured (₹)\tPremium (₹)\tMaturity Date\tDate\n`;
        data.forEach(item => {
            content += `${item.memberName}\t${item.name}\t₹${formatNumber(item.investedAmount)}\t₹${formatNumber(item.sum_assured || item.sumassured || item.insurance_sum_assured || item.insurancesumassured || 0)}\t₹${formatNumber(item.premium_amount || item.premiumamount || item.insurance_premium || item.insurancepremium || 0)}\t${item.maturity_date || item.maturitydate || item.insurance_maturity_date || item.insurancematuritydate || 'N/A'}\t${item.date}\n`;
        });
    }
    else {
        // Default format with gain/loss
        content += `Member\tName\tInvested (₹)\tCurrent (₹)\tGain/Loss (₹)\tGain/Loss (%)`;
        if (category === 'equity' || category === 'mutualFunds') {
            content += `\tPlatform`;
        }
        content += `\tDate\n`;
        
        data.forEach(item => {
            content += `${item.memberName}\t${item.name}\t₹${formatNumber(item.investedAmount)}\t₹${formatNumber(item.currentValue)}\t₹${formatNumber(item.gain)}\t${item.gainPercent.toFixed(2)}%`;
            if (category === 'equity' || category === 'mutualFunds') {
                content += `\t${item.platform}`;
            }
            content += `\t${item.date}\n`;
        });
    }
    
    // Create a simple text file for now (you can integrate with a PDF library for better formatting)
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getCategoryDisplayName(category)}_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function exportToCSV(category) {
    const data = reportData[category] || [];
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    
    let csvContent = '';
    
    // Create CSV headers based on category
    if (category === 'fixedDeposits') {
        csvContent = 'Member,Name,Invested (₹),Bank,Interest Rate (%),Maturity Date,Date\n';
        data.forEach(item => {
            csvContent += `"${item.memberName}","${item.name}","${item.investedAmount}","${item.fd_bank_name || item.fdbankname || 'N/A'}","${item.fd_interest_rate || item.fdinterestrate || 'N/A'}","${item.fd_maturity_date || item.fdmaturitydate || 'N/A'}","${item.date}"\n`;
        });
    }
    else if (category === 'gold') {
        csvContent = 'Member,Name,Invested (₹),Current Value (₹),Quantity (grams),Rate (₹/gram),Date\n';
        data.forEach(item => {
            csvContent += `"${item.memberName}","${item.name}","${item.investedAmount}","${item.currentValue}","${(item.gold_quantity || item.goldquantity || 0).toFixed(2)}","${item.gold_rate || item.goldrate || 0}","${item.date}"\n`;
        });
    }
    else if (category === 'insurance') {
        csvContent = 'Member,Name,Invested (₹),Sum Assured (₹),Premium (₹),Maturity Date,Date\n';
        data.forEach(item => {
            csvContent += `"${item.memberName}","${item.name}","${item.investedAmount}","${item.sum_assured || item.sumassured || item.insurance_sum_assured || item.insurancesumassured || 0}","${item.premium_amount || item.premiumamount || item.insurance_premium || item.insurancepremium || 0}","${item.maturity_date || item.maturitydate || item.insurance_maturity_date || item.insurancematuritydate || 'N/A'}","${item.date}"\n`;
        });
    }
    else {
        // Default format with gain/loss
        csvContent = 'Member,Name,Invested (₹),Current (₹),Gain/Loss (₹),Gain/Loss (%)';
        if (category === 'equity' || category === 'mutualFunds') {
            csvContent += ',Platform';
        }
        csvContent += ',Date\n';
        
        data.forEach(item => {
            csvContent += `"${item.memberName}","${item.name}","${item.investedAmount}","${item.currentValue}","${item.gain}","${item.gainPercent.toFixed(2)}"`;
            if (category === 'equity' || category === 'mutualFunds') {
                csvContent += `,"${item.platform}"`;
            }
            csvContent += `,"${item.date}"\n`;
        });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getCategoryDisplayName(category)}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}
