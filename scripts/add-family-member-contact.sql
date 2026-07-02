-- Add optional contact fields to family_members.
-- Email is required (enforced in the app) for members with the father/mother
-- role; phone is always optional.
ALTER TABLE family_members ADD COLUMN email TEXT;
ALTER TABLE family_members ADD COLUMN phone TEXT;
