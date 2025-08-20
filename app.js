<script>
// ===== SUPABASE CONFIGURATION WITH DEBUGGING =====
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

let supabase = null;

// Fixed debugging function
async function testSupabaseConnection() {
    console.log('🔍 TESTING SUPABASE CONNECTION');
    console.log('URL:', SUPABASE_URL);
    console.log('Key preview:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    // Check if credentials are configured (FIXED: check against placeholders, not actual values)
    if (SUPABASE_URL === 'https://your-project-id.supabase.co') {
        console.log('❌ URL not configured');
        updateAuthStatus('❌ Configure Supabase URL');
        return false;
    }
    
    if (SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...') {
        console.log('❌ Key not configured');
        updateAuthStatus('❌ Configure Supabase Key');
        return false;
    }
    
    // Check if Supabase library is loaded
    if (!window.supabase) {
        console.log('❌ Supabase library not loaded');
        updateAuthStatus('❌ Supabase Library Missing');
        return false;
    }
    
    try {
        // Create client
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Client created');
        
        // Test connection
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.log('❌ Connection test failed:', error);
            updateAuthStatus('❌ Connection Failed: ' + error.message);
            return false;
        }
        
        console.log('✅ Supabase connection successful');
        updateAuthStatus('✅ Supabase Connected & Ready');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase setup error:', error);
        updateAuthStatus('❌ Setup Error: ' + error.message);
        return false;
    }
}

// Fixed login function
async function loginNow() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    console.log('🔐 LOGIN ATTEMPT:', email);
    
    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }
    
    setLoginLoading(true);
    showMessage('🔄 Authenticating...', 'info');
    
    // Test Supabase connection first
    const supabaseReady = await testSupabaseConnection();
    
    if (supabaseReady) {
        try {
            console.log('🔄 Attempting Supabase login...');
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            console.log('Login response:', { data, error });
            
            if (error) {
                console.error('❌ Supabase login error:', error);
                showMessage(`❌ Login failed: ${error.message}`, 'error');
                setLoginLoading(false);
                return;
            }
            
            if (data.user) {
                console.log('✅ Login successful:', data.user);
                showMessage(`✅ Welcome, ${data.user.email}!`, 'success');
                
                localStorage.setItem('famwealth_user', JSON.stringify(data.user));
                localStorage.setItem('famwealth_auth_type', 'supabase');
                
                setTimeout(() => {
                    showDashboard();
                    updateUserInfo(data.user);
                }, 1500);
                return;
            }
            
        } catch (error) {
            console.error('❌ Login exception:', error);
            showMessage(`❌ Login error: ${error.message}`, 'error');
        }
    } else {
        console.log('📝 Supabase not ready, trying demo...');
    }
    
    // FIXED: Demo login comparison (was using = instead of ===)
    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        localStorage.setItem('famwealth_auth_type', 'demo');
        setTimeout(() => {
            showDashboard();
            updateUserInfo({ email: 'demo@famwealth.com' });
        }, 1000);
    } else {
        showMessage('❌ Invalid credentials. Check console for details.', 'error');
    }
    
    setLoginLoading(false);
}

// Update authentication status display
function updateAuthStatus(status) {
    const authStatusElement = document.getElementById('auth-status');
    if (authStatusElement) {
        authStatusElement.textContent = status;
    }
}

// Show/hide dashboard
function showDashboard() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';
}

// Update user info in dashboard
function updateUserInfo(user) {
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay) {
        const displayName = user.email.split('@')[0];
        userEmailDisplay.textContent = `${displayName}`;
    }
    console.log('Dashboard loaded for user:', user.email);
}

// Enhanced logout
async function logoutNow() {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'supabase' && supabase) {
        try {
            await supabase.auth.signOut();
            console.log('✅ Supabase logout successful');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Clear storage
    localStorage.removeItem('famwealth_user');
    localStorage.removeItem('famwealth_auth_type');
    
    // Return to login
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    showMessage('✅ Logged out successfully', 'success');
    setLoginLoading(false);
}

// Set loading state
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

// Show login messages
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
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 4000);
    }
}

// Check for existing login on page load
async function checkExistingLogin() {
    const authType = localStorage.getItem('famwealth_auth_type');
    
    if (authType === 'supabase' && await testSupabaseConnection()) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                console.log('✅ Found existing Supabase session:', user.email);
                showDashboard();
                updateUserInfo(user);
                return;
            }
        } catch (error) {
            console.log('No existing session found');
        }
    }
    
    if (authType === 'demo') {
        console.log('✅ Found existing demo session');
        showDashboard();
        updateUserInfo({ email: 'demo@famwealth.com' });
    }
}

// Allow Enter key to login
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const email = document.getElementById('login-email');
        const password = document.getElementById('login-password');
        if (document.activeElement === email || document.activeElement === password) {
            loginNow();
        }
    }
});

// Initialize with debugging
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Loading dashboard with fixed authentication...');
    await testSupabaseConnection();
    checkExistingLogin();
});
</script>
