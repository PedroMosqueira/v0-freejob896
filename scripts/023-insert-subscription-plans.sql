-- Insert subscription plans into subscription_plans table
INSERT INTO public.subscription_plans (id, name, slug, description, price_monthly, price_annual, stripe_price_id_monthly, stripe_price_id_annual, features, is_active, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    'Plano Simples',
    'simples',
    'Perfeito para profissionais iniciantes',
    29.90,
    299.00,
    'price_1QxxxxxSimples_monthly',
    'price_1QxxxxxSimples_annual',
    '["Até 5 propostas simultâneas", "Chat com clientes", "Dashboard básico", "Suporte por email"]'::jsonb,
    true,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Plano Agência',
    'agencia',
    'Para agências e profissionais com alto volume',
    49.90,
    499.00,
    'price_1QxxxxxAgencia_monthly',
    'price_1QxxxxxAgencia_annual',
    '["Propostas ilimitadas", "Chat ilimitado", "Dashboard avançado", "Analytics detalhado", "Prioridade no suporte", "API de integração"]'::jsonb,
    true,
    NOW(),
    NOW()
  );
