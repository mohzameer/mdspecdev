-- Add notification preferences to profiles
ALTER TABLE profiles 
ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{"email_mentions": true, "email_comments": true}'::jsonb;

-- Comment on column
COMMENT ON COLUMN profiles.notification_preferences IS 'User preferences for email notifications';
