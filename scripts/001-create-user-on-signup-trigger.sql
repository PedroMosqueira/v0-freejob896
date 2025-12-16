-- Função para criar automaticamente um usuário na tabela users quando um novo usuário é criado em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insere novo usuário na tabela users quando email é confirmado
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

-- Remove o trigger se já existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria trigger que executa após inserção em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 'Automaticamente cria um registro na tabela users quando um novo usuário é criado em auth.users';
