-- Add new status values to the proposal_status enum
-- These support the new simplified interest flow

-- First, check if the enum type exists and add new values if they don't exist
DO $$ 
BEGIN
    -- Add 'interested' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'interested' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'proposal_status')
    ) THEN
        ALTER TYPE proposal_status ADD VALUE 'interested';
    END IF;
    
    -- Add 'accepted_by_professional' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'accepted_by_professional' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'proposal_status')
    ) THEN
        ALTER TYPE proposal_status ADD VALUE 'accepted_by_professional';
    END IF;
    
    -- Add 'declined_by_professional' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'declined_by_professional' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'proposal_status')
    ) THEN
        ALTER TYPE proposal_status ADD VALUE 'declined_by_professional';
    END IF;
    
    -- Add 'pending_requester_approval' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'pending_requester_approval' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'proposal_status')
    ) THEN
        ALTER TYPE proposal_status ADD VALUE 'pending_requester_approval';
    END IF;
    
    -- Add 'cancelled' status for bids replaced by newer bids
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'cancelled' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'proposal_status')
    ) THEN
        ALTER TYPE proposal_status ADD VALUE 'cancelled';
    END IF;
END $$;

-- Update comment to include cancelled status
COMMENT ON COLUMN need_proposals.status IS 'Status of proposal: pending, accepted_by_requester, declined_by_requester, interested, accepted_by_professional, declined_by_professional, pending_requester_approval, or cancelled';
