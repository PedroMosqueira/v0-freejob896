-- Update the notifications table to allow the notification types used in the application
-- Drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add a new check constraint with the correct notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('proposal', 'message', 'completion', 'cancellation', 'info', 'warning', 'error', 'success'));

-- Add a comment to document the allowed types
COMMENT ON COLUMN notifications.type IS 'Allowed values: proposal, message, completion, cancellation, info, warning, error, success';
