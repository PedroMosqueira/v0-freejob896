-- Show complete SELECT policy definitions for notifications table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND cmd = 'SELECT'
ORDER BY policyname;

-- Also show the raw policy definition
SELECT 
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'notifications'
  AND polcmd = 'r'  -- 'r' means SELECT
ORDER BY polname;
