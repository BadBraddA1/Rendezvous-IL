-- Create email notification list table for 2027 registration notifications
CREATE TABLE IF NOT EXISTS email_notification_list (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notification_type VARCHAR(50) DEFAULT 'registration_2027'
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_notification_email ON email_notification_list(email);
