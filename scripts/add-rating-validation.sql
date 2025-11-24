-- Add validation to ensure only completed services can be rated
-- This prevents users from rating before service is actually done

-- Create function to check if service is completed before allowing rating
CREATE OR REPLACE FUNCTION check_service_completed_before_rating()
RETURNS TRIGGER AS $$
DECLARE
  need_status TEXT;
  proposal_status TEXT;
BEGIN
  -- Get the need status
  SELECT status INTO need_status
  FROM needs
  WHERE id = NEW.need_id;

  -- Get the proposal status
  SELECT status INTO proposal_status
  FROM need_proposals
  WHERE need_id = NEW.need_id
    AND professional_email = NEW.rated_user_email
    AND status = 'accepted';

  -- Allow rating only if:
  -- 1. Need exists and is completed, OR
  -- 2. Proposal was accepted (even if need not marked completed yet)
  IF need_status = 'completed' OR proposal_status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- If neither condition met, prevent rating
  RAISE EXCEPTION 'Você só pode avaliar após o serviço ser aceito ou concluído';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run validation before insert
DROP TRIGGER IF EXISTS trigger_check_service_completed ON ratings;
CREATE TRIGGER trigger_check_service_completed
BEFORE INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION check_service_completed_before_rating();

COMMENT ON FUNCTION check_service_completed_before_rating() IS 'Valida se o serviço foi aceito/concluído antes de permitir avaliação';
