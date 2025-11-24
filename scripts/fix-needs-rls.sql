-- Disable RLS temporarily on needs and need_proposals tables to allow operations
ALTER TABLE needs DISABLE ROW LEVEL SECURITY;
ALTER TABLE need_proposals DISABLE ROW LEVEL SECURITY;

-- Optional: Re-enable with proper policies later
-- ALTER TABLE needs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE need_proposals ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for needs table
-- CREATE POLICY "Allow all operations on needs" ON needs FOR ALL USING (true);
-- CREATE POLICY "Allow all operations on need_proposals" ON need_proposals FOR ALL USING (true);
