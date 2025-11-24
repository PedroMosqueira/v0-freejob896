-- Fix RLS policies for users table to allow proper user creation
-- This allows the authentication system to create users after email verification

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies that work with the authentication flow
CREATE POLICY "Allow user creation during auth" ON users
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT 
  USING (auth.uid()::text = id::text OR auth.email() = email);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE 
  USING (auth.uid()::text = id::text OR auth.email() = email);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
