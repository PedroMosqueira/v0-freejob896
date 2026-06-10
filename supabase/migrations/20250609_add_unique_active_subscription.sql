-- Add unique constraint to ensure only one active subscription per user
-- This prevents users from having multiple active plans simultaneously

ALTER TABLE user_subscriptions
ADD CONSTRAINT unique_active_subscription_per_user
UNIQUE (user_id, status)
WHERE status = 'active';

-- Add index for better query performance on user_id and status
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
ON user_subscriptions(user_id, status)
WHERE status = 'active';

-- Clean up any duplicate active subscriptions (keep the most recent one)
DELETE FROM user_subscriptions a
WHERE a.status = 'active'
AND EXISTS (
  SELECT 1 FROM user_subscriptions b
  WHERE b.user_id = a.user_id
  AND b.status = 'active'
  AND b.created_at > a.created_at
);
