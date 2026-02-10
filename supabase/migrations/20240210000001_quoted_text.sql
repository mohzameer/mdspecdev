-- Add quoted_text column to comment_threads for inline text-selection comments
ALTER TABLE comment_threads ADD COLUMN IF NOT EXISTS quoted_text TEXT;
