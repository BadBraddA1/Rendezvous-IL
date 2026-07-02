-- Per-parent emailed signature links (feature toggle: signature_emails_enabled).
-- One row per parent per registration; signed_at NULL = still pending.
-- Applied lazily by lib/signature-requests.ts on first use.
CREATE TABLE IF NOT EXISTS signature_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  registration_id INTEGER NOT NULL,
  role TEXT NOT NULL,              -- 'father' | 'mother' | 'primary' (fallback)
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
