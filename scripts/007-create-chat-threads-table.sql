-- Cria a tabela para armazenar threads de chat individuais entre um solicitante e um profissional para um serviço
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    need_id text NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE, -- O serviço ao qual este chat pertence
    requester_email text NOT NULL, -- Email do solicitante do serviço (para RLS e contexto)
    professional_email text NOT NULL, -- Email do profissional neste chat específico (para RLS e contexto)
    messages_json JSONB DEFAULT '[]'::jsonb, -- Array de mensagens JSON para este thread
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    -- Garante que haja apenas um thread de chat por par (need_id, requester_email, professional_email)
    UNIQUE (need_id, requester_email, professional_email)
);

-- Opcional: Adicionar RLS (Row Level Security)
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para chat_threads
-- Permitir que o solicitante leia e escreva em seus próprios threads de chat
CREATE POLICY "Allow requester to manage their own chat threads."
ON public.chat_threads FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (requester_email = auth.email())
WITH CHECK (requester_email = auth.email());

-- Permitir que o profissional leia e escreva em seus próprios threads de chat
CREATE POLICY "Allow professional to manage their own chat threads."
ON public.chat_threads FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (professional_email = auth.email())
WITH CHECK (professional_email = auth.email());

-- Atualiza a coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_chat_threads_updated_at
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
