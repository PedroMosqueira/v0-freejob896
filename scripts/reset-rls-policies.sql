-- Reset all RLS policies for users table
DROP POLICY IF EXISTS "Permitir criação de usuário durante a autenticação" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- Temporarily disable RLS to allow user creation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with more permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a very permissive policy for user creation
CREATE POLICY "Allow all operations for authenticated users" ON users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a policy for anonymous user creation (for registration)
CREATE POLICY "Allow user creation for anonymous" ON users
FOR INSERT
TO anon
WITH CHECK (true);
