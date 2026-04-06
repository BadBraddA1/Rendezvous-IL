# Database Setup Instructions

This document explains how to run the SQL migration scripts to set up your Neon database.

## Required Migrations

The following SQL scripts need to be executed on your Neon database:

### 1. Add QR Code Check-in Feature

**File:** `scripts/add-checkin-qr-code.sql`

This adds the `checkin_qr_code` column to enable QR code scanning at event check-in.

```sql
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS checkin_qr_code VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_registrations_checkin_qr_code 
ON registrations(checkin_qr_code);
```

### 2. Add Family Member Last Names

**File:** `scripts/add-family-member-last-name.sql`

This allows individual family members to have different last names.

### 3. Add Payment Tracking

**File:** `scripts/add-payment-tracking.sql`

This adds payment status tracking columns to the registrations table.

## How to Run These Scripts

### Option 1: Using the Neon Console (Recommended)

1. Go to your Neon Console at https://console.neon.tech
2. Select your project "gentle-breeze-62063052"
3. Navigate to the SQL Editor
4. Copy the contents of each script file
5. Paste and execute each script one at a time

### Option 2: Using the v0 Scripts Folder

The scripts are available in the `/scripts` folder of your project. You can execute them directly from there in your development environment.

### Verification

After running the migrations, verify they were successful:

```sql
-- Check if checkin_qr_code column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
AND column_name = 'checkin_qr_code';

-- Check if last_name column exists in family_members
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'family_members' 
AND column_name = 'last_name';
```

## Troubleshooting

If you encounter errors when running the registration form, it's likely because these migrations haven't been executed yet. Make sure to run all the scripts above before accepting registrations.
