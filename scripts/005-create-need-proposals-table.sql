-- Cria a tabela para armazenar propostas de profissionais para os pedidos (needs)
CREATE TABLE IF NOT EXISTS public.need_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    need_id text NOT NULL REFERENCES public.needs(id) ON DELETE CASCADE, -- Chave estrangeira para a tabela needs
    professional_email text NOT NULL, -- Email do profissional que fez a proposta
    type text NOT NULL, -- 'visit_proposal' ou 'direct_acceptance'
    message text,
    when_iso text, -- Data ISO para propostas de visita
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted_by_requester', 'declined_by_requester'
    created_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone -- Quando o solicitante aceitou esta proposta específica
);

-- Opcional: Adicionar RLS (Row Level Security)
ALTER TABLE public.need_proposals ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir que o profissional veja suas próprias propostas
CREATE POLICY "Allow professional to read their own proposals."
ON public.need_proposals FOR SELECT
USING (professional_email = auth.email());

-- Permitir que o solicitante veja propostas para seus próprios pedidos
CREATE POLICY "Allow requester to read proposals for their needs."
ON public.need_proposals FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.needs
        WHERE needs.id = need_proposals.need_id AND needs.requester_email = auth.email()
    )
);

-- Permitir que profissionais autenticados criem propostas
CREATE POLICY "Allow authenticated professionals to create proposals."
ON public.need_proposals FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que o solicitante atualize o status das propostas para seus pedidos
CREATE POLICY "Allow requester to update proposal status for their needs."
ON public.need_proposals FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.needs
        WHERE needs.id = need_proposals.need_id AND needs.requester_email = auth.email()
    )
);
