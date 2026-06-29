-- Family directory photos (attendee yearbook-style listing).
ALTER TABLE families ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS directory_opt_in INTEGER DEFAULT 0;
ALTER TABLE families ADD COLUMN IF NOT EXISTS directory_blurb TEXT;
ALTER TABLE families ADD COLUMN IF NOT EXISTS photo_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_families_directory ON families(directory_opt_in, photo_url);
