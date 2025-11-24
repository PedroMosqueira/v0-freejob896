-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Avaliações são públicas" ON ratings;
DROP POLICY IF EXISTS "Usuários podem criar avaliações" ON ratings;
DROP POLICY IF EXISTS "Usuários podem editar suas avaliações" ON ratings;

-- Habilitar RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública
CREATE POLICY "ratings_select_policy"
ON ratings FOR SELECT
TO public
USING (true);

-- Política para inserção (usuário autenticado pode avaliar)
CREATE POLICY "ratings_insert_policy"
ON ratings FOR INSERT
TO authenticated
WITH CHECK (
  rater_user_email = auth.email()
);

-- Política para atualização (usuário pode editar suas próprias avaliações)
CREATE POLICY "ratings_update_policy"
ON ratings FOR UPDATE
TO authenticated
USING (rater_user_email = auth.email())
WITH CHECK (rater_user_email = auth.email());

-- Política para deleção (usuário pode deletar suas próprias avaliações)
CREATE POLICY "ratings_delete_policy"
ON ratings FOR DELETE
TO authenticated
USING (rater_user_email = auth.email());
