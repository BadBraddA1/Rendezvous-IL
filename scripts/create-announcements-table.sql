-- Create announcements table for live updates
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_active BOOLEAN DEFAULT true,
  show_on_schedule BOOLEAN DEFAULT true,
  show_on_live_updates BOOLEAN DEFAULT true,
  sent_to_groupme BOOLEAN DEFAULT false,
  groupme_message_id VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (is_active, expires_at);
