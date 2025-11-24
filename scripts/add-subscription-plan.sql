-- Adicionar coluna de plano de assinatura à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

-- Comentários
COMMENT ON COLUMN users.subscription_plan IS 'Plano de assinatura: free ou premium';
COMMENT ON COLUMN users.subscription_started_at IS 'Data de início da assinatura premium';
COMMENT ON COLUMN users.subscription_expires_at IS 'Data de expiração da assinatura premium';
