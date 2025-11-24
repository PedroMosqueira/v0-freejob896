-- Adicionar novos valores ao enum proposal_status para respostas do profissional após visita

-- Verificar valores atuais do enum
-- SELECT unnest(enum_range(NULL::proposal_status))::text;

-- Adicionar novos valores se não existirem
DO $$ 
BEGIN
    -- Tentar adicionar 'accepted_by_professional'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted_by_professional' AND enumtypid = 'proposal_status'::regtype) THEN
        ALTER TYPE proposal_status ADD VALUE 'accepted_by_professional';
    END IF;
    
    -- Tentar adicionar 'declined_by_professional'
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'declined_by_professional' AND enumtypid = 'proposal_status'::regtype) THEN
        ALTER TYPE proposal_status ADD VALUE 'declined_by_professional';
    END IF;
END $$;
