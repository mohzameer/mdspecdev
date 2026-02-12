-- Add notification preferences to profiles (skip if already exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"email_mentions": true, "email_comments": true}'::jsonb;

-- Comment on column
COMMENT ON COLUMN profiles.notification_preferences IS 'User preferences for email notifications';
