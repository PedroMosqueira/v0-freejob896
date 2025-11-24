-- Add validation to ensure only accepted services can be rated
-- This prevents users from rating before service is actually accepted

-- Create function to check if proposal was accepted before allowing rating
CREATE OR REPLACE FUNCTION check_proposal_accepted_before_rating()
RETURNS TRIGGER AS $$
DECLARE
  proposal_status TEXT;
BEGIN
  -- Get the proposal status for this need and professional
  SELECT status INTO proposal_status
  FROM need_proposals
  WHERE need_id = NEW.need_id
    AND professional_email = NEW.rated_user_email
    AND status IN ('accepted_by_requester', 'accepted_by_professional');

  -- Allow rating only if proposal was accepted
  IF proposal_status IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If no accepted proposal found, prevent rating
  RAISE EXCEPTION 'Você só pode avaliar profissionais cujas propostas foram aceitas';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run validation before insert
DROP TRIGGER IF EXISTS trigger_check_proposal_accepted ON ratings;
CREATE TRIGGER trigger_check_proposal_accepted
BEFORE INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION check_proposal_accepted_before_rating();

COMMENT ON FUNCTION check_proposal_accepted_before_rating() IS 'Valida se a proposta foi aceita antes de permitir avaliação';
