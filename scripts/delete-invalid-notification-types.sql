-- Remove todas as notificações com tipos inválidos (português)
-- Mantém apenas notificações com tipos válidos em inglês

DELETE FROM notifications
WHERE type NOT IN ('proposal', 'message', 'completion', 'cancellation');

-- Verifica quantas notificações restaram
SELECT 
  type,
  COUNT(*) as quantidade
FROM notifications
GROUP BY type
ORDER BY type;
