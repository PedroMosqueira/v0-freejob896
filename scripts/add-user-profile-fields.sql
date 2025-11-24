-- Add profile fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'client', -- 'client' or 'professional'
ADD COLUMN IF NOT EXISTS skills text[], -- Array of skills for professionals
ADD COLUMN IF NOT EXISTS rating numeric(3,2) DEFAULT 0.00, -- Average rating (0.00 to 5.00)
ADD COLUMN IF NOT EXISTS total_services integer DEFAULT 0, -- Total services completed
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON public.users;
CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Update RLS policies to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
TO authenticated
USING (email = auth.email());

-- Allow users to read other users' public profile info (for displaying professional profiles)
DROP POLICY IF EXISTS "Users can read public profiles" ON public.users;
CREATE POLICY "Users can read public profiles"
ON public.users FOR SELECT
TO authenticated
USING (true);
