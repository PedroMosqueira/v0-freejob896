-- Remove all existing notifications to start fresh with the new notification system
DELETE FROM notifications;

-- Verify the table is empty
SELECT COUNT(*) as remaining_notifications FROM notifications;
