-- Atualizar campos de perfil para suportar múltiplos tipos de usuário e verificação de telefone

-- Adicionar campo para permitir que usuário seja cliente E profissional
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Migrar dados existentes do user_type para os novos campos booleanos
UPDATE users
SET 
  is_client = CASE WHEN user_type = 'client' THEN true ELSE false END,
  is_professional = CASE WHEN user_type = 'professional' THEN true ELSE false END
WHERE user_type IS NOT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_is_professional ON users(is_professional) WHERE is_professional = true;
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified) WHERE phone_verified = true;

-- Adicionar política RLS para permitir visualização de perfis públicos
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone"
  ON users
  FOR SELECT
  USING (true);
