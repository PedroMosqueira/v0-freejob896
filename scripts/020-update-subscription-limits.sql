-- Add simultaneous interests limit column to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS simultaneous_interests_limit INTEGER DEFAULT -1,
ADD COLUMN IF NOT EXISTS total_interests_limit INTEGER DEFAULT -1;

-- Update existing plans with new limits
-- Plano Simples: 2 simultaneous, unlimited total
UPDATE public.subscription_plans 
SET simultaneous_interests_limit = 2, total_interests_limit = -1
WHERE name = 'Manual' OR slug = 'simples';

-- Plano Agência: 8 simultaneous, unlimited total  
UPDATE public.subscription_plans
SET simultaneous_interests_limit = 8, total_interests_limit = -1
WHERE name = 'Premium' OR slug = 'agencia';

-- Ensure Semestral plan gets proper limits (remove it or keep as historical)
DELETE FROM public.subscription_plans WHERE name = 'Semestral' OR slug = 'semestral';

-- Add column to user_subscriptions to track active interests
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS active_interests_count INTEGER DEFAULT 0;
