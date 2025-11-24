-- Remove the old INSERT policy that's not working
DROP POLICY IF EXISTS "Users can insert notifications via service role" ON notifications;

-- Create a new INSERT policy that allows service role to insert
-- This policy allows any authenticated connection to insert notifications
-- The service role will be able to insert on behalf of users
CREATE POLICY "Allow service role to insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
