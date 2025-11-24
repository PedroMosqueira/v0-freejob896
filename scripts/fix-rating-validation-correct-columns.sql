-- Remove a função antiga
DROP FUNCTION IF EXISTS validate_rating_on_accepted_proposal() CASCADE;

-- Cria a função corrigida com nomes corretos das colunas
CREATE OR REPLACE FUNCTION validate_rating_on_accepted_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se existe proposta aceita entre avaliador e avaliado
  -- Tabela need_proposals usa: professional_email, need_id
  -- Tabela needs usa: requester_email (ou user_id)
  -- Tabela ratings usa: rater_user_email, rated_user_email
  
  IF NOT EXISTS (
    SELECT 1 FROM need_proposals np
    JOIN needs n ON n.id = np.need_id
    WHERE (
      -- Caso 1: Profissional avalia cliente
      (np.professional_email = NEW.rater_user_email AND n.requester_email = NEW.rated_user_email)
      OR
      -- Caso 2: Cliente avalia profissional
      (n.requester_email = NEW.rater_user_email AND np.professional_email = NEW.rated_user_email)
    )
    AND np.status IN ('accepted_by_requester', 'accepted_by_professional')
  ) THEN
    RAISE EXCEPTION 'Você só pode avaliar após ter uma proposta aceita com este usuário';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recria o trigger
DROP TRIGGER IF EXISTS check_accepted_proposal_before_rating ON ratings;
CREATE TRIGGER check_accepted_proposal_before_rating
  BEFORE INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating_on_accepted_proposal();
