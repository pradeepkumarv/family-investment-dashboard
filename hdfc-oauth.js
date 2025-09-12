// public/js/hdfc-oauth.js

const HDFC_CONFIG = {
  client_id: '5f5de761677a4283bd623e6a1013395b',         
  client_secret: '8ed88c629bc04639afcdca15381bd965',  
  redirect_uri: 'https://github.com/pradeepkumarv/family-investment-dashboard/api/hdfc/callback'
};

// Open HDFC OAuth authorization URL
function connectHDFC() {
  const authUrl = new URL('https://developer.hdfcsec.com/ir-api/auth/login');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', HDFC_CONFIG.client_id);
  authUrl.searchParams.set('redirect_uri', HDFC_CONFIG.redirect_uri);
  authUrl.searchParams.set('scope', 'read');
  window.location.href = authUrl.toString();
}

// After redirect, call backend to exchange code
async function handleHDFCCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;

  try {
    const resp = await fetch('/api/hdfc/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await resp.json();
    if (resp.ok && data.access_token) {
      localStorage.setItem('hdfc_access_token', data.access_token);
      alert('HDFC connected successfully!');
      window.history.replaceState({}, '', '/'); // Remove code from URL
    } else {
      alert('HDFC connect failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error(e);
    alert('HDFC connect failed: ' + e.message);
  }
}

// Fetch holdings
async function fetchHDFCHoldings() {
  const token = localStorage.getItem('hdfc_access_token');
  if (!token) throw new Error('Not authenticated');
  const resp = await fetch('/api/hdfc/holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Fetch holdings failed');
  return data.data;
}

// On page load, handle callback if present
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.search.includes('code=')) {
    handleHDFCCallback();
  }
  // Bind connect button
  const btn = document.getElementById('connect-hdfc-btn');
  if (btn) btn.addEventListener('click', connectHDFC);
});
