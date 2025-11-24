-- Add neighborhood and state fields to needs table
ALTER TABLE needs 
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add index for better search performance
CREATE INDEX IF NOT EXISTS idx_needs_location ON needs(city, state, neighborhood);
