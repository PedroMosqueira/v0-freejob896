-- Remove a constraint antiga
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Limpa todas as notificações existentes que podem ter tipos inválidos
DELETE FROM notifications;

-- Adiciona a nova constraint com os tipos corretos
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('proposal', 'message', 'completion', 'cancellation'));

-- Reseta a sequência do ID para começar do 1 novamente
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
