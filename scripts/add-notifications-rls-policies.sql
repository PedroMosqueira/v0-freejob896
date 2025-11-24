-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'email'
  OR user_id IN (
    SELECT email FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Policy: Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'email'
  OR user_id IN (
    SELECT email FROM users WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Policy: Allow service role to insert notifications (for server-side creation)
CREATE POLICY "System can insert notifications"
ON notifications
FOR INSERT
WITH CHECK (true);
