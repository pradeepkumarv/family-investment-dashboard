# HDFC Authorization Flow - Debug Guide

## The Complete Flow

### Step 1: User Clicks "Authorize HDFC" Button
**Location**: Dashboard → HDFC Settings Modal → "Authorize HDFC" button

**What Happens**:
```javascript
// Frontend: hdfc-securities-integration-new.js
authorizeHDFC() is called
  ↓
Fetches: https://family-investment-dashboard.onrender.com/api/hdfc/auth-url
  ↓
Backend returns: { "url": "https://family-investment-dashboard.onrender.com/" }
  ↓
Redirects browser to that URL
```

### Step 2: Backend Login Page
**URL**: `https://family-investment-dashboard.onrender.com/`

**What Happens**:
- Renders `templates/login.html`
- User enters HDFC credentials
- User clicks "Request OTP"
- Form posts to `/request-otp`

### Step 3: OTP Request
**Backend Endpoint**: `POST /request-otp`

**What Happens**:
```python
1. Get token_id from HDFC API
2. Store in session: token_id, username, password
3. Call HDFC login_validate() API
4. Render templates/otp.html
5. User receives OTP on mobile/email
```

### Step 4: OTP Validation
**Backend Endpoint**: `POST /validate-otp`

**What Happens**:
```python
1. User enters OTP
2. Backend calls HDFC validate_otp() API
3. HDFC returns request_token
4. Store in session: request_token
5. Return callback_url to frontend
6. Frontend redirects to callback
```

### Step 5: Callback & Holdings Fetch
**Backend Endpoint**: `GET /api/hdfc/callback`

**What Happens**:
```python
1. Retrieve request_token and token_id from session
2. Try fetching holdings with request_token
3. If fails, fetch access_token using token_id + request_token
4. Try fetching holdings with access_token
5. Process and save holdings to Supabase
6. Return holdings data to frontend
```

## Current Issues

### Issue 1: Authorization Button Not Working
**Symptom**: Clicking "Authorize HDFC" doesn't open login page

**Debug Steps**:
1. Open browser console (F12 → Console)
2. Click "Authorize HDFC" button
3. Look for these logs:

```
═══════════════════════════════════════════════════════
🚀 HDFC AUTHORIZATION STARTED
═══════════════════════════════════════════════════════
📡 Fetching auth URL from: https://family-investment-dashboard.onrender.com/api/hdfc/auth-url
📥 Response received: 200 OK
📦 Parsed response: {url: "https://family-investment-dashboard.onrender.com/"}
✅ Redirecting to: https://family-investment-dashboard.onrender.com/
```

**Possible Causes**:
- ❌ CORS blocking the request
- ❌ Backend not running
- ❌ JavaScript error before function executes
- ❌ Button onclick not wired properly

### Issue 2: Holdings API Timeout
**Symptom**: Backend hangs after fetching access_token

**From Render Logs**:
```
📡 Fetching holdings with access_token...
📊 Fetching holdings
  URL: https://developer.hdfcsec.com/oapi/v1/portfolio/holdings
  Headers: {...}
[HANGS HERE - NO RESPONSE]
```

**Fix Applied**: Added timeout handling
```python
try:
    resp = requests.get(url, params={"api_key": API_KEY}, headers=headers, timeout=30)
    print(f"  ✅ Response received: Status={resp.status_code}")
except requests.Timeout:
    print("  ❌ Request timed out after 30 seconds")
```

## Environment Variables Required

On **Render Dashboard** → Your Service → Environment:

```bash
# HDFC API Credentials
HDFC_API_KEY=5f5de761677a4283bd623e6a1013395b
HDFC_API_SECRET=8ed88c629bc04639afcdca15381bd965
HDFC_USERNAME=51970876
HDFC_PASSWORD=<your-password>

# Supabase (CRITICAL: Use SERVICE_ROLE_KEY)
SUPABASE_URL=https://tqjwhbwcteuvmreldgae.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# User ID
DEFAULT_USER_ID=<your-user-uuid>

# Flask
FLASK_SECRET_KEY=<random-secret-key>
```

## Testing Checklist

### 1. Test Authorization Flow
- [ ] Open dashboard in browser
- [ ] Open browser console (F12)
- [ ] Click "HDFC Settings" button
- [ ] Modal opens with "Authorize HDFC" button
- [ ] Click "Authorize HDFC"
- [ ] Check console logs (should show redirect info)
- [ ] Browser redirects to Render login page
- [ ] Login page displays correctly

### 2. Test Login Flow
- [ ] Enter HDFC credentials
- [ ] Click "Request OTP"
- [ ] OTP page displays
- [ ] Receive OTP on mobile/email
- [ ] Enter OTP
- [ ] Click "Validate OTP"
- [ ] Redirects to callback
- [ ] Check Render logs for holdings fetch

### 3. Test Holdings Import
- [ ] After successful OTP validation
- [ ] Backend should automatically fetch holdings
- [ ] Check Render logs for:
  - ✅ Access token received
  - ✅ Holdings response received
  - ✅ Saved to Supabase
- [ ] Return to dashboard
- [ ] Holdings should be visible

## Next Steps

1. **Check Console Logs**: Open browser console and click "Authorize HDFC"
2. **Share Console Output**: Copy all console logs
3. **Check Network Tab**: F12 → Network → Click button → Look for failed requests
4. **Share Render Logs**: After clicking authorize, check Render logs

The comprehensive logging will show exactly where it's failing!
