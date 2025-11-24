-- Simplified script without sequence reset
-- Remove the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Delete all existing notifications to avoid constraint violations
DELETE FROM notifications;

-- Add new constraint with correct notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('proposal', 'message', 'completion', 'cancellation'));
