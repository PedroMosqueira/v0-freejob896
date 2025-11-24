-- Inserir usuários de exemplo (senhas não hashadas para simplicidade do demo)
-- Em produção, use bcrypt para gerar os hashes das senhas
INSERT INTO public.users (email, password_hash)
VALUES
    ('joao.silva@example.com', 'password123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (email, password_hash)
VALUES
    ('maria.souza@example.com', 'password123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (email, password_hash)
VALUES
    ('ana.pereira@example.com', 'password123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (email, password_hash)
VALUES
    ('pedro.carpinteiro@example.com', 'password123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (email, password_hash)
VALUES
    ('limpa.tudo@example.com', 'password123')
ON CONFLICT (email) DO NOTHING;

-- Inserir dados de pedidos de exemplo
INSERT INTO public.needs (id, title, description, category, city, requester_email, status, created_at, images)
VALUES
    ('need-1', 'Reparo de vazamento na pia da cozinha', 'Vazamento constante na tubulação abaixo da pia da cozinha. Precisa de um encanador urgente.', 'Encanador', 'São Paulo', 'joao.silva@example.com', 'aberto', NOW() - INTERVAL '2 days', ARRAY['/leaky-faucet.png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.needs (id, title, description, category, city, requester_email, status, created_at, images)
VALUES
    ('need-2', 'Instalação de prateleiras na sala', 'Preciso instalar 3 prateleiras de madeira na parede da sala de estar.', 'Montador de Móveis', 'Rio de Janeiro', 'maria.souza@example.com', 'aberto', NOW() - INTERVAL '1 day', ARRAY['/shelf-installation.png'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.needs (id, title, description, category, city, requester_email, status, created_at, chat_requester_email, chat_provider_email, images)
VALUES
    ('need-3', 'Limpeza de sofá a seco', 'Limpeza profissional de um sofá de 3 lugares e uma poltrona.', 'Limpeza', 'Belo Horizonte', 'ana.pereira@example.com', 'aberto', NOW() - INTERVAL '3 days', 'ana.pereira@example.com', 'limpa.tudo@example.com', ARRAY['/sofa-cleaning.png'])
ON CONFLICT (id) DO NOTHING;

-- Inserir propostas de exemplo na nova tabela need_proposals
INSERT INTO public.need_proposals (need_id, professional_email, type, message, when_iso, status, created_at)
VALUES
    ('need-2', 'pedro.carpinteiro@example.com', 'visit_proposal', 'Posso fazer uma visita amanhã de manhã para avaliar.', (NOW() + INTERVAL '1 day')::text, 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.need_proposals (need_id, professional_email, type, message, status, created_at)
VALUES
    ('need-3', 'limpa.tudo@example.com', 'direct_acceptance', 'Aceito o serviço! Podemos combinar os detalhes no chat.', 'pending', NOW() - INTERVAL '2.5 days')
ON CONFLICT (id) DO NOTHING;

-- Inserir mensagens de chat para need-3 (exemplo, em um sistema real, o chat seria uma tabela separada)
-- Para este demo, vamos simular o chat dentro da estrutura do 'needs' para simplificar.
-- Em um sistema real, você teria uma tabela 'chat_messages' e 'chat_threads'.
-- Esta parte não é executável diretamente como um INSERT simples para o campo 'chat' complexo.
-- A lógica de chat será tratada no 'lib/needs-store.ts' ao carregar/salvar.
