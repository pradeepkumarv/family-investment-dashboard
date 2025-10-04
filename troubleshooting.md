# Troubleshooting Guide

## Common Errors and Solutions

### HTTP 403 Error on Import

**Error:** `importing equity: Error: HTTP error! status: 403`

**Possible Causes:**
1. Zerodha access token has expired
2. Not connected to Zerodha
3. Proxy API endpoint issues

**Solutions:**

1. **Reconnect to Zerodha:**
   - Open Zerodha settings
   - Click "Disconnect"
   - Click "Connect to Zerodha"
   - Complete the login and authorization flow
   - Try importing again

2. **Check Connection Status:**
   - Verify you see "Connected" status in Zerodha settings
   - Check that "Last Sync" shows a recent timestamp

3. **Verify Login:**
   - Make sure you're logged into your dashboard
   - Refresh the page and try again

### Database Not Initialized Error

**Error:** `Database helpers not initialized`

**Solution:**
- Refresh the page - the database helpers script may not have loaded yet
- Check browser console for any script loading errors
- Ensure you're using a modern browser (Chrome, Firefox, Edge)

### Please Log In First Error

**Error:** `Please log in first`

**Solution:**
- You need to be logged into your Family Investment Dashboard
- Create an account or log in
- Then connect to broker and import

## Import Process Steps

Follow these steps for successful import:

1. **Log into Dashboard**
   - Create account or sign in
   - Wait for page to fully load

2. **Connect to Broker**
   - Click broker settings (Zerodha/HDFC)
   - Click "Connect" or "Authorize"
   - Complete broker login flow
   - Verify you see "Connected" status

3. **Import Holdings**
   - Click "Import All" or specific import button
   - Wait for success message
   - Data will appear in your dashboard

## Browser Console Debugging

If you encounter issues:

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages
4. Common checks:
   - Is `window.dbHelpers` defined?
   - Is `supabase` defined?
   - Are there any script loading errors?

## Known Limitations

- Access tokens expire after 24 hours - you'll need to reconnect
- Some brokers may rate-limit API calls
- Internet connection required for all operations

## Getting Help

If issues persist:
1. Check browser console for specific error messages
2. Verify database tables exist in Supabase
3. Test with a different browser
4. Clear browser cache and cookies
