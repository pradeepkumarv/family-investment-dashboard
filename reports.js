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
        const memberName = member ? member.name : 'Unknown';

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

    document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
    event?.target?.classList.add('active');

    const container = document.getElementById('report-content-container');
    const data = reportData[category] || [];

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="emoji">📊</div>
                <p>No ${getCategoryDisplayName(category)} investments found</p>
            </div>
        `;
        updateReportSummary(category, []);
        return;
    }

    let tableHtml = `
        <div class="table-responsive">
            <table class="data-table" id="report-table">
                <thead>
                    <tr>
                        <th onclick="sortReportTable(0)">Member <span class="sort-indicator"></span></th>
                        <th onclick="sortReportTable(1)">Name <span class="sort-indicator"></span></th>
                        <th onclick="sortReportTable(2)">Invested (₹) <span class="sort-indicator"></span></th>
                        <th onclick="sortReportTable(3)">Current Value (₹) <span class="sort-indicator"></span></th>
                        <th onclick="sortReportTable(4)">Gain/Loss (₹) <span class="sort-indicator"></span></th>
                        <th onclick="sortReportTable(5)">Gain/Loss (%) <span class="sort-indicator"></span></th>
    `;

    if (category === 'equity' || category === 'mutualFunds') {
        tableHtml += `<th onclick="sortReportTable(6)">Platform <span class="sort-indicator"></span></th>`;
    } else if (category === 'fixedDeposits') {
        tableHtml += `<th onclick="sortReportTable(6)">Bank <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(7)">Interest Rate <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(8)">Maturity Date <span class="sort-indicator"></span></th>`;
    } else if (category === 'insurance') {
        tableHtml += `<th onclick="sortReportTable(6)">Company <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(7)">Policy Type <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(8)">Sum Assured <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(9)">Status <span class="sort-indicator"></span></th>`;
    } else if (category === 'gold') {
        tableHtml += `<th onclick="sortReportTable(6)">Quantity (g) <span class="sort-indicator"></span></th>
                      <th onclick="sortReportTable(7)">Rate (₹/g) <span class="sort-indicator"></span></th>`;
    }

    tableHtml += `
                        <th onclick="sortReportTable(10)">Date <span class="sort-indicator"></span></th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(item => {
        const gainClass = item.gain >= 0 ? 'text-green' : 'text-red';
        tableHtml += `
            <tr>
                <td>${item.memberName}</td>
                <td>${item.name}</td>
                <td>₹${formatNumber(item.investedAmount)}</td>
                <td>₹${formatNumber(item.currentValue)}</td>
                <td class="${gainClass}">₹${formatNumber(item.gain)}</td>
                <td class="${gainClass}">${item.gainPercent.toFixed(2)}%</td>
        `;

        if (category === 'equity' || category === 'mutualFunds') {
            tableHtml += `<td>${item.platform}</td>`;
        } else if (category === 'fixedDeposits') {
            const details = item.fd_details || {};
            tableHtml += `
                <td>${details.bank_name || 'N/A'}</td>
                <td>${details.interest_rate ? details.interest_rate + '%' : 'N/A'}</td>
                <td>${details.maturity_date || 'N/A'}</td>
            `;
        } else if (category === 'insurance') {
            const details = item.insurance_details || {};
            tableHtml += `
                <td>${details.company || 'N/A'}</td>
                <td>${details.policy_type || 'N/A'}</td>
                <td>₹${formatNumber(details.sum_assured || 0)}</td>
                <td><span class="status ${details.policy_status === 'Active' ? 'active' : 'inactive'}">${details.policy_status || 'N/A'}</span></td>
            `;
        } else if (category === 'gold') {
            const details = item.gold_details || {};
            tableHtml += `
                <td>${details.quantity_grams || 'N/A'}</td>
                <td>₹${formatNumber(details.rate_per_gram || 0)}</td>
            `;
        }

        tableHtml += `
                <td>${item.date}</td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;
    updateReportSummary(category, data);
}

function updateReportSummary(category, data) {
    const totalInvested = data.reduce((sum, item) => sum + (item.investedAmount || 0), 0);
    const totalCurrent = data.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalGain = totalCurrent - totalInvested;
    const totalGainPercent = totalInvested ? (totalGain / totalInvested * 100) : 0;

    const gainClass = totalGain >= 0 ? 'text-green' : 'text-red';

    document.getElementById('report-summary').innerHTML = `
        <div class="report-summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Investments</div>
                <div class="summary-value">${data.length}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Invested</div>
                <div class="summary-value">₹${formatNumber(totalInvested)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Current Value</div>
                <div class="summary-value">₹${formatNumber(totalCurrent)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Gain/Loss</div>
                <div class="summary-value ${gainClass}">₹${formatNumber(totalGain)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Return (%)</div>
                <div class="summary-value ${gainClass}">${totalGainPercent.toFixed(2)}%</div>
            </div>
        </div>
    `;
}

function sortReportTable(columnIndex) {
    const table = document.getElementById('report-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const sortIndicators = table.querySelectorAll('.sort-indicator');
    sortIndicators.forEach(indicator => indicator.textContent = '');

    const currentIndicator = table.querySelectorAll('th')[columnIndex].querySelector('.sort-indicator');
    const isAscending = currentIndicator.textContent === '▲';

    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].textContent.trim();
        let bValue = b.cells[columnIndex].textContent.trim();

        aValue = aValue.replace(/[₹,%]/g, '').replace(/,/g, '');
        bValue = bValue.replace(/[₹,%]/g, '').replace(/,/g, '');

        if (!isNaN(aValue) && !isNaN(bValue)) {
            return isAscending ? parseFloat(bValue) - parseFloat(aValue) : parseFloat(aValue) - parseFloat(bValue);
        }

        return isAscending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
    });

    currentIndicator.textContent = isAscending ? '▼' : '▲';

    rows.forEach(row => tbody.appendChild(row));
}

function exportReport(format) {
    const data = reportData[currentReportCategory] || [];
    const categoryName = getCategoryDisplayName(currentReportCategory);

    if (data.length === 0) {
        showMessage(`No data to export for ${categoryName}`, 'warning');
        return;
    }

    if (format === 'csv') {
        exportReportCSV(data, categoryName);
    } else if (format === 'json') {
        exportReportJSON(data, categoryName);
    } else if (format === 'pdf') {
        exportReportPDF(data, categoryName);
    }
}

function exportReportCSV(data, categoryName) {
    let csv = 'Member,Name,Invested Amount,Current Value,Gain/Loss,Gain/Loss %,';

    if (currentReportCategory === 'equity' || currentReportCategory === 'mutualFunds') {
        csv += 'Platform,';
    } else if (currentReportCategory === 'fixedDeposits') {
        csv += 'Bank,Interest Rate,Maturity Date,';
    } else if (currentReportCategory === 'insurance') {
        csv += 'Company,Policy Type,Sum Assured,Status,';
    } else if (currentReportCategory === 'gold') {
        csv += 'Quantity (g),Rate (₹/g),';
    }

    csv += 'Date\n';

    data.forEach(item => {
        csv += `"${item.memberName}","${item.name}",${item.investedAmount},${item.currentValue},${item.gain},${item.gainPercent.toFixed(2)},`;

        if (currentReportCategory === 'equity' || currentReportCategory === 'mutualFunds') {
            csv += `"${item.platform}",`;
        } else if (currentReportCategory === 'fixedDeposits') {
            const details = item.fd_details || {};
            csv += `"${details.bank_name || 'N/A'}","${details.interest_rate || 'N/A'}","${details.maturity_date || 'N/A'}",`;
        } else if (currentReportCategory === 'insurance') {
            const details = item.insurance_details || {};
            csv += `"${details.company || 'N/A'}","${details.policy_type || 'N/A'}","${details.sum_assured || 0}","${details.policy_status || 'N/A'}",`;
        } else if (currentReportCategory === 'gold') {
            const details = item.gold_details || {};
            csv += `"${details.quantity_grams || 'N/A'}","${details.rate_per_gram || 0}",`;
        }

        csv += `"${item.date}"\n`;
    });

    downloadFile(csv, `${categoryName}_Report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showMessage(`${categoryName} report exported successfully`, 'success');
}

function exportReportJSON(data, categoryName) {
    const exportData = {
        reportType: categoryName,
        generatedDate: new Date().toISOString(),
        totalItems: data.length,
        data: data
    };

    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, `${categoryName}_Report_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showMessage(`${categoryName} report exported successfully`, 'success');
}

function exportReportPDF(data, categoryName) {
    showMessage('PDF export will open print dialog', 'info');

    const printWindow = window.open('', '_blank');

    let html = `
        <html>
        <head>
            <title>${categoryName} Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2d3748; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #667eea; color: white; }
                .text-green { color: #38a169; }
                .text-red { color: #e53e3e; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${categoryName} Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Investments: ${data.length}</p>

            <table>
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Name</th>
                        <th>Invested (₹)</th>
                        <th>Current (₹)</th>
                        <th>Gain/Loss (₹)</th>
                        <th>Gain/Loss (%)</th>
    `;

    if (currentReportCategory === 'equity' || currentReportCategory === 'mutualFunds') {
        html += '<th>Platform</th>';
    }

    html += `
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(item => {
        const gainClass = item.gain >= 0 ? 'text-green' : 'text-red';
        html += `
            <tr>
                <td>${item.memberName}</td>
                <td>${item.name}</td>
                <td>₹${formatNumber(item.investedAmount)}</td>
                <td>₹${formatNumber(item.currentValue)}</td>
                <td class="${gainClass}">₹${formatNumber(item.gain)}</td>
                <td class="${gainClass}">${item.gainPercent.toFixed(2)}%</td>
        `;

        if (currentReportCategory === 'equity' || currentReportCategory === 'mutualFunds') {
            html += `<td>${item.platform}</td>`;
        }

        html += `
                <td>${item.date}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <br>
            <button onclick="window.print()">Print Report</button>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function getCategoryDisplayName(category) {
    const names = {
        equity: 'Equity',
        mutualFunds: 'Mutual Funds',
        fixedDeposits: 'Fixed Deposits',
        gold: 'Gold',
        insurance: 'Insurance',
        bankBalances: 'Bank Balances',
        immovable: 'Immovable Assets',
        others: 'Others'
    };
    return names[category] || category;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}
