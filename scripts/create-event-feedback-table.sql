-- Create event_feedback table for storing end-of-event feedback
CREATE TABLE IF NOT EXISTS event_feedback (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic Info
  family_name VARCHAR(255),
  years_attended VARCHAR(50),
  family_size VARCHAR(50),
  
  -- Overall Experience
  overall_rating VARCHAR(10),
  would_recommend VARCHAR(50),
  plan_to_return VARCHAR(50),
  
  -- Lodging
  lodging_type VARCHAR(100),
  lodging_rating VARCHAR(10),
  lodging_comments TEXT,
  
  -- Meals
  meals_rating VARCHAR(10),
  meals_variety VARCHAR(50),
  dietary_accommodations VARCHAR(50),
  meals_comments TEXT,
  
  -- Schedule & Activities
  schedule_rating VARCHAR(10),
  favorite_activities TEXT[], -- Array of selected activities
  activities_comments TEXT,
  
  -- Fellowship & Community
  fellowship_rating VARCHAR(10),
  family_introductions VARCHAR(50),
  fellowship_comments TEXT,
  
  -- Worship & Spiritual
  worship_rating VARCHAR(10),
  bible_bowl_rating VARCHAR(10),
  devotional_rating VARCHAR(10),
  worship_comments TEXT,
  
  -- Sessions
  moms_session_rating VARCHAR(10),
  dads_session_rating VARCHAR(10),
  young_adult_session_rating VARCHAR(10),
  session_topic_suggestions TEXT,
  
  -- Facility
  facility_rating VARCHAR(10),
  facility_comments TEXT,
  
  -- Value
  value_rating VARCHAR(10),
  registration_process VARCHAR(50),
  
  -- Improvements & Suggestions
  best_part TEXT,
  improvements TEXT,
  new_activity_suggestions TEXT,
  additional_comments TEXT
);

-- Create index for faster querying by date
CREATE INDEX IF NOT EXISTS idx_event_feedback_created_at ON event_feedback(created_at);
