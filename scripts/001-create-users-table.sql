-- Cria a tabela de usuários para autenticação com Auth.js
-- NOTA: Supabase já tem uma tabela 'auth.users' para usuários autenticados via provedores OAuth.
-- Esta tabela 'public.users' é para o provedor de credenciais, se você quiser armazenar senhas hash.
-- Em um cenário real, você pode integrar com 'auth.users' ou usar esta tabela para perfis.

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL, -- Armazenará o hash da senha
    created_at timestamp with time zone DEFAULT now()
);

-- Opcional: Adicionar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (exemplo básico, ajuste conforme sua necessidade)
CREATE POLICY "Allow authenticated users to view their own profile."
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to update their own profile."
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Para o provedor de credenciais, você pode precisar de uma política para inserir novos usuários
-- (se o registro for feito diretamente nesta tabela e não via auth.users do Supabase)
-- CUIDADO: Esta política permite que qualquer usuário autenticado insira, ajuste conforme necessário.
CREATE POLICY "Allow authenticated users to insert."
ON public.users FOR INSERT
TO authenticated
WITH CHECK (true);
