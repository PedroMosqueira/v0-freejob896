-- Verificar se existem usuários cadastrados na tabela users
SELECT 
  COUNT(*) as total_users,
  MIN(created_at) as primeiro_usuario,
  MAX(created_at) as ultimo_usuario
FROM users;

-- Mostrar alguns exemplos de usuários (sem mostrar senhas)
SELECT 
  id,
  email,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
