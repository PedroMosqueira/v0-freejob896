-- Make password_hash column nullable since we're using Supabase Auth for password verification
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add a comment to explain why password_hash can be null
COMMENT ON COLUMN users.password_hash IS 'Password hash for custom auth. Can be null when using Supabase Auth.';
