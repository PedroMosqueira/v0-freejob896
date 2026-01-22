-- Criar tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id TEXT NOT NULL REFERENCES needs(id),
  proposal_id UUID NOT NULL REFERENCES need_proposals(id),
  client_email TEXT NOT NULL,
  professional_email TEXT NOT NULL,
  
  -- Valores em centavos
  bid_amount NUMERIC NOT NULL, -- Valor do lance do profissional
  platform_fee NUMERIC NOT NULL, -- Taxa da plataforma (15% do lance)
  professional_bonus NUMERIC NOT NULL, -- Bônus para profissional (5% do lance)
  total_amount NUMERIC NOT NULL, -- Valor total pago pelo cliente (lance + 15%)
  professional_receives NUMERIC NOT NULL, -- Valor que profissional recebe (lance + 5%)
  platform_net NUMERIC NOT NULL, -- Lucro líquido da plataforma (10% do lance)
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, released, refunded, failed
  paid_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  payment_method TEXT,
  failure_reason TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payments_need_id ON payments(need_id);
CREATE INDEX IF NOT EXISTS idx_payments_proposal_id ON payments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_email ON payments(client_email);
CREATE INDEX IF NOT EXISTS idx_payments_professional_email ON payments(professional_email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Comentários
COMMENT ON TABLE payments IS 'Gerencia pagamentos entre clientes e profissionais via Stripe';
COMMENT ON COLUMN payments.bid_amount IS 'Valor do lance original do profissional';
COMMENT ON COLUMN payments.platform_fee IS 'Taxa cobrada do cliente (15% do lance)';
COMMENT ON COLUMN payments.professional_bonus IS 'Bônus pago ao profissional (5% do lance)';
COMMENT ON COLUMN payments.total_amount IS 'Valor total que cliente paga (lance + 15%)';
COMMENT ON COLUMN payments.professional_receives IS 'Valor que profissional recebe (lance + 5%)';
COMMENT ON COLUMN payments.platform_net IS 'Lucro líquido da plataforma (10% do lance)';
COMMENT ON COLUMN payments.status IS 'Status: pending (aguardando), paid (pago), released (liberado para profissional), refunded (reembolsado), failed (falhou)';
