-- Delete old notifications with invalid type "acceptance"
-- These are from before we fixed the notification system
DELETE FROM notifications
WHERE type = 'acceptance';

-- Optionally, you can also delete all notifications to start fresh:
-- DELETE FROM notifications;
