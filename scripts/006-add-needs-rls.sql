-- Excluir políticas existentes antes de recriá-las (para o caso de já existirem)
DROP POLICY IF EXISTS "Allow public read access for open needs." ON public.needs;
DROP POLICY IF EXISTS "Allow requester to read their own needs." ON public.needs;
DROP POLICY IF EXISTS "Allow authenticated users to create needs." ON public.needs;
DROP POLICY IF EXISTS "Allow requester to update their own needs." ON public.needs;
DROP POLICY IF EXISTS "Allow chat provider to manage chat and update status." ON public.needs;
DROP POLICY IF EXISTS "Allow chat provider to read needs for chat context." ON public.needs;

-- NOVAS E ATUALIZADAS POLÍTICAS DE RLS

-- Permitir que todos leiam pedidos com status 'aberto'
CREATE POLICY "Allow public read for open needs."
ON public.needs FOR SELECT
USING (status = 'aberto');

-- Permitir que o solicitante leia e atualize seus próprios pedidos (ex: status, chat)
CREATE POLICY "Allow requester to manage their own needs."
ON public.needs FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (requester_email = auth.email())
WITH CHECK (requester_email = auth.email());

-- Permitir que usuários autenticados criem novos pedidos
CREATE POLICY "Allow authenticated users to create needs."
ON public.needs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que o profissional associado ao chat (chat_provider_email) leia e atualize o chat
-- e talvez o status para 'concluido' ou 'cancelado' no futuro.
CREATE POLICY "Allow chat provider to manage chat and update status."
ON public.needs FOR UPDATE -- Permite UPDATE (incluindo chat e status)
TO authenticated
USING (
    chat_provider_email = auth.email() OR -- Se o usuário logado é o provedor no chat
    EXISTS ( -- OU se o usuário logado tem uma proposta ACEITA para este pedido
        SELECT 1
        FROM public.need_proposals
        WHERE
            need_proposals.need_id = needs.id
            AND need_proposals.professional_email = auth.email()
            AND need_proposals.status = 'accepted_by_requester'
    )
)
WITH CHECK (
    chat_provider_email = auth.email() OR
    EXISTS (
        SELECT 1
        FROM public.need_proposals
        WHERE
            need_proposals.need_id = needs.id
            AND need_proposals.professional_email = auth.email()
            AND need_proposals.status = 'accepted_by_requester'
    )
);

-- Permitir que o profissional associado ao chat leia os dados do pedido (para contexto do chat)
CREATE POLICY "Allow chat provider to read needs for chat context."
ON public.needs FOR SELECT
TO authenticated
USING (
    chat_provider_email = auth.email() OR
    EXISTS (
        SELECT 1
        FROM public.need_proposals
        WHERE
            need_proposals.need_id = needs.id
            AND need_proposals.professional_email = auth.email()
            AND need_proposals.status = 'accepted_by_requester' -- Se aceitou, ele pode ler
    )
);
