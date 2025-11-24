-- Disable Row Level Security on users table temporarily
-- This allows the authentication system to create users without policy restrictions

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Optional: Add a comment to track this change
COMMENT ON TABLE users IS 'RLS temporarily disabled for authentication troubleshooting';
