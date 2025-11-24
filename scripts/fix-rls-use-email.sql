-- Drop the old SELECT policy that uses auth.uid()
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;

-- Create new SELECT policy using auth.email() instead
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO public
USING (user_id = auth.email());

-- Verify the new policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'SELECT';
