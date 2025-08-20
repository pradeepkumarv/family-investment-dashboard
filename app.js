<script>
// ===== SUPABASE CONFIGURATION WITH DEBUGGING =====
// REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';  // ← PASTE HERE
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';  // ← PASTE HERE

let supabase = null;

// Enhanced debugging
async function testSupabaseConnection() {
    console.log('🔍 TESTING SUPABASE CONNECTION');
    console.log('URL:', SUPABASE_URL);
    console.log('Key preview:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    // Check if credentials are configured
    if (SUPABASE_URL === 'https://tqjwhbwcteuvmreldgae.supabase.co') {
        console.log('❌ URL not configured');
        updateAuthStatus('❌ Configure Supabase URL');
        return false;
    }
    
    if (SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw') {
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

// Enhanced login with detailed error logging
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
    
    // Fallback to demo
    if (email === 'demo@famwealth.com' && password === 'demo123') {
        showMessage('✅ Demo login successful!', 'success');
        setTimeout(() => {
            showDashboard();
            updateUserInfo({ email: 'demo@famwealth.com' });
        }, 1000);
    } else {
        showMessage('❌ Invalid credentials. Check console for details.', 'error');
    }
    
    setLoginLoading(false);
}

// Rest of your functions remain the same...
// [Include all other functions from previous code]

// Initialize with debugging
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Loading dashboard with enhanced debugging...');
    await testSupabaseConnection();
});
</script>
