# How to Get Your Supabase Auth User ID

## Problem
The HDFC import is failing because `equity_holdings.user_id` must reference a user in the `auth.users` table, but we're using a `family_members` ID.

## Error Message
```
insert or update on table "equity_holdings" violates foreign key constraint "equity_holdings_user_id_fkey"
Key (user_id)=(bef9db5e-2f21-4038-8f3f-f78ce1bbfb49) is not present in table "users"
```

## Solution: Get Your Auth User ID

### Option 1: From Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Users**
4. You should see your logged-in user
5. Click on the user to see their **UUID** (this is your user_id)
6. Copy that UUID

### Option 2: From SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query:

```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

3. Find your user and copy the `id` column value

### Option 3: From Your Frontend

Open browser console on your dashboard and run:

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Your user_id:', user.id);
```

## After Getting Your User ID

### Add to Render Environment Variables

1. Go to your Render dashboard
2. Open your service
3. Go to **Environment** tab
4. Add this variable:

```
DEFAULT_USER_ID=<paste-your-uuid-here>
```

Example:
```
DEFAULT_USER_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

5. **Save Changes** - Render will automatically redeploy

## Verify Family Members Table

Your `family_members` table should also have this same `user_id`:

```sql
SELECT id, name, user_id
FROM family_members;
```

Both `member_id` (Pradeep, Sanchita) entries should have the same `user_id` value pointing to your auth user.

If they don't have the correct user_id, update them:

```sql
UPDATE family_members
SET user_id = '<your-auth-user-id>'
WHERE user_id IS NULL OR user_id != '<your-auth-user-id>';
```

## What This Fixes

Once you set `DEFAULT_USER_ID`:
- ✅ HDFC holdings will be saved with correct `user_id`
- ✅ Foreign key constraints will pass
- ✅ All 23 HDFC equity holdings will be imported successfully
- ✅ Data will be visible on your dashboard

The import process is **already working** - it's just failing on the database insert step!
