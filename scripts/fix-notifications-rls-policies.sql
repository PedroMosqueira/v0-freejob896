-- Remove a política SELECT complexa que está causando problemas
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- Garante que a política simples existe
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;

CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO public
USING (user_id = (auth.uid())::text);

-- Verifica as políticas restantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'notifications'
  AND cmd = 'SELECT'
ORDER BY policyname;
