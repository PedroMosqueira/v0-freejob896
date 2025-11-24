-- FORÇAR remoção completa do trigger e função problemáticos

-- Remover o trigger (se existir)
DROP TRIGGER IF EXISTS check_accepted_proposal_before_rating ON ratings CASCADE;

-- Remover a função (forçando com CASCADE)
DROP FUNCTION IF EXISTS validate_rating_on_accepted_proposal() CASCADE;

-- Verificar se foi removido
DO $$
BEGIN
  RAISE NOTICE 'Trigger e função removidos com sucesso!';
END $$;
