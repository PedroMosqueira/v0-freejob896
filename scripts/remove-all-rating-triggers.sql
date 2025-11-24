-- Remove TODOS os triggers e funções relacionadas a validação de ratings
-- Isso resolve o erro de enum 'accepted' que não existe

-- Remove todos os triggers possíveis
DROP TRIGGER IF EXISTS trigger_check_service_completed ON ratings CASCADE;
DROP TRIGGER IF EXISTS trigger_check_proposal_accepted ON ratings CASCADE;
DROP TRIGGER IF EXISTS check_accepted_proposal_before_rating ON ratings CASCADE;

-- Remove todas as funções possíveis
DROP FUNCTION IF EXISTS check_service_completed_before_rating() CASCADE;
DROP FUNCTION IF EXISTS check_proposal_accepted_before_rating() CASCADE;
DROP FUNCTION IF EXISTS validate_rating_on_accepted_proposal() CASCADE;

-- A validação agora é feita APENAS no código TypeScript em lib/ratings.ts
-- que usa os valores corretos do enum: 'accepted_by_requester' e 'accepted_by_professional'
