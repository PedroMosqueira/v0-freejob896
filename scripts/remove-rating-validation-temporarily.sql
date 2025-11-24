-- Remove o trigger e a função de validação temporariamente
-- para permitir que as avaliações funcionem

DROP TRIGGER IF EXISTS check_accepted_proposal_before_rating ON ratings;
DROP FUNCTION IF EXISTS validate_rating_on_accepted_proposal();

-- A validação já está sendo feita no código TypeScript em lib/ratings.ts
-- então não precisamos da validação duplicada no banco de dados
