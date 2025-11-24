-- Simple fix for chat_threads RLS policy
-- Temporarily disable RLS to allow chat functionality

ALTER TABLE chat_threads DISABLE ROW LEVEL SECURITY;

-- Optional: Re-enable with permissive policies later
-- ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all chat operations" ON chat_threads FOR ALL USING (true);
