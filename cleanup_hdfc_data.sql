-- Clean up HDFC holdings with wrong user_id
-- Run this in Supabase SQL Editor

-- Delete HDFC equity holdings with wrong user_id
DELETE FROM equity_holdings
WHERE broker_platform = 'HDFC Securities'
AND user_id = '5f2db789-657d-48cf-a84d-8d3395f5b01d';

-- Delete HDFC mutual fund holdings with wrong user_id
DELETE FROM mutual_fund_holdings
WHERE broker_platform = 'HDFC Securities'
AND user_id = '5f2db789-657d-48cf-a84d-8d3395f5b01d';

-- Verify cleanup
SELECT 'Equity Holdings' as table_name, broker_platform, COUNT(*) as count
FROM equity_holdings
GROUP BY broker_platform
UNION ALL
SELECT 'Mutual Fund Holdings' as table_name, broker_platform, COUNT(*) as count
FROM mutual_fund_holdings
GROUP BY broker_platform;
