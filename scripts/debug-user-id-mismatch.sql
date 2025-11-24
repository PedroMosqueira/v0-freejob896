-- Debug script to check user_id mismatch between notifications and auth

-- 1. Show current authenticated user
SELECT 
  'Current Auth User' as info,
  auth.uid() as auth_uid,
  (auth.uid())::text as auth_uid_text,
  current_setting('request.jwt.claims', true)::json->>'sub' as jwt_sub;

-- 2. Show all notifications with their user_ids
SELECT 
  'All Notifications' as info,
  id,
  user_id,
  type,
  title,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if any notifications match the current user
SELECT 
  'Matching Notifications' as info,
  COUNT(*) as total_count,
  COUNT(CASE WHEN user_id = (auth.uid())::text THEN 1 END) as matching_count,
  COUNT(CASE WHEN user_id != (auth.uid())::text THEN 1 END) as non_matching_count
FROM notifications;

-- 4. Show user_id format comparison
SELECT 
  'Format Comparison' as info,
  user_id as stored_user_id,
  (auth.uid())::text as current_auth_uid,
  CASE 
    WHEN user_id = (auth.uid())::text THEN 'MATCH'
    ELSE 'NO MATCH'
  END as comparison
FROM notifications
ORDER BY created_at DESC
LIMIT 5;
