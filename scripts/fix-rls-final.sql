-- Creating clean SQL script without any formatting issues
-- Disable RLS temporarily to fix the policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON users;
DROP POLICY IF EXISTS "Allow service role to insert users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;

-- Create comprehensive policies that allow user creation
CREATE POLICY "Allow user creation during auth" ON users
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow users to view their own data" ON users
    FOR SELECT 
    USING (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Allow users to update their own data" ON users
    FOR UPDATE 
    USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- Re-enable RLS with the new policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
