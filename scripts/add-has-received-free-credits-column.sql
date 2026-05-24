-- Add column to track if user has already received free credits
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_received_free_credits BOOLEAN DEFAULT false;

-- Comment
COMMENT ON COLUMN users.has_received_free_credits IS 'Tracks whether the user has already received their initial 3 free proposals. Can only receive once.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_has_received_free_credits ON users(has_received_free_credits);
