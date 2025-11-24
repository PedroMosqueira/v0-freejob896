-- Remove o trigger primeiro para evitar dependências
DROP TRIGGER IF EXISTS check_accepted_proposal_before_rating ON ratings;

-- Remove a função antiga
DROP FUNCTION IF EXISTS validate_rating_on_accepted_proposal();

-- Cria a função corrigida com os nomes corretos das colunas
CREATE OR REPLACE FUNCTION validate_rating_on_accepted_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se existe proposta aceita entre avaliador e avaliado
  IF NOT EXISTS (
    SELECT 1 FROM need_proposals np
    JOIN needs n ON n.id = np.need_id
    WHERE (
      -- Profissional avaliando cliente
      (np.professional_email = NEW.rater_user_email AND n.requester_email = NEW.rated_user_email)
      OR
      -- Cliente avaliando profissional
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
CREATE TRIGGER check_accepted_proposal_before_rating
  BEFORE INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating_on_accepted_proposal();
