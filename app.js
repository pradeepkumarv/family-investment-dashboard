// ===== SUPABASE AUTHENTICATION SETUP =====
// REPLACE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';  // ← Your URL here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';  // ← Your key here

let supabase = null;

// Initialize Supabase
function initializeSupabase() {
    if (SUPABASE_URL !== 'https://tqjwhbwcteuvmreldgae.supabase.co' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized for authentication');
        return true;
    } else {
        console.log('❌ Supabase not configured. Using demo mode.');
        return false;
    }
}

// ===== AUTHENTICATION FUNCTIONS =====

// Handle login button click
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validate input
    if (!email || !password) {
        showLoginError('Please enter both email and password.');
        return;
    }
    
    // Show loading state
    setLoginLoading(true);
    hideLoginError();
    
    // For demo purposes - if Supabase is not configured, use demo login
    if (!supabase && !initializeSupabase()) {
        console.log('Demo mode: checking demo credentials');
        
        // Demo credentials for testing
        if (email === 'demo@famwealth.com' && password === 'demo123') {
            showLoginSuccess('Demo login successful! Redirecting to dashboard...');
            setTimeout(() => {
                showDashboard();
            }, 1500);
        } else {
            showLoginError('Demo mode: Use email "demo@famwealth.com" and password "demo123"');
        }
        setLoginLoading(false);
        return;
    }
    
    try {
        console.log('Attempting to login with email:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            console.log('✅ Login successful:', data.user);
            showLoginSuccess('Login successful! Redirecting to dashboard...');
            
            // Store user info
            localStorage.setItem('famwealth_user', JSON.stringify(data.user));
            
            // Redirect to dashboard after brief delay
            setTimeout(() => {
                showDashboard();
            }, 1500);
            
        } else {
            throw new Error('No user data received');
        }
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account first.';
        } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        showLoginError(errorMessage);
    } finally {
        setLoginLoading(false);
    }
}

// Show loading state on login button
function setLoginLoading(isLoading) {
    const btn = document.getElementById('login-btn');
    const text = document.getElementById('login-text');
    const spinner = document.getElementById('login-spinner');
    
    if (isLoading) {
        btn.disabled = true;
        text.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

// Show login error
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.background = '#fee';
        errorDiv.style.borderColor = '#f87171';
        errorDiv.style.color = '#dc2626';
        errorDiv.classList.remove('hidden');
    }
}

// Hide login error
function hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// Show login success
function showLoginSuccess(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.background = '#d1fae5';
        errorDiv.style.borderColor = '#10b981';
        errorDiv.style.color = '#065f46';
        errorDiv.classList.remove('hidden');
    }
}

// Sign up function
function showSignupForm() {
    const modal = document.getElementById('signup-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        alert('Sign up functionality coming soon! For now, please create an account in Supabase dashboard or use demo credentials: demo@famwealth.com / demo123');
    }
}

// Hide signup modal
function hideSignupModal() {
    const modal = document.getElementById('signup-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (password !== confirmPassword) {
        showSignupError('Passwords do not match.');
        return;
    }
    
    if (!supabase && !initializeSupabase()) {
        showSignupError('Supabase not configured. Please contact administrator.');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        alert('Signup successful! Please check your email for confirmation.');
        hideSignupModal();
        
    } catch (error) {
        showSignupError(error.message);
    }
}

// Show signup error
function showSignupError(message) {
    const errorDiv = document.getElementById('signup-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

// Password reset function
async function resetPassword() {
    const email = prompt('Enter your email address for password reset:');
    
    if (!email) return;
    
    if (!supabase && !initializeSupabase()) {
        alert('Supabase not configured. Please contact administrator.');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        
        if (error) throw error;
        
        alert('Password reset email sent! Check your inbox.');
    } catch (error) {
        alert('Error sending reset email: ' + error.message);
    }
}

// Check if user is already logged in
async function checkAuthStatus() {
    // For demo mode, check local storage
    if (!supabase && !initializeSupabase()) {
        const demoUser = localStorage.getItem('famwealth_demo_user');
        return !!demoUser;
    }
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            console.log('✅ User already logged in:', user.email);
            localStorage.setItem('famwealth_user', JSON.stringify(user));
            return true;
        } else {
            console.log('📝 No user logged in');
            return false;
        }
    } catch (error) {
        console.error('❌ Error checking auth status:', error);
        return false;
    }
}

// Logout function
async function handleLogout() {
    if (!supabase) {
        // Demo mode logout
        localStorage.removeItem('famwealth_demo_user');
        localStorage.removeItem('famwealth_user');
        showLoginPage();
        console.log('✅ Demo user logged out');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Clear local storage
        localStorage.removeItem('famwealth_user');
        
        // Redirect to login page
        showLoginPage();
        
        console.log('✅ User logged out');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// Show login page
function showLoginPage() {
    document.getElementById('main-dashboard').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    
    // Clear form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    hideLoginError();
}

// Change password function
async function changePassword() {
    if (!supabase) {
        alert('Password change not available in demo mode.');
        return;
    }
    
    const newPassword = prompt('Enter your new password (minimum 6 characters):');
    
    if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        alert('Password updated successfully!');
    } catch (error) {
        alert('Error updating password: '
