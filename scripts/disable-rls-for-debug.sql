-- Desabilita RLS temporariamente para debug
-- ATENÇÃO: Isso permite que qualquer usuário veja todas as notificações
-- Use apenas para debug e reverta depois!

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Verifica o status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';
