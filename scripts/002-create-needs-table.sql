-- Cria a tabela de pedidos (needs)
CREATE TABLE IF NOT EXISTS public.needs (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    city text NOT NULL,
    requester_email text NOT NULL, -- Email do solicitante
    status text NOT NULL DEFAULT 'aberto', -- 'aberto', 'visita-proposta', 'aceito', 'concluido', 'cancelado'
    created_at timestamp with time zone DEFAULT now(),
    chat_requester_email text,
    chat_provider_email text,
    images text[] -- Array de URLs de imagens
);

-- Excluir políticas existentes antes de recriá-las
DROP POLICY IF EXISTS "Allow public read access for open needs." ON public.needs;
DROP POLICY IF EXISTS "Allow requester to read their own needs." ON public.needs;
DROP POLICY IF EXISTS "Allow authenticated users to create needs." ON public.needs;
DROP POLICY IF EXISTS "Allow requester to update their own needs." ON public.needs;
-- As políticas antigas de provedor foram removidas pois serão substituídas por novas lógicas

-- Opcional: Adicionar RLS (Row Level Security)
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

-- NOTA: TODAS AS POLÍTICAS DE RLS FORAM MOVIDAS PARA O ARQUIVO 006-add-needs-rls.sql
