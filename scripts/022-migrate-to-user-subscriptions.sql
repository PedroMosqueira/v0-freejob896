-- This migration properly sets up user_subscriptions as the source of truth
-- while keeping subscription_plan in users for quick denormalized access

-- Add subscription_plan to users if it doesn't exist (for quick access cache)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

-- Ensure user_subscriptions has all needed columns
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS founder_discount NUMERIC DEFAULT 0;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_status 
ON public.user_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON public.user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_current_period_end 
ON public.user_subscriptions(current_period_end);

-- Add foreign key constraint if it doesn't exist
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS fk_user_subscriptions_plan_id,
ADD CONSTRAINT fk_user_subscriptions_plan_id 
  FOREIGN KEY (plan_id) 
  REFERENCES public.subscription_plans(id) 
  ON DELETE RESTRICT;

-- Add comments for documentation
COMMENT ON TABLE public.user_subscriptions IS 'Source of truth for user subscriptions. subscription_plan in users table is denormalized cache';
COMMENT ON COLUMN public.user_subscriptions.plan_id IS 'Foreign key to subscription_plans - defines which plan user is on';
COMMENT ON COLUMN public.user_subscriptions.status IS 'Subscription status: active, paused, canceled, past_due';
COMMENT ON COLUMN public.user_subscriptions.billing_cycle IS 'Billing cycle: monthly or annual';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for webhook integration';
COMMENT ON COLUMN public.users.subscription_plan IS 'Denormalized cache of current plan slug from user_subscriptions - query user_subscriptions for authoritative data';
