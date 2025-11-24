-- Add interest_only type to need_proposals
-- This allows tracking when a professional shows interest without immediately sending a bid

-- No table structure changes needed, just using existing type field with new value
-- The type field already accepts text values, so 'interest_only' will work

-- Update any existing logic if needed
COMMENT ON COLUMN need_proposals.type IS 'Type of proposal: direct_acceptance, visit_proposal, or interest_only';
