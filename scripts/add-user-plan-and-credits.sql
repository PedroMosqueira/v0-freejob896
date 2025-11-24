-- Adicionar sistema de planos e créditos aos usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_credits_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adicionar campos de prazos e status ao chat_threads
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS client_viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS bid_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS bid_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS client_response_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS credit_returned BOOLEAN DEFAULT FALSE;

-- Adicionar campos de conclusão ao need_proposals
ALTER TABLE need_proposals ADD COLUMN IF NOT EXISTS completed_by_professional_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE need_proposals ADD COLUMN IF NOT EXISTS confirmed_by_client_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE need_proposals ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'pending'; -- pending, completed, confirmed, disputed

-- Adicionar campos de suspensão aos needs
ALTER TABLE needs ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE needs ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_chat_threads_deadlines ON chat_threads(bid_deadline, client_response_deadline);
CREATE INDEX IF NOT EXISTS idx_needs_suspended ON needs(suspended);
