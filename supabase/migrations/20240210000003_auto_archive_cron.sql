-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily job to archive old specs
SELECT cron.schedule(
  'auto-archive-specs', -- job name
  '0 0 * * *',         -- every day at midnight
  $$
    UPDATE specs 
    SET archived_at = NOW() 
    WHERE archived_at IS NULL 
    AND updated_at < NOW() - INTERVAL '100 days';
  $$
);
