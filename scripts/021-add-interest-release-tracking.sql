-- Add columns to track simultaneous interest release logic
ALTER TABLE public.need_proposals
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_before_viewed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS viewed_by_requester_at timestamp with time zone;

-- Add index for queries that check 2h timeout
CREATE INDEX IF NOT EXISTS idx_need_proposals_cancelled_at 
ON public.need_proposals(professional_email, cancelled_at) 
WHERE status = 'cancelled' AND cancelled_at IS NOT NULL;

-- Add index for active proposals
CREATE INDEX IF NOT EXISTS idx_need_proposals_active
ON public.need_proposals(professional_email, status)
WHERE status NOT IN ('cancelled', 'completed');
