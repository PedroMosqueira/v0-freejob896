-- Remove as colunas de chat da tabela needs, pois o chat agora será gerenciado na tabela chat_threads
ALTER TABLE public.needs
DROP COLUMN IF EXISTS chat_requester_email,
DROP COLUMN IF NOT EXISTS chat_provider_email,
DROP COLUMN IF NOT EXISTS chat_messages_json;
