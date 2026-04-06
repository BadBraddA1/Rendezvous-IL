-- Add payment tracking columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS full_payment_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_registrations_payment ON registrations(registration_fee_paid, full_payment_paid);
