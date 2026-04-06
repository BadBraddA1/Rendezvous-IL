# Admin Access Setup Guide

## Option 1: Using the Setup Page (Recommended)

1. Add this to your environment variables (`.env.local`):
   ```
   ADMIN_SETUP_KEY=your-secret-key-here
   ```

2. Visit `/admin/setup` in your browser

3. Enter:
   - Your email address
   - Your full name
   - The setup key from step 1

4. Click "Create Admin User"

5. Log in at `/admin/login` with Stack Auth

## Option 2: Direct SQL (Fastest)

Run this SQL in your Neon database:

```sql
INSERT INTO admin_users (email, full_name, role)
VALUES ('your-email@example.com', 'Your Name', 'admin');
```

Replace with your actual email and name.

## Option 3: Using the API

```bash
curl -X POST https://your-domain.com/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "fullName": "Your Name",
    "setupKey": "your-secret-key"
  }'
```

## After Setup

1. Visit `/admin/login`
2. Sign in with Stack Auth using your admin email
3. The system will check if your email is in the `admin_users` table
4. If found, you'll be granted access based on your role

## Role Levels

- **admin**: Full access to everything
- **editor**: Can view and edit registrations, but not system settings
- **viewer**: Read-only access to registrations and analytics

## Adding More Admins

Once logged in as an admin, you can add more admin users from the Admin Dashboard settings page.
