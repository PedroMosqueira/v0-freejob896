SELECT 
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  related_need_id,
  related_proposal_id,
  created_at
FROM notifications
ORDER BY created_at DESC;
