/*
  # Family Investment Dashboard - Asset Tables with Date Tracking

  ## Overview
  This migration creates separate tables for different asset types with date tracking for analytics.
  Each table maintains historical records with import dates to enable trend analysis and reporting.

  ## New Tables Created

  ### 1. family_members
  Core table for family member information
  - id (uuid, primary key)
  - name (text)
  - relationship (text)
  - date_of_birth (date)
  - photo_url (text)
  - is_primary (boolean)
  - email (text)
  - phone (text)
  - address (text)
  - pan_number (text)
  - aadhar_number (text)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### 2. equity_holdings
  Stores stock/equity investments with historical tracking
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - broker_platform (text)
  - symbol (text) - Trading symbol
  - company_name (text)
  - quantity (numeric)
  - average_price (numeric)
  - current_price (numeric)
  - invested_amount (numeric)
  - current_value (numeric)
  - import_date (date) - Date when this record was imported
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 3. mutual_fund_holdings
  Stores mutual fund investments with historical tracking
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - broker_platform (text)
  - scheme_name (text)
  - scheme_code (text)
  - folio_number (text)
  - fund_house (text)
  - units (numeric)
  - average_nav (numeric)
  - current_nav (numeric)
  - invested_amount (numeric)
  - current_value (numeric)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 4. fixed_deposits
  Stores fixed deposit investments
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - bank_name (text)
  - fd_number (text)
  - principal_amount (numeric)
  - interest_rate (numeric)
  - maturity_amount (numeric)
  - start_date (date)
  - maturity_date (date)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 5. insurance_policies
  Stores insurance policy information
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - policy_type (text) - Life, Health, Term, etc.
  - insurance_company (text)
  - policy_number (text)
  - sum_assured (numeric)
  - premium_amount (numeric)
  - premium_frequency (text) - Monthly, Quarterly, Yearly
  - policy_start_date (date)
  - policy_end_date (date)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 6. gold_holdings
  Stores gold investments (physical, digital, sovereign bonds)
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - gold_type (text) - Physical, Digital Gold, Sovereign Gold Bond
  - platform (text)
  - quantity_grams (numeric)
  - purchase_price_per_gram (numeric)
  - current_price_per_gram (numeric)
  - invested_amount (numeric)
  - current_value (numeric)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 7. bank_accounts
  Stores bank account balances
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - bank_name (text)
  - account_type (text) - Savings, Current, etc.
  - account_number (text)
  - balance (numeric)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ### 8. other_assets
  Stores miscellaneous assets
  - id (uuid, primary key)
  - member_id (uuid, references family_members)
  - asset_type (text)
  - asset_name (text)
  - description (text)
  - invested_amount (numeric)
  - current_value (numeric)
  - import_date (date)
  - user_id (uuid, references auth.users)
  - created_at (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Important Notes
  - All monetary values use numeric type for precision
  - import_date tracks when data was imported for historical analysis
  - Each table has user_id for multi-tenant support
  - Timestamps use timestamptz for timezone awareness
*/

-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text,
  date_of_birth date,
  photo_url text,
  is_primary boolean DEFAULT false,
  email text,
  phone text,
  address text,
  pan_number text,
  aadhar_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create equity_holdings table
CREATE TABLE IF NOT EXISTS equity_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  broker_platform text NOT NULL,
  symbol text NOT NULL,
  company_name text,
  quantity numeric NOT NULL DEFAULT 0,
  average_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  invested_amount numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create mutual_fund_holdings table
CREATE TABLE IF NOT EXISTS mutual_fund_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  broker_platform text NOT NULL,
  scheme_name text NOT NULL,
  scheme_code text,
  folio_number text,
  fund_house text,
  units numeric NOT NULL DEFAULT 0,
  average_nav numeric NOT NULL DEFAULT 0,
  current_nav numeric NOT NULL DEFAULT 0,
  invested_amount numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create fixed_deposits table
CREATE TABLE IF NOT EXISTS fixed_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  fd_number text,
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  maturity_amount numeric NOT NULL DEFAULT 0,
  start_date date,
  maturity_date date,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create insurance_policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  policy_type text NOT NULL,
  insurance_company text NOT NULL,
  policy_number text,
  sum_assured numeric NOT NULL DEFAULT 0,
  premium_amount numeric NOT NULL DEFAULT 0,
  premium_frequency text DEFAULT 'Yearly',
  policy_start_date date,
  policy_end_date date,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create gold_holdings table
CREATE TABLE IF NOT EXISTS gold_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  gold_type text NOT NULL,
  platform text,
  quantity_grams numeric NOT NULL DEFAULT 0,
  purchase_price_per_gram numeric NOT NULL DEFAULT 0,
  current_price_per_gram numeric NOT NULL DEFAULT 0,
  invested_amount numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  account_type text NOT NULL,
  account_number text,
  balance numeric NOT NULL DEFAULT 0,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create other_assets table
CREATE TABLE IF NOT EXISTS other_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
  asset_type text NOT NULL,
  asset_name text NOT NULL,
  description text,
  invested_amount numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  import_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equity_member ON equity_holdings(member_id);
CREATE INDEX IF NOT EXISTS idx_equity_import_date ON equity_holdings(import_date);
CREATE INDEX IF NOT EXISTS idx_equity_user ON equity_holdings(user_id);

CREATE INDEX IF NOT EXISTS idx_mf_member ON mutual_fund_holdings(member_id);
CREATE INDEX IF NOT EXISTS idx_mf_import_date ON mutual_fund_holdings(import_date);
CREATE INDEX IF NOT EXISTS idx_mf_user ON mutual_fund_holdings(user_id);

CREATE INDEX IF NOT EXISTS idx_fd_member ON fixed_deposits(member_id);
CREATE INDEX IF NOT EXISTS idx_fd_import_date ON fixed_deposits(import_date);

CREATE INDEX IF NOT EXISTS idx_insurance_member ON insurance_policies(member_id);
CREATE INDEX IF NOT EXISTS idx_insurance_import_date ON insurance_policies(import_date);

CREATE INDEX IF NOT EXISTS idx_gold_member ON gold_holdings(member_id);
CREATE INDEX IF NOT EXISTS idx_gold_import_date ON gold_holdings(import_date);

CREATE INDEX IF NOT EXISTS idx_bank_member ON bank_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_bank_import_date ON bank_accounts(import_date);

CREATE INDEX IF NOT EXISTS idx_other_member ON other_assets(member_id);
CREATE INDEX IF NOT EXISTS idx_other_import_date ON other_assets(import_date);

-- Enable Row Level Security on all tables
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_fund_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_members
CREATE POLICY "Users can view own family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for equity_holdings
CREATE POLICY "Users can view own equity holdings"
  ON equity_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equity holdings"
  ON equity_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equity holdings"
  ON equity_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own equity holdings"
  ON equity_holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for mutual_fund_holdings
CREATE POLICY "Users can view own mutual fund holdings"
  ON mutual_fund_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mutual fund holdings"
  ON mutual_fund_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mutual fund holdings"
  ON mutual_fund_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mutual fund holdings"
  ON mutual_fund_holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for fixed_deposits
CREATE POLICY "Users can view own fixed deposits"
  ON fixed_deposits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed deposits"
  ON fixed_deposits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed deposits"
  ON fixed_deposits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed deposits"
  ON fixed_deposits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for insurance_policies
CREATE POLICY "Users can view own insurance policies"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insurance policies"
  ON insurance_policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insurance policies"
  ON insurance_policies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insurance policies"
  ON insurance_policies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for gold_holdings
CREATE POLICY "Users can view own gold holdings"
  ON gold_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gold holdings"
  ON gold_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gold holdings"
  ON gold_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gold holdings"
  ON gold_holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bank_accounts
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for other_assets
CREATE POLICY "Users can view own other assets"
  ON other_assets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own other assets"
  ON other_assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own other assets"
  ON other_assets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own other assets"
  ON other_assets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);