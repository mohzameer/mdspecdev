-- Add ai_summary column to revisions table for caching AI-generated summaries
ALTER TABLE revisions ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN revisions.ai_summary IS 'Cached AI-generated summary of changes from GPT-3.5-turbo';
