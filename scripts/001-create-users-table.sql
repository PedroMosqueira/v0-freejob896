-- Cria a tabela de usuários para autenticação com Auth.js
-- NOTA: Supabase já tem uma tabela 'auth.users' para usuários autenticados via provedores OAuth.
-- Esta tabela 'public.users' sincroniza automaticamente com auth.users via trigger.

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text DEFAULT '',
    phone text,
    location text,
    is_client boolean DEFAULT false,
    is_professional boolean DEFAULT false,
    phone_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem seu próprio perfil
CREATE POLICY "Allow users to view their own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política para usuários atualizarem seu próprio perfil
CREATE POLICY "Allow users to update their own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Política para usuários não autenticados lerem perfis públicos
CREATE POLICY "Allow anyone to view public profiles"
ON public.users FOR SELECT
TO anon
USING (true);
