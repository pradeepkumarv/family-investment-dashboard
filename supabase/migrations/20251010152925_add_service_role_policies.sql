/*
  # Add Service Role Policies for Backend Imports
  
  Backend services using SERVICE_ROLE key need bypass policies to insert data.
  This adds policies that allow service_role to perform all operations.
*/

-- Add service_role policies for equity_holdings
CREATE POLICY "Service role can manage equity holdings"
  ON equity_holdings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for mutual_fund_holdings
CREATE POLICY "Service role can manage mutual fund holdings"
  ON mutual_fund_holdings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for fixed_deposits
CREATE POLICY "Service role can manage fixed deposits"
  ON fixed_deposits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for insurance_policies
CREATE POLICY "Service role can manage insurance policies"
  ON insurance_policies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for gold_holdings
CREATE POLICY "Service role can manage gold holdings"
  ON gold_holdings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for bank_accounts
CREATE POLICY "Service role can manage bank accounts"
  ON bank_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policies for other_assets
CREATE POLICY "Service role can manage other assets"
  ON other_assets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service_role policy for family_members
CREATE POLICY "Service role can manage family members"
  ON family_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);