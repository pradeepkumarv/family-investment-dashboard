/*
  # Remove user_id foreign key constraints - FINAL FIX
  
  This migration permanently removes the foreign key constraints on user_id columns
  in equity_holdings and mutual_fund_holdings tables that were causing insertion failures.
  
  The user_id field will remain but without FK constraint enforcement.
*/

-- Drop FK constraint on equity_holdings if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'equity_holdings_user_id_fkey'
    ) THEN
        ALTER TABLE equity_holdings DROP CONSTRAINT equity_holdings_user_id_fkey;
        RAISE NOTICE 'Dropped equity_holdings_user_id_fkey';
    ELSE
        RAISE NOTICE 'equity_holdings_user_id_fkey does not exist';
    END IF;
END $$;

-- Drop FK constraint on mutual_fund_holdings if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'mutual_fund_holdings_user_id_fkey'
    ) THEN
        ALTER TABLE mutual_fund_holdings DROP CONSTRAINT mutual_fund_holdings_user_id_fkey;
        RAISE NOTICE 'Dropped mutual_fund_holdings_user_id_fkey';
    ELSE
        RAISE NOTICE 'mutual_fund_holdings_user_id_fkey does not exist';
    END IF;
END $$;