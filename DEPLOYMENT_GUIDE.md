# HDFC Import Deployment Guide

## Quick Setup

### Step 1: Find Your User ID

You need to provide a valid `user_id` that exists in your `auth.users` table. Here are two ways to get it:

#### Option A: Query from family_members table
```bash
python3 setup_default_user.py
```

This will output something like:
```
✅ Found existing user_id: 12345678-1234-1234-1234-123456789abc
Add this to your .env file:
DEFAULT_USER_ID=12345678-1234-1234-1234-123456789abc
```

#### Option B: Query Supabase directly
Go to your Supabase SQL Editor and run:
```sql
SELECT user_id FROM family_members LIMIT 1;
```

Or if you want to create a new test user in auth.users:
```sql
-- Check existing auth users
SELECT id, email FROM auth.users;
```

### Step 2: Set Environment Variable

Add the user_id to your Render environment variables:

1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Add a new environment variable:
   - Key: `DEFAULT_USER_ID`
   - Value: `<the-uuid-from-step-1>`

### Step 3: Deploy

The changes are already in your code. Just commit and push:

```bash
git add hdfc_investright.py setup_default_user.py
git commit -m "Fix HDFC import to use correct table structure"
git push
```

Render will automatically redeploy.

## What Changed

1. **hdfc_investright.py**:
   - Now inserts into `equity_holdings` and `mutual_fund_holdings` tables
   - Uses correct column names matching your schema
   - Automatically gets user_id from environment or database
   - Uses manual update/insert logic instead of ON CONFLICT

2. **setup_default_user.py** (new):
   - Helper script to find a valid user_id from your database

## Testing the Fix

1. Go through HDFC login flow in your app
2. Watch Render logs for:
   ```
   📋 Using user_id: <uuid>, import_date: 2025-10-09
   📊 AFFLE 3I LIMITED: qty=45.0, avg=1967.4709, close=1886.9
   ✅ Upserted AFFLE 3I LIMITED: ₹88536.19 → ₹84910.50
   ...
   📈 Summary: 23/23 holdings processed
   ```

3. Verify in Supabase:
   ```sql
   -- Check equity holdings
   SELECT * FROM equity_holdings WHERE broker_platform = 'HDFC Securities';

   -- Check mutual fund holdings
   SELECT * FROM mutual_fund_holdings WHERE broker_platform = 'HDFC Securities';
   ```

## Troubleshooting

### Error: "No valid user_id found"
- You need to set the `DEFAULT_USER_ID` environment variable
- Or ensure you have at least one record in the `family_members` table

### Error: "violates foreign key constraint"
- The `DEFAULT_USER_ID` you provided doesn't exist in `auth.users`
- Query `auth.users` table to find a valid user ID

### Still getting 0/23 processed
- Check the detailed error messages in logs
- Verify RLS policies allow inserts for authenticated users
- Check that SUPABASE_URL and SUPABASE_KEY are set correctly

## Next Steps (Optional)

For a production app, you should:
1. Implement proper authentication
2. Pass the authenticated user's ID to the import function
3. Remove the hardcoded member_id mappings
4. Let users select which family member owns each holding
