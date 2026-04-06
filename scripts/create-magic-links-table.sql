-- Create table for magic link authentication tokens
CREATE TABLE IF NOT EXISTS admin_magic_links (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_magic_links_token ON admin_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_admin_magic_links_email ON admin_magic_links(email);
