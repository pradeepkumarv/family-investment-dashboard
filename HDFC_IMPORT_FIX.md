# HDFC Securities Import Fix

## Problem
The HDFC import function was failing with the error:
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

All 23 holdings were failing to import into the database.

## Root Causes

1. **Wrong Table Structure**: The Python script was trying to insert into an `investments` table, but the database schema has separate `equity_holdings` and `mutual_fund_holdings` tables.

2. **Incorrect Column Names**: The script used old column names like `symbolorname`, `investedamount`, etc., which don't exist in the current schema.

3. **Missing user_id**: The new schema requires a `user_id` field (references auth.users), but the script wasn't providing it.

## Solution

### Updated `hdfc_investright.py`

1. **Added user_id resolution logic**:
   - First tries to get `DEFAULT_USER_ID` from environment variables
   - Falls back to querying existing `family_members` table for a valid user_id
   - Added `get_user_id()` helper function

2. **Split holdings into correct tables**:
   - Mutual funds (identified by `sip_indicator == "Y"` or "fund" in name) → `mutual_fund_holdings`
   - Equity holdings → `equity_holdings`

3. **Fixed column mapping**:
   - Equity: `symbol`, `company_name`, `quantity`, `average_price`, `current_price`, etc.
   - Mutual Funds: `scheme_name`, `scheme_code`, `units`, `average_nav`, `current_nav`, etc.

4. **Implemented proper upsert logic**:
   - Uses `update()` with `.eq()` filters first
   - Falls back to `insert()` if no rows matched
   - This avoids the ON CONFLICT issue since we manually handle duplicates

## What You Need to Do

### Option 1: Set DEFAULT_USER_ID Environment Variable

Add this to your `.env` file or Render environment variables:
```
DEFAULT_USER_ID=<your-user-uuid>
```

To find your user_id, run:
```bash
python setup_default_user.py
```

This script will query the `family_members` table and show you an existing user_id.

### Option 2: Let it Auto-detect

If you have family members already in the database, the script will automatically use the first user_id it finds.

## Testing

After deploying these changes:

1. Go through the HDFC login flow
2. Check the Render logs - you should see:
   ```
   📋 Using user_id: <uuid>, import_date: 2025-10-09
   ✅ Upserted <company_name>: ₹<invested> → ₹<current>
   📈 Summary: 23/23 holdings processed
   ```

3. Verify in Supabase:
   - Check `equity_holdings` table for stock entries
   - Check `mutual_fund_holdings` table for mutual fund entries

## Files Modified

- `hdfc_investright.py` - Main import logic updated
- `setup_default_user.py` - New helper script to find user_id

## Technical Details

The script now:
- Correctly identifies mutual funds vs equity based on holdings data
- Maps HDFC API fields to the correct database columns
- Handles the user_id requirement automatically
- Uses manual update/insert logic instead of relying on database constraints
- Tracks import dates for historical analysis
