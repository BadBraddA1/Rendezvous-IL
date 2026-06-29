-- Tag legacy registrations by event year so admin views can filter 2026 vs 2027.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS event_year INTEGER DEFAULT 2026;

UPDATE registrations
SET event_year = 2026
WHERE event_year IS NULL;

CREATE INDEX IF NOT EXISTS idx_registrations_event_year ON registrations(event_year);
