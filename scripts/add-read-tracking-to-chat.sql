-- Add columns to track when each user last read the chat
ALTER TABLE chat_threads
ADD COLUMN IF NOT EXISTS last_read_by_requester timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_read_by_professional timestamp with time zone;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_read 
ON chat_threads(last_read_by_requester, last_read_by_professional);
