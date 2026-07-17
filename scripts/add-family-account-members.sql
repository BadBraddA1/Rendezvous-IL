-- Multi-user family accounts: Clerk users linked to a shared families row.
-- Primary remains families.clerk_user_id; additional members join via email match.

CREATE TABLE IF NOT EXISTS family_account_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  family_id INTEGER NOT NULL,
  clerk_user_id TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  source TEXT NOT NULL DEFAULT 'registration_member',
  linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_account_members_family
  ON family_account_members (family_id);

CREATE INDEX IF NOT EXISTS idx_family_account_members_email
  ON family_account_members (email);

-- Optional login email on the profile roster (outside a single registration year).
ALTER TABLE family_members_v2 ADD COLUMN email TEXT;

-- Backfill primary memberships from existing linked families.
INSERT INTO family_account_members (family_id, clerk_user_id, email, role, source)
SELECT id, clerk_user_id, LOWER(TRIM(email)), 'primary', 'primary_email'
FROM families
WHERE clerk_user_id IS NOT NULL AND TRIM(clerk_user_id) != ''
ON CONFLICT (clerk_user_id) DO UPDATE SET
  family_id = excluded.family_id,
  email = COALESCE(excluded.email, family_account_members.email),
  role = 'primary';
