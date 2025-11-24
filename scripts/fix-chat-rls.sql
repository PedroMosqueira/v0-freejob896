-- Fix RLS policies for existing chat and content tables
-- This allows users to create and access chat threads, needs, and proposals

-- Fix chat_threads table policies
DROP POLICY IF EXISTS "Users can view their own chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Users can create chat threads" ON chat_threads;
DROP POLICY IF EXISTS "Users can update their own chat threads" ON chat_threads;

CREATE POLICY "Allow chat thread creation" ON chat_threads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow chat thread viewing" ON chat_threads
    FOR SELECT USING (true);

CREATE POLICY "Allow chat thread updates" ON chat_threads
    FOR UPDATE USING (true);

-- Fix needs table policies
DROP POLICY IF EXISTS "Users can view needs" ON needs;
DROP POLICY IF EXISTS "Users can create needs" ON needs;
DROP POLICY IF EXISTS "Users can update needs" ON needs;

CREATE POLICY "Allow needs creation" ON needs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow needs viewing" ON needs
    FOR SELECT USING (true);

CREATE POLICY "Allow needs updates" ON needs
    FOR UPDATE USING (true);

-- Fix need_proposals table policies
DROP POLICY IF EXISTS "Users can view proposals" ON need_proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON need_proposals;
DROP POLICY IF EXISTS "Users can update proposals" ON need_proposals;

CREATE POLICY "Allow proposal creation" ON need_proposals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow proposal viewing" ON need_proposals
    FOR SELECT USING (true);

CREATE POLICY "Allow proposal updates" ON need_proposals
    FOR UPDATE USING (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE need_proposals ENABLE ROW LEVEL SECURITY;
</sql>
