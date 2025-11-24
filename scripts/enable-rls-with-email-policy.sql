-- Reabilita RLS na tabela notifications com a política correta
-- Agora usando auth.email() para comparar com o user_id que armazena emails

-- 1. Reabilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Remover política antiga se existir
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;

-- 3. Criar política correta usando auth.email()
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
TO public
USING (user_id = auth.email());

-- 4. Verificar a política criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
AND cmd = 'SELECT';
