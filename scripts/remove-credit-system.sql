-- Remover colunas antigas do sistema de créditos
ALTER TABLE users DROP COLUMN IF EXISTS plan;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_credits_used;
ALTER TABLE users DROP COLUMN IF EXISTS credits_reset_date;

-- Comentário
COMMENT ON TABLE users IS 'Usuários agora usam subscription_plan ao invés de créditos';
