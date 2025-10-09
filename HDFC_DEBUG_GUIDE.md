# HDFC Import Debug Guide

## Console Logs Added

I've added comprehensive logging to both frontend and backend to help diagnose HDFC import issues.

## Frontend Logs (Browser Console)

When you click "Import Holdings", you'll see:

```
═══════════════════════════════════════════════════════
🚀 HDFC IMPORT STARTED
═══════════════════════════════════════════════════════

📡 STEP 1: Fetching from backend
   URL: https://family-investment-dashboard.onrender.com/api/hdfc/callback

📥 Response received:
   Status: 200 OK
   OK: true

📦 Parsed response: {status: "success", count: 23, data: [...]}
   Status: success
   Count: 23
   Data length: 23

✅ STEP 2: Validating response
✅ Received 23 holdings

👤 STEP 3: Getting current user
   User ID: abc123-xyz...

💾 STEP 4: Processing and saving holdings

   [1/23] Processing: HDFC Bank Ltd
      Type: EQUITY
      Member ID: bef9db5e-2f21-4038-8f3f-f78ce1bbfb49
      💰 Equity data: {user_id: ..., symbol: "HDFCBANK", ...}
      ✅ Equity saved

   [2/23] Processing: Axis Mutual Fund
      Type: MUTUAL FUND
      Member ID: d3a4fc84-a94b-494d-915f-60901f16d973
      📊 MF data: {user_id: ..., scheme_name: "Axis...", ...}
      ✅ MF saved

   ... (continues for all 23)

═══════════════════════════════════════════════════════
✅ HDFC IMPORT COMPLETED
   Total holdings: 23
   Saved: 23
   Errors: 0
═══════════════════════════════════════════════════════
```

## Backend Logs (Render Console)

In Render logs, you'll see:

```
================================================================================
🚀 HDFC CALLBACK ENDPOINT CALLED
================================================================================
🔑 Session data:
   request_token: 82875361c57449198c6821f77cc631f9101815457...
   token_id: 615ecab7387b41608862cc6dcd36bb1e1562ff1d0ae14d10...

📡 STEP 1: Trying request_token directly...
❌ Direct request_token failed: 401 Client Error

🔐 STEP 2: Fetching access_token...
✅ Access token received: eyJhbGciOiJIUzM4NCJ9.eyJzdWIiOiI1MTk3MDg3NiIs...
📡 Fetching holdings with access_token...
✅ SUCCESS with access_token

📦 Processing holdings data...
✅ Received 23 holdings from HDFC API

📊 Sample holding:
   {'company_name': 'HDFC Bank Ltd', 'quantity': 50, ...}

💾 Saving to Supabase...
🔄 Processing 23 HDFC holdings...
📋 Using user_id: abc123-xyz..., import_date: 2025-10-09
📊 HDFC Bank Ltd: qty=50, avg=1500, close=1650
   💰 Invested=75000, Current=82500
✅ Saved to Supabase successfully

================================================================================
✅ CALLBACK SUCCESS
   Holdings count: 23
================================================================================
```

## Common Issues & Solutions

### Issue 1: "Not authorized" error
**Logs show:**
```
❌ Missing session data - user needs to authorize first
```

**Solution:** Click "Authorize HDFC" button first before importing

---

### Issue 2: "Invalid holdings data structure"
**Logs show:**
```
❌ Invalid data structure: {status: "success", data: null}
```

**Solution:** HDFC API returned no data. Check:
1. Are you logged into HDFC?
2. Did authorization complete successfully?
3. Do you have holdings in your HDFC account?

---

### Issue 3: Timeout errors
**Logs show:**
```
❌ Access token method failed: ReadTimeout
```

**Solution:**
- HDFC API is slow (now has 30s timeout)
- Check Render logs for more details
- Try again after a few minutes

---

### Issue 4: Supabase save errors
**Logs show:**
```
❌ Equity save error: {code: "23505", message: "duplicate key..."}
```

**Solution:**
- Holdings already exist for today
- This is expected behavior (upsert should handle this)
- If persistent, check database constraints

---

## How to Debug

1. **Open Browser Console** (F12 → Console tab)
2. **Open Render Logs** in separate tab
3. **Click "Import Holdings"**
4. **Watch both logs simultaneously**

The logs will tell you:
- ✅ Which step succeeded
- ❌ Which step failed
- 📊 What data was received
- 💾 What was saved to database

## Next Steps

Share both:
1. **Browser console output** (full)
2. **Render logs output** (full)

This will help identify exactly where the import is failing.
