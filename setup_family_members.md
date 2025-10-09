# Family Members Setup Guide

## Problem
You deleted the family members, and now HDFC import can't find member IDs to save holdings.

## Solution

### Step 1: Check Your Auth User ID

Go to Supabase SQL Editor and run:

```sql
SELECT id, email FROM auth.users;
```

You should see your user ID. Copy it (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Step 2: Create Family Members

Replace `YOUR-USER-ID-HERE` with the actual user ID from Step 1:

```sql
-- Insert family members
INSERT INTO family_members (user_id, name, relationship, is_primary)
VALUES
  ('YOUR-USER-ID-HERE', 'Pradeep', 'Self', true),
  ('YOUR-USER-ID-HERE', 'Sanchita', 'Spouse', false)
RETURNING id, name, relationship;
```

This will return the member IDs. Keep note of them (but you don't need to update the code - it will fetch them automatically).

### Step 3: Verify Setup

Check that family members were created:

```sql
SELECT id, name, relationship FROM family_members;
```

### Step 4: Test HDFC Import

Now when you run the HDFC import:
1. It will automatically fetch the user_id from `DEFAULT_USER_ID` environment variable
2. It will automatically fetch member IDs from the database
3. It will assign:
   - **Equity holdings** → Member with relationship "Self" (Pradeep)
   - **Mutual Funds** → Member with relationship "Spouse" (Sanchita)

### Step 5: Customize Member Assignment (Optional)

If you want different assignment logic, you can modify the `get_members()` function in `hdfc_investright.py` around line 70.

## Quick Verification

After setup, check that you have:
- ✅ One auth.users record (your login)
- ✅ Two family_members records (both with the same user_id)
- ✅ DEFAULT_USER_ID set in Render environment variables

## What Changed

The code now:
1. **Fetches member IDs from database** instead of hardcoding them
2. **Adds 30-second timeout** to HDFC API requests (prevents hanging)
3. **Validates member IDs exist** before trying to save holdings
4. **Provides clear error messages** if setup is incomplete
