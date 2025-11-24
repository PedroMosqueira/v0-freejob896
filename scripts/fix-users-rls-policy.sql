-- Remove existing RLS policies that might be blocking user creation
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create proper RLS policies for the users table
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for users based on user_id" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

CREATE POLICY "Enable update for users based on user_id" ON users
  FOR UPDATE USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
