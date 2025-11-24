-- Drop da função antiga que usa 'accepted' incorretamente
DROP FUNCTION IF EXISTS validate_rating_relationship();

-- Recria a função com os valores corretos do enum
CREATE OR REPLACE FUNCTION validate_rating_relationship()
RETURNS TRIGGER AS $$
DECLARE
  need_status TEXT;
  proposal_status TEXT;
BEGIN
  -- Verifica se o rater está tentando avaliar a si mesmo
  IF NEW.rater_user_email = NEW.rated_user_email THEN
    RAISE EXCEPTION 'Você não pode avaliar a si mesmo';
  END IF;

  -- Se tem need_id, verifica se há proposta aceita
  IF NEW.need_id IS NOT NULL THEN
    -- Busca o status do pedido e da proposta
    SELECT n.status, np.status
    INTO need_status, proposal_status
    FROM needs n
    LEFT JOIN need_proposals np ON np.need_id = n.id
    WHERE n.id = NEW.need_id
      AND np.professional_email = NEW.rated_user_email
      AND np.status IN ('accepted_by_requester', 'accepted_by_professional')
    LIMIT 1;

    -- Corrigindo validação para usar enum correto
    -- Se não encontrou proposta aceita, não permite avaliar
    IF proposal_status IS NULL THEN
      RAISE EXCEPTION 'Você só pode avaliar profissionais cujas propostas foram aceitas';
    END IF;
  END IF;

  -- Verifica se já existe avaliação duplicada
  IF EXISTS (
    SELECT 1 FROM ratings
    WHERE rated_user_email = NEW.rated_user_email
      AND rater_user_email = NEW.rater_user_email
      AND (need_id = NEW.need_id OR (need_id IS NULL AND NEW.need_id IS NULL))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Você já avaliou este usuário para este serviço';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recria o trigger
DROP TRIGGER IF EXISTS validate_rating_before_insert ON ratings;
CREATE TRIGGER validate_rating_before_insert
  BEFORE INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating_relationship();
