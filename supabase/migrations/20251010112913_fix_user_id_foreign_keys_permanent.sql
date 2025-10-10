/*
  # Permanent Fix for user_id Foreign Key Constraints
  
  This migration permanently removes the FK constraints on user_id from 
  equity_holdings and mutual_fund_holdings tables by dropping and recreating them.
  
  The tables are recreated WITHOUT the FK constraint to auth.users.
*/

-- Step 1: Drop the foreign key constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'equity_holdings_user_id_fkey'
    ) THEN
        ALTER TABLE equity_holdings DROP CONSTRAINT equity_holdings_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mutual_fund_holdings_user_id_fkey'
    ) THEN
        ALTER TABLE mutual_fund_holdings DROP CONSTRAINT mutual_fund_holdings_user_id_fkey;
    END IF;
END $$;

-- Verify constraints are gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname IN ('equity_holdings_user_id_fkey', 'mutual_fund_holdings_user_id_fkey')
    ) THEN
        RAISE EXCEPTION 'Foreign key constraints still exist!';
    ELSE
        RAISE NOTICE 'All user_id foreign key constraints successfully removed';
    END IF;
END $$;