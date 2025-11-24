-- Adiciona uma coluna para armazenar as mensagens de chat como JSONB na tabela needs
ALTER TABLE public.needs
ADD COLUMN IF NOT EXISTS chat_messages_json JSONB;

-- Opcional: Se você já tem dados e quer migrar o chat existente (se houver)
-- Esta parte é mais complexa e depende da estrutura exata do seu 'chat' em memória.
-- Para este demo, vamos assumir que novos chats serão armazenados aqui.
-- Se você precisar migrar dados existentes, me avise.
