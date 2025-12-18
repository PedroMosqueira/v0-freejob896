-- Drop existing policies
DROP POLICY IF EXISTS "ratings_insert_policy" ON ratings;
DROP POLICY IF EXISTS "ratings_select_policy" ON ratings;
DROP POLICY IF EXISTS "ratings_update_policy" ON ratings;
DROP POLICY IF EXISTS "ratings_delete_policy" ON ratings;

-- Allow users to insert ratings if they are the rater
-- and the rating is for a need where they were involved (either as requester or professional)
CREATE POLICY "ratings_insert_policy" ON ratings
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = rater_user_email
    AND (
      -- User is the requester of the need
      EXISTS (
        SELECT 1 FROM needs
        WHERE needs.id = ratings.need_id
        AND needs.requester_email = auth.uid()::text
      )
      OR
      -- User is a professional with an accepted proposal for the need
      EXISTS (
        SELECT 1 FROM need_proposals
        WHERE need_proposals.need_id = ratings.need_id
        AND need_proposals.professional_email = auth.uid()::text
        AND need_proposals.status = 'accepted'
      )
    )
    -- Prevent duplicate ratings
    AND NOT EXISTS (
      SELECT 1 FROM ratings r
      WHERE r.need_id = ratings.need_id
      AND r.rater_user_email = ratings.rater_user_email
      AND r.rated_user_email = ratings.rated_user_email
    )
  );

-- Allow users to view all ratings (public read)
CREATE POLICY "ratings_select_policy" ON ratings
  FOR SELECT
  USING (true);

-- Allow users to update their own ratings
CREATE POLICY "ratings_update_policy" ON ratings
  FOR UPDATE
  USING (auth.uid()::text = rater_user_email)
  WITH CHECK (auth.uid()::text = rater_user_email);

-- Allow users to delete their own ratings
CREATE POLICY "ratings_delete_policy" ON ratings
  FOR DELETE
  USING (auth.uid()::text = rater_user_email);
