-- Add pricing fields to need_proposals table
ALTER TABLE need_proposals 
ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);

-- Add comment explaining the pricing structure
COMMENT ON COLUMN need_proposals.bid_amount IS 'O valor do lance do profissional (valor que ele receberá)';
COMMENT ON COLUMN need_proposals.platform_fee IS 'Taxa da plataforma (10% do lance)';
COMMENT ON COLUMN need_proposals.total_amount IS 'Valor total que o solicitante pagará (lance + taxa)';
