-- Add last_name column to family_members table
ALTER TABLE family_members
ADD COLUMN last_name VARCHAR(100);

-- Add a comment explaining the column
COMMENT ON COLUMN family_members.last_name IS 'Individual last name for family member if different from family last name';
