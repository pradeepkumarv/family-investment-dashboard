// ===== BASIC NAVIGATION FUNCTIONS =====

// Function to show the main dashboard (called by Get Started button)
function showDashboard() {
    console.log('showDashboard() called');
    
    try {
        // Hide landing page
        const landingPage = document.getElementById('landing-page');
        const mainDashboard = document.getElementById('main-dashboard');
        
        if (landingPage && mainDashboard) {
            landingPage.classList.add('hidden');
            mainDashboard.classList.remove('hidden');
            console.log('✅ Dashboard shown successfully');
            
            // Load dashboard data
            loadDashboard();
        } else {
            console.error('❌ Dashboard elements not found');
        }
        
    } catch (error) {
        console.error('❌ Error showing dashboard:', error);
        alert('Error loading dashboard: ' + error.message);
    }
}

// ===== DASHBOARD DATA LOADING =====

function loadDashboard() {
    console.log('Loading dashboard...');
    
    try {
        // Update main stats
        updateMainStats();
        
        // Show family members
        displaySampleFamilyMembers();
        
        // Initialize charts
        initializeCharts();
        
        // Set up navigation
        setupNavigation();
        
        console.log('✅ Dashboard loaded successfully');
        
    } catch (error) {
        console.error('❌ Error in loadDashboard:', error);
        showError('Error loading dashboard: ' + error.message);
    }
}

// Update main statistics
function updateMainStats() {
    const elements = {
        'total-networth': '₹12,60,000',
        'total-invested': '₹12,07,000',
        'total-pnl': '+₹53,000',
        'monthly-growth': '₹12,000'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Display sample family members
function displaySampleFamilyMembers() {
    const familyOverview = document.getElementById('family-overview');
    if (!familyOverview) return;
    
    const familyMembers = [
        { name: 'Pradeep Kumar', relationship: 'Self', assets: '₹5,50,000', pnl: '+₹25,000', pnlPercent: '4.76%' },
        { name: 'Priya Kumar', relationship: 'Spouse', assets: '₹3,20,000', pnl: '+₹15,000', pnlPercent: '4.92%' },
        { name: 'Ramesh Kumar', relationship: 'Father', assets: '₹1,80,000', pnl: '+₹5,000', pnlPercent: '2.86%' },
        { name: 'Sunita Kumar', relationship: 'Mother', assets: '₹2,10,000', pnl: '+₹8,000', pnlPercent: '3.96%' }
    ];
    
    familyOverview.innerHTML = familyMembers.map(member => `
        <div class="card premium-card">
            <div class="card-header">
                <div class="member-info">
                    <div class="avatar">
                        <div style="width:40px;height:40px;background:#007acc;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">
                            ${member.name.charAt(0)}
                        </div>
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
                    <span class="amount">${member.assets}</span>
                </div>
                <div class="stat-row">
                    <span>P&L:</span>
                    <span class="amount profit">${member.pnl} (${member.pnlPercent})</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize charts
function initializeCharts() {
    try {
        // Asset Allocation Chart
        const assetCtx = document.getElementById('assetChart');
        if (assetCtx) {
            new Chart(assetCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Equity', 'Mutual Funds', 'Fixed Deposits', 'Bank Balance'],
                    datasets: [{
                        data: [40, 30, 20, 10],
                        backgroundColor: ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Growth Chart
        const growthCtx = document.getElementById('growthChart');
        if (growthCtx) {
            new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: ['Mar 24', 'Apr 24', 'May 24', 'Jun 24', 'Jul 24', 'Aug 24'],
                    datasets: [{
                        label: 'Portfolio Value',
                        data: [1180000, 1195000, 1210000, 1235000, 1248000, 1260000],
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + (value / 100000).toFixed(1) + 'L';
                                }
                            }
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error initializing charts:', error);
    }
}

// Setup navigation between sections
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.dashboard-section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');
            
            // Remove active class from all buttons and sections
            navButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked button and target section
            button.classList.add('active');
            const targetElement = document.getElementById(targetSection + '-section');
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

// Setup investment tabs
function setupInvestmentTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.investment-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tab buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and target tab
            button.classList.add('active');
            const targetElement = document.getElementById(targetTab + '-tab');
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

// ===== MODAL FUNCTIONS =====

function showAddMemberModal() {
    const modal = document.getElementById('add-member-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideAddMemberModal() {
    const modal = document.getElementById('add-member-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showAddInvestmentModal(type) {
    const modal = document.getElementById('add-investment-modal');
    const title = document.getElementById('investment-modal-title');
    
    if (modal && title) {
        title.textContent = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        modal.classList.remove('hidden');
    }
}

function hideAddInvestmentModal() {
    const modal = document.getElementById('add-investment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ===== UTILITY FUNCTIONS =====

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'background: #fee; border: 1px solid #f00; padding: 15px; margin: 20px; color: #d00; border-radius: 8px; position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = 'background: #efe; border: 1px solid #0a0; padding: 15px; margin: 20px; color: #060; border-radius: 8px; position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
    successDiv.innerHTML = `<strong>Success:</strong> ${message}`;
    document.body.appendChild(successDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded - Dashboard ready');
    
    // Setup navigation and tabs
    setupNavigation();
    setupInvestmentTabs();
    
    // Test elements
    const landingPage = document.getElementById('landing-page');
    const mainDashboard = document.getElementById('main-dashboard');
    
    console.log('Landing page found:', !!landingPage);
    console.log('Main dashboard found:', !!mainDashboard);
    
    console.log('🚀 FamWealth Dashboard initialized successfully!');
});

// ===== FUTURE: SUPABASE CONNECTION =====
// Add your Supabase credentials here when ready
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

// Placeholder for Supabase initialization
function initializeSupabase() {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && window.supabase) {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized');
        return supabase;
    }
    console.log('📝 Supabase not configured yet - using sample data');
    return null;
}
