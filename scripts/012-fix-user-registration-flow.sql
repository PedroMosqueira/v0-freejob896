-- Script para corrigir o fluxo de registro de usuários
-- Problema: O trigger anterior criava usuários ANTES do email ser confirmado
-- Solução: Remover o trigger automático e deixar que o usuário se complete após confirmar email

-- 1. Remover o trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Criar função melhorada que será chamada após confirmação de email
CREATE OR REPLACE FUNCTION public.create_user_after_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insere novo usuário na tabela users SOMENTE após email confirmado
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at,
    is_client,
    is_professional,
    phone_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW(),
    false,
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Criar trigger que executa APÓS email ser confirmado
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.create_user_after_signup();

-- 4. Para usuários já criados mas sem entrada em public.users, criar entradas
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, email, created_at, now()
FROM auth.users au
WHERE au.email_confirmed_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
ON CONFLICT (id) DO NOTHING;

COMMENT ON FUNCTION public.create_user_after_signup() IS 'Cria registro na tabela users APÓS email ser confirmado';
