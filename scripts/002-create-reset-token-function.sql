-- Create a function to insert password reset tokens
-- This bypasses any potential SDK issues by using SQL directly

CREATE OR REPLACE FUNCTION create_password_reset_token(
  p_user_id UUID,
  p_token TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ,
  used BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
  VALUES (p_user_id, p_token, p_expires_at, false)
  RETURNING 
    password_reset_tokens.id,
    password_reset_tokens.user_id,
    password_reset_tokens.token,
    password_reset_tokens.expires_at,
    password_reset_tokens.used,
    password_reset_tokens.created_at;
END;
$$;

-- Grant execute permission to authenticated and service role
GRANT EXECUTE ON FUNCTION create_password_reset_token TO authenticated, service_role, anon;
