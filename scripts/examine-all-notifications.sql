-- Examinar todas as notificações para identificar diferenças
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  created_at,
  related_need_id,
  related_proposal_id
FROM notifications
ORDER BY created_at DESC;

-- Contar notificações por tipo
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
FROM notifications
GROUP BY type;

-- Verificar se há notificações com tipos inválidos
SELECT DISTINCT type FROM notifications;
