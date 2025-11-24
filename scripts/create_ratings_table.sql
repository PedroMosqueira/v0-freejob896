-- Criar tabela de avaliações
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rated_user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  rater_user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  need_id TEXT REFERENCES needs(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que um usuário só avalie outro uma vez por serviço
  UNIQUE(rated_user_email, rater_user_email, need_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON ratings(rated_user_email);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_user ON ratings(rater_user_email);
CREATE INDEX IF NOT EXISTS idx_ratings_need ON ratings(need_id);

-- RLS Policies
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler avaliações
CREATE POLICY "Avaliações são públicas"
ON ratings FOR SELECT
TO public
USING (true);

-- Usuários autenticados podem criar avaliações
CREATE POLICY "Usuários podem criar avaliações"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (rater_user_email = current_setting('request.jwt.claim.email', true));

-- Usuários podem atualizar suas próprias avaliações
CREATE POLICY "Usuários podem editar suas avaliações"
ON ratings FOR UPDATE
TO authenticated
USING (rater_user_email = current_setting('request.jwt.claim.email', true));

-- Função para recalcular média de avaliação
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM ratings
    WHERE rated_user_email = COALESCE(NEW.rated_user_email, OLD.rated_user_email)
  )
  WHERE email = COALESCE(NEW.rated_user_email, OLD.rated_user_email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar rating automaticamente
DROP TRIGGER IF EXISTS trigger_update_user_rating ON ratings;
CREATE TRIGGER trigger_update_user_rating
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_user_rating();

COMMENT ON TABLE ratings IS 'Avaliações de usuários por outros usuários';
COMMENT ON COLUMN ratings.rated_user_email IS 'Email do usuário sendo avaliado';
COMMENT ON COLUMN ratings.rater_user_email IS 'Email do usuário que está avaliando';
COMMENT ON COLUMN ratings.need_id IS 'ID do serviço relacionado à avaliação';
COMMENT ON COLUMN ratings.rating IS 'Nota de 1 a 5 estrelas';
COMMENT ON COLUMN ratings.comment IS 'Comentário opcional sobre a avaliação';
