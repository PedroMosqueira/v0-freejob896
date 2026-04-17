-- Adicionar campos profissionais à tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS professional_phone TEXT,
ADD COLUMN IF NOT EXISTS free_interests_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS total_interests_sent INTEGER DEFAULT 0;

-- Criar índice para CPF (único)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf) WHERE cpf IS NOT NULL;

-- Criar índice para professional_phone
CREATE INDEX IF NOT EXISTS idx_users_professional_phone ON users(professional_phone);

-- Adicionar coluna para rastrear quando o usuário preencheu dados profissionais
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS professional_verified_at TIMESTAMP WITH TIME ZONE;

-- Comentário sobre os campos
COMMENT ON COLUMN users.cpf IS 'CPF do profissional (obrigatório para profissionais)';
COMMENT ON COLUMN users.professional_phone IS 'Telefone de contato profissional';
COMMENT ON COLUMN users.free_interests_remaining IS 'Quantidade de "tenho interesse" gratuitos restantes (máximo 3)';
COMMENT ON COLUMN users.total_interests_sent IS 'Total de "tenho interesse" enviados (gratuitos + pagos)';
COMMENT ON COLUMN users.professional_verified_at IS 'Data quando o profissional preencheu dados completos';
