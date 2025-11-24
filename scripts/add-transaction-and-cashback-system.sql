-- Adicionar colunas de assinatura e cashback na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cashback_balance numeric DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cashback_earned numeric DEFAULT 0;

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id text REFERENCES needs(id),
  proposal_id uuid REFERENCES need_proposals(id),
  professional_email text NOT NULL,
  client_email text NOT NULL,
  service_amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  total_amount numeric NOT NULL,
  professional_cashback numeric DEFAULT 0,
  client_cashback numeric DEFAULT 0,
  status text DEFAULT 'pending', -- pending, completed, cancelled, refunded
  payment_method text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de histórico de cashback
CREATE TABLE IF NOT EXISTS cashback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  transaction_id uuid REFERENCES transactions(id),
  amount numeric NOT NULL,
  type text NOT NULL, -- earned, used, expired
  description text,
  balance_after numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_professional ON transactions(professional_email);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_email);
CREATE INDEX IF NOT EXISTS idx_transactions_need ON transactions(need_id);
CREATE INDEX IF NOT EXISTS idx_cashback_history_user ON cashback_history(user_email);

-- RLS policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.email() = professional_email OR auth.email() = client_email);

CREATE POLICY "Users can view their own cashback history" ON cashback_history
  FOR SELECT USING (auth.email() = user_email);
