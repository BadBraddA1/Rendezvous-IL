PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_active INTEGER DEFAULT 1,
  show_on_schedule INTEGER DEFAULT 1,
  show_on_live_updates INTEGER DEFAULT 1,
  sent_to_groupme INTEGER DEFAULT 0,
  groupme_message_id TEXT,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS check_in_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivein_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  num_adults INTEGER DEFAULT 0,
  num_children INTEGER DEFAULT 0,
  monday_dinner INTEGER DEFAULT 0,
  tuesday_breakfast INTEGER DEFAULT 0,
  tuesday_lunch INTEGER DEFAULT 0,
  tuesday_dinner INTEGER DEFAULT 0,
  wednesday_breakfast INTEGER DEFAULT 0,
  wednesday_lunch INTEGER DEFAULT 0,
  wednesday_dinner INTEGER DEFAULT 0,
  thursday_breakfast INTEGER DEFAULT 0,
  thursday_lunch INTEGER DEFAULT 0,
  thursday_dinner INTEGER DEFAULT 0,
  friday_breakfast INTEGER DEFAULT 0,
  friday_lunch INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_notification_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notification_type TEXT DEFAULT 'registration_2027'
);

CREATE TABLE IF NOT EXISTS event_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  event_year INTEGER,
  family_name TEXT,
  years_attended TEXT,
  family_size TEXT,
  overall_experience TEXT,
  likely_to_recommend TEXT,
  will_return TEXT,
  lodging_type TEXT,
  lodging_satisfaction TEXT,
  food_quality TEXT,
  food_variety TEXT,
  dietary_accommodations TEXT,
  meal_feedback TEXT,
  schedule_rating TEXT,
  favorite_activities TEXT DEFAULT '[]',
  activity_feedback TEXT,
  community_atmosphere TEXT,
  family_introductions TEXT,
  fellowship_feedback TEXT,
  assemblies_rating TEXT,
  bible_bowl_rating TEXT,
  devotionals_rating TEXT,
  moms_session_rating TEXT,
  dads_session_rating TEXT,
  young_adults_session_rating TEXT,
  worship_feedback TEXT,
  value_for_cost TEXT,
  registration_ease TEXT,
  best_memory TEXT,
  improvement_suggestions TEXT,
  new_activity_suggestions TEXT,
  additional_comments TEXT
);

CREATE TABLE IF NOT EXISTS express_registration_2027 (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER NOT NULL,
  lodging_type TEXT NOT NULL,
  occupancy_type TEXT,
  member_preferences TEXT NOT NULL DEFAULT '{}',
  estimated_total REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  clerk_user_id TEXT,
  email TEXT NOT NULL,
  family_last_name TEXT NOT NULL,
  husband_first_name TEXT,
  wife_first_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  husband_phone TEXT,
  wife_phone TEXT,
  home_congregation TEXT,
  years_homeschooling INTEGER,
  photo_url TEXT,
  directory_opt_in INTEGER DEFAULT 1,
  directory_blurb TEXT,
  photo_updated_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  first_name TEXT NOT NULL,
  date_of_birth TEXT,
  age INTEGER,
  is_baptized INTEGER DEFAULT 0,
  person_cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_name TEXT,
  monday_dinner INTEGER DEFAULT 1,
  tuesday_breakfast INTEGER DEFAULT 1,
  tuesday_lunch INTEGER DEFAULT 1,
  tuesday_dinner INTEGER DEFAULT 1,
  wednesday_breakfast INTEGER DEFAULT 1,
  wednesday_lunch INTEGER DEFAULT 1,
  wednesday_dinner INTEGER DEFAULT 1,
  thursday_breakfast INTEGER DEFAULT 1,
  thursday_lunch INTEGER DEFAULT 1,
  thursday_dinner INTEGER DEFAULT 1,
  friday_breakfast INTEGER DEFAULT 1,
  friday_lunch INTEGER DEFAULT 1,
  rate_key TEXT,
  is_adult_override INTEGER,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS family_members_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  is_baptized INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  member_type TEXT,
  age_group TEXT,
  grade TEXT,
  phone TEXT,
  special_needs INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS signature_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  signed_name TEXT,
  signed_at TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_token ON signature_requests(token);
CREATE INDEX IF NOT EXISTS idx_signature_requests_registration ON signature_requests(registration_id);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  family_last_name TEXT,
  rating INTEGER,
  comment TEXT,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  full_name TEXT NOT NULL,
  condition TEXT NOT NULL,
  medication_on_hand INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT (gen_random_uuid()),
  pick_1 INTEGER,
  pick_2 INTEGER,
  pick_3 INTEGER,
  submitted_at TEXT,
  email_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_topic_id INTEGER
);

CREATE TABLE IF NOT EXISTS lesson_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  assigned_presenter_name TEXT,
  assigned_registration_id INTEGER,
  assigned_day TEXT,
  assigned_session TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_by_bid_id INTEGER,
  claimed_at TEXT,
  claimed_by_volunteer_id INTEGER,
  event_year INTEGER  -- NULL treated as 2027 (added lazily by lib/lesson-bids.ts)
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  title TEXT,
  main_dish TEXT,
  sides TEXT,
  drinks TEXT,
  dessert TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER,
  registration_id INTEGER,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  status TEXT DEFAULT 'pending',
  submitted_by TEXT,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS pending_family_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER NOT NULL,
  clerk_user_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  member_id INTEGER,
  member_data TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_notes TEXT
);

CREATE TABLE IF NOT EXISTS rate_chart (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  rate_key TEXT NOT NULL,
  rate_name TEXT NOT NULL,
  rate_value REAL NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_charts (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  year INTEGER NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  early_reg_deadline TEXT
);

CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  rate_chart_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_attendees (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER NOT NULL,
  family_member_id INTEGER NOT NULL,
  age_at_event INTEGER,
  rate_key TEXT,
  person_cost REAL,
  climbing_tower INTEGER DEFAULT 0,
  tshirt_size TEXT,
  tshirt_quantity INTEGER DEFAULT 0,
  health_conditions TEXT,
  allergies TEXT,
  medications TEXT,
  special_needs TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  husband_phone TEXT,
  wife_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  home_congregation TEXT,
  father_occupation TEXT,
  times_attended INTEGER DEFAULT 0,
  years_homeschooling INTEGER,
  currently_homeschooling INTEGER,
  arrival_notes TEXT,
  lodging_type TEXT NOT NULL,
  lodging_total REAL NOT NULL,
  tshirt_total REAL DEFAULT 0,
  climbing_tower_total REAL DEFAULT 0,
  scholarship_donation REAL DEFAULT 0,
  scholarship_requested INTEGER DEFAULT 0,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  father_signature TEXT,
  mother_signature TEXT,
  registration_fee REAL DEFAULT 25.00,
  payment_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  registration_fee_paid INTEGER DEFAULT 0,
  full_payment_paid INTEGER DEFAULT 0,
  payment_notes TEXT,
  checkin_qr_code TEXT,
  room_keys TEXT,
  checked_in INTEGER DEFAULT 0,
  checked_in_at TEXT,
  keys_returned INTEGER DEFAULT 0,
  keys_returned_at TEXT,
  pre_assigned_keys TEXT DEFAULT '[]',
  keys_taken_count INTEGER DEFAULT 2,
  scholarship_amount_paid REAL DEFAULT 0,
  tshirts_distributed INTEGER DEFAULT 0,
  qr_code TEXT,
  check_in_notes TEXT,
  checked_in_by TEXT,
  event_year INTEGER DEFAULT 2026
);

CREATE TABLE IF NOT EXISTS registrations_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER NOT NULL,
  event_year INTEGER NOT NULL,
  lodging_type TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  total_cost REAL,
  deposit_paid REAL DEFAULT 0,
  balance_due REAL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  special_requests TEXT,
  dietary_restrictions TEXT,
  how_heard_about TEXT,
  liability_accepted INTEGER DEFAULT 0,
  liability_accepted_at TEXT,
  liability_accepted_by TEXT,
  photo_release_accepted INTEGER DEFAULT 0,
  checked_in INTEGER DEFAULT 0,
  checked_in_at TEXT,
  room_assignment TEXT,
  key_number TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  session_type TEXT NOT NULL,
  suggestion TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  activity_name TEXT NOT NULL,
  assigned_name TEXT NOT NULL,
  assigned_date TEXT,
  time_slot TEXT,
  notes TEXT,
  registration_id INTEGER,
  family_member_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tshirt_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price REAL DEFAULT 10.00,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER,
  volunteer_type TEXT NOT NULL,
  volunteer_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_date TEXT,
  time_slot TEXT,
  notes TEXT,
  schedule_status TEXT DEFAULT 'unscheduled',
  schedule_token TEXT,
  schedule_email_sent_at TEXT,
  responded_at TEXT,
  lesson_bid_token TEXT,
  lesson_bid_sent_at TEXT,
  claimed_lesson_id INTEGER,
  claimed_lesson_at TEXT,
  prayer_type TEXT,
  lesson_title TEXT,
  scripture_reading TEXT,
  lesson_details_submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS volunteers (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER NOT NULL,
  family_member_id INTEGER,
  role TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  password_hash TEXT,
  must_change_password INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  admin_email TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ios_device_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.app',
  environment TEXT NOT NULL DEFAULT 'production',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ios_activity_push_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  activity_token TEXT NOT NULL UNIQUE,
  bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.app',
  environment TEXT NOT NULL DEFAULT 'production',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS android_device_tokens (
  token TEXT PRIMARY KEY NOT NULL,
  bundle_id TEXT NOT NULL DEFAULT 'com.rendezvousil.app',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_app_activity (
  clerk_user_id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_platform TEXT NOT NULL DEFAULT 'web',
  last_app_version TEXT,
  visit_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_updates_displays (
  device_id TEXT PRIMARY KEY NOT NULL,
  hostname TEXT,
  ip TEXT,
  last_view TEXT,
  kiosk_url TEXT,
  build_version TEXT,
  user_agent TEXT,
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys = ON;
