-- Enable Realtime for chat_threads table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_threads;

-- Verify Realtime is enabled
SELECT schemaname, tablename, 
       CASE WHEN tablename = ANY(
         SELECT tablename FROM pg_publication_tables 
         WHERE pubname = 'supabase_realtime'
       ) THEN 'ENABLED' ELSE 'DISABLED' END as realtime_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'chat_threads';
