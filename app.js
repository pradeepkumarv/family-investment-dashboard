// ===== COMPLETE FAMWEALTH DASHBOARD - FIXED =====

const PRESET_PHOTOS = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face'
];

let familyData = {
    members: [],
    investments: {},
    liabilities: {},
    accounts: [],
    totals: {}
};

let editingItemId = null;
let editingItemType = null;
let editingItemMemberId = null;

// Defensive: Populate liability member dropdown
function populateLiabilityMemberDropdown() {
    const memberSelect = document.getElementById('liability-member');
    if (memberSelect) {
        memberSelect.innerHTML = familyData.members.map(member =>
            `<option value="${member.id}">${member.name} (${member.relationship})</option>`
        ).join('');
    }
}

// Defensive: Save liability with null checks
function saveLiability() {
    const elMember = document.getElementById('liability-member');
    const elType = document.getElementById('liability-type');
    const elLender = document.getElementById('liability-lender');
    const elAmount = document.getElementById('liability-amount');
    const elEmi = document.getElementById('liability-emi');
    const elRate = document.getElementById('liability-rate');

    if (!elMember || !elType || !elLender || !elAmount) {
        console.error('Liability modal missing required elements');
        alert('Some required form elements are missing. Please reload the page.');
        return;
    }

    const memberId = elMember.value;
    const type = elType.value;
    const lender = elLender.value.trim();
    const amount = elAmount.value;
    const emi = elEmi ? elEmi.value : 0;
    const rate = elRate ? elRate.value : 0;

    if (!memberId || !type || !lender || !amount) {
        alert('Please fill all required fields.');
        return;
    }

    const liabilityData = {
        id: editingItemId || Date.now().toString(),
        lender: lender,
        outstanding_amount: parseFloat(amount) || 0,
        emi_amount: parseFloat(emi) || 0,
        interest_rate: parseFloat(rate) || 0
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
        const idx = familyData.liabilities[memberId][type].findIndex(i => i.id === editingItemId);
        if (idx !== -1) {
            familyData.liabilities[memberId][type][idx] = liabilityData;
        }
        alert('Liability updated successfully!');
    } else {
        familyData.liabilities[memberId][type].push(liabilityData);
        alert('Liability added successfully!');
    }

    saveDataToStorage();
    renderDashboard();
    // Render liability tab content can be updated if needed here
    closeModal('liability-modal');
    editingItemId = null;
}

// Modal close function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// Render dashboard stub (implement as needed)
function renderDashboard() {
    // Here you would call your render functions for different dashboard sections
    console.log('Rendering dashboard...');
    // Populate dropdowns for modal forms when shown
    populateLiabilityMemberDropdown();
    // ...other renders
}

// Save data to localStorage
function saveDataToStorage() {
    try {
        localStorage.setItem('famwealth_data', JSON.stringify(familyData));
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving data to storage:', error);
    }
}

// Utility: Show message function (replace with your own UI method)
function showMessage(msg, type = 'info') {
    alert(msg); // Simple alert, replace with better UI notification
}

// Call this to initialize a fresh load for demo
function loadSampleData() {
    familyData.members = [
        { id: '1', name: 'Pradeep Kumar', relationship: 'Self', is_primary: true, photo_url: PRESET_PHOTOS[0] },
        { id: '2', name: 'Smruthi Kumar', relationship: 'Daughter', is_primary: false, photo_url: PRESET_PHOTOS[1] }
    ];
    familyData.liabilities = {
        '1': {
            homeLoan: [
                { id: 'hl1', lender: 'HDFC Bank', outstanding_amount: 1500000, emi_amount: 25000, interest_rate: 8.5 }
            ],
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
    saveDataToStorage();
    renderDashboard();
}

// Initial load example
document.addEventListener('DOMContentLoaded', () => {
    // Load or initialize your data here
    const storedData = localStorage.getItem('famwealth_data');
    if (storedData) {
        familyData = JSON.parse(storedData);
    } else {
        loadSampleData();
    }
    renderDashboard();
});
