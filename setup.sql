-- Quick Setup Script for HDFC Import
-- Run this in Supabase SQL Editor

-- Step 1: Check your auth user ID
SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Insert family members
-- Replace 'YOUR-USER-ID-HERE' with the ID from Step 1
INSERT INTO family_members (user_id, name, relationship, is_primary)
VALUES
  ('YOUR-USER-ID-HERE', 'Pradeep', 'Self', true),
  ('YOUR-USER-ID-HERE', 'Sanchita', 'Spouse', false)
RETURNING id, name, relationship;

-- Step 3: Verify family members were created
SELECT
  fm.id as member_id,
  fm.name,
  fm.relationship,
  fm.user_id,
  au.email as user_email
FROM family_members fm
LEFT JOIN auth.users au ON fm.user_id = au.id;

-- You should see 2 rows with the same user_id
