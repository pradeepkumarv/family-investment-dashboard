# Database Structure Documentation

## Overview

The Family Investment Dashboard now uses a structured database with separate tables for each asset type. This enables:

- Better data organization and querying
- Historical tracking with import dates for analytics
- Cleaner data imports (delete old data, insert fresh data)
- Support for future analytics and trending

## Database Tables

### 1. family_members
Stores family member information.

**Key Fields:**
- `id` - Unique identifier
- `user_id` - References auth user
- `name` - Member name
- `relationship` - Relationship to primary member
- `date_of_birth` - Date of birth
- `photo_url` - Profile photo URL
- `is_primary` - Primary member flag
- `pan_number`, `aadhar_number` - Identity documents

### 2. equity_holdings
Stores stock/equity investments with date tracking.

**Key Fields:**
- `member_id` - References family_members
- `broker_platform` - Broker name (Zerodha, HDFC Securities, etc.)
- `symbol` - Trading symbol
- `company_name` - Company name
- `quantity` - Number of shares
- `average_price` - Average purchase price
- `current_price` - Current market price
- `invested_amount` - Total invested
- `current_value` - Current value
- `import_date` - Date when data was imported (for historical tracking)

### 3. mutual_fund_holdings
Stores mutual fund investments with date tracking.

**Key Fields:**
- `member_id` - References family_members
- `broker_platform` - Broker name
- `scheme_name` - Scheme name
- `scheme_code` - Scheme code
- `folio_number` - Folio number
- `fund_house` - AMC name
- `units` - Number of units
- `average_nav` - Average NAV at purchase
- `current_nav` - Current NAV
- `invested_amount` - Total invested
- `current_value` - Current value
- `import_date` - Date when data was imported

### 4. fixed_deposits
Stores fixed deposit investments.

**Key Fields:**
- `bank_name` - Bank name
- `fd_number` - FD number
- `principal_amount` - Principal amount
- `interest_rate` - Interest rate
- `maturity_amount` - Maturity amount
- `start_date` - FD start date
- `maturity_date` - FD maturity date
- `import_date` - Import date

### 5. insurance_policies
Stores insurance policy information.

**Key Fields:**
- `policy_type` - Life, Health, Term, etc.
- `insurance_company` - Insurance company name
- `policy_number` - Policy number
- `sum_assured` - Sum assured
- `premium_amount` - Premium amount
- `premium_frequency` - Monthly, Quarterly, Yearly
- `policy_start_date` - Policy start date
- `policy_end_date` - Policy end date
- `import_date` - Import date

### 6. gold_holdings
Stores gold investments (physical, digital, sovereign bonds).

**Key Fields:**
- `gold_type` - Physical, Digital Gold, Sovereign Gold Bond
- `platform` - Platform name
- `quantity_grams` - Quantity in grams
- `purchase_price_per_gram` - Purchase price per gram
- `current_price_per_gram` - Current price per gram
- `invested_amount` - Total invested
- `current_value` - Current value
- `import_date` - Import date

### 7. bank_accounts
Stores bank account balances.

**Key Fields:**
- `bank_name` - Bank name
- `account_type` - Savings, Current, etc.
- `account_number` - Account number (masked)
- `balance` - Current balance
- `import_date` - Import date

### 8. other_assets
Stores miscellaneous assets.

**Key Fields:**
- `asset_type` - Type of asset
- `asset_name` - Asset name
- `description` - Description
- `invested_amount` - Invested amount
- `current_value` - Current value
- `import_date` - Import date

## Import Process

### How Broker Integration Works

1. **Connect to Broker**: User authenticates with broker (Zerodha, HDFC Securities, etc.)
2. **Delete Old Data**: Before importing, all existing data for that broker and member is deleted
3. **Import Fresh Data**: Fresh data from broker is inserted with today's import_date
4. **Historical Tracking**: Each import creates a new set of records with the import date, enabling historical analysis

### Example: Zerodha Import

```javascript
// 1. Delete existing Zerodha equity holdings for Pradeep Kumar V
await dbHelpers.deleteEquityHoldingsByBrokerAndMember(
    userId,
    'Zerodha',
    memberId
);

// 2. Insert fresh equity holdings with today's import_date
await dbHelpers.insertEquityHoldings(equityRecords);
```

### Member-Broker Mapping

**Zerodha:**
- Equity: Pradeep Kumar V
- Mutual Funds: Saanvi Pradeep

**HDFC Securities:**
- Equity: Pradeep Kumar V
- Mutual Funds: Sanchita Pradeep

**ICICI Securities:**
- Equity: Smruthi Pradeep
- Mutual Funds: Smruthi Pradeep

**FundsIndia:**
- Mutual Funds: Pradeep Kumar V

## Analytics Capabilities

With the new structure, you can now:

1. **Track Historical Performance**: Query data by import_date to see how investments have grown over time
2. **Compare Dates**: Compare portfolio value between two dates
3. **Trend Analysis**: Analyze trends in individual stocks or funds
4. **Member-wise Analysis**: Analyze performance by family member
5. **Broker-wise Analysis**: Compare performance across different brokers

### Example Analytics Queries

Get latest holdings:
```javascript
const latestEquity = await dbHelpers.getLatestAssetsByType(userId, 'equity');
```

Get historical data:
```javascript
const history = await dbHelpers.getAssetHistoryByDate(
    userId,
    'equity',
    '2025-01-01',
    '2025-12-31'
);
```

## Security

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Policies enforce user_id checks on all operations
- CASCADE deletes protect data integrity

## Migration Notes

- Old data structure is preserved in the existing app.js
- New structure is in db-helpers.js
- Integration files updated: zerodha-integration-new.js, hdfc-securities-integration-new.js
- To migrate existing data, you would need to transform and move it to the new tables

## Files Added/Modified

**New Files:**
- `db-helpers.js` - Database helper functions
- `zerodha-integration-new.js` - Updated Zerodha integration
- `hdfc-securities-integration-new.js` - Updated HDFC integration
- `DATABASE_STRUCTURE.md` - This documentation

**Modified Files:**
- `index.html` - Updated script includes

## Next Steps

1. Initialize the database helpers when Supabase client is ready
2. Test broker integrations
3. Build analytics dashboard using historical data
4. Add data visualization for trends
