-- Add "interested" as a valid status for proposals
-- This allows tracking when a professional shows interest without sending a formal bid

COMMENT ON COLUMN need_proposals.status IS 'Status of proposal: pending, accepted_by_requester, accepted_by_professional, declined_by_professional, declined_by_requester, or interested';
