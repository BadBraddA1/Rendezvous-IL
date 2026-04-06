# Production Authentication Setup Guide

## Overview
The Rendezvous admin dashboard uses production-grade authentication with:
- Secure password hashing (SHA-256)
- JWT-based session management
- HTTP-only cookies
- Role-based access control (Admin, Editor, Viewer)
- Complete audit logging

## Initial Setup

### Step 1: Set Environment Variables

Add these to your Vercel project or `.env.local`:

```bash
# Database connection (already configured)
DATABASE_URL=your_neon_database_url

# JWT Secret (REQUIRED - generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Setup Key (REQUIRED for first admin creation)
ADMIN_SETUP_KEY=your-secret-setup-key
```

**Generate secure keys:**
```bash
# Generate JWT_SECRET (use any of these methods)
openssl rand -base64 32
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate ADMIN_SETUP_KEY
openssl rand -base64 24
```

### Step 2: Create Your First Admin

Choose **ONE** of these methods:

#### Method A: Web Interface (Recommended)

1. Visit `/admin/setup` in your browser
2. Enter:
   - Your email address
   - Full name
   - Strong password (minimum 8 characters)
   - The ADMIN_SETUP_KEY from environment variables
3. Click "Create Admin User"
4. Log in at `/admin/login`

#### Method B: SQL Script

1. Run the SQL script in your Neon console:
   ```sql
   INSERT INTO admin_users (email, full_name, role)
   VALUES ('your-email@example.com', 'Your Name', 'admin');
   ```
2. Visit `/admin/setup` to set your password

### Step 3: Verify Login

1. Go to `/admin/login`
2. Enter your email and password
3. Access the admin dashboard

## Security Features

### Password Security
- Passwords are hashed using SHA-256 before storage
- Never stored in plain text
- Minimum 8 characters required

### Session Management
- JWT tokens with 8-hour expiration
- HTTP-only cookies (protected from XSS)
- Secure flag in production (HTTPS only)
- Automatic token verification on protected routes

### Access Control
- Middleware protects all `/admin` routes
- Automatic redirect to login for unauthenticated users
- Role-based permissions (Admin, Editor, Viewer)

### Audit Logging
All administrative actions are logged with:
- Admin email
- Action type
- Resource affected
- IP address
- User agent
- Timestamp

## User Roles

### Admin
- Full access to all features
- Manage registrations
- Change system settings
- View audit logs
- Manage other admin users

### Editor
- View and edit registrations
- Export data
- Cannot change system settings
- Cannot manage admin users

### Viewer
- Read-only access
- View registrations and analytics
- Cannot make changes

## Adding Additional Admins

Only existing admins can create new admin users:

1. Log in to the admin dashboard
2. Go to Settings > Admin Users (coming soon)
3. Add new admin with email, name, and role

## Password Reset

For production, implement password reset via email:
1. User requests reset at login page
2. System sends secure reset link to email
3. User creates new password
4. Password hash updated in database

## Security Best Practices

1. **Strong Passwords**: Require 12+ characters with mixed case, numbers, symbols
2. **2FA/MFA**: Consider adding multi-factor authentication
3. **HTTPS Only**: Always use HTTPS in production
4. **Regular Audits**: Review audit logs regularly
5. **Session Timeout**: Tokens expire after 8 hours
6. **Secure Keys**: Use strong, random JWT_SECRET and ADMIN_SETUP_KEY

## Troubleshooting

### "Invalid credentials" error
- Verify password was set (check `password_hash` column exists)
- Try using the setup page if password is missing
- Check audit logs for failed login attempts

### "Unauthorized" error
- Session may have expired (8-hour limit)
- Clear cookies and log in again
- Verify JWT_SECRET hasn't changed

### Cannot access /admin/setup
- This endpoint only works when NO admin users exist
- After first admin is created, use admin dashboard to add more users

## Migration from Demo Auth

If you had demo credentials (admin123), all users need to:
1. Visit `/admin/setup` with ADMIN_SETUP_KEY
2. Set a secure password
3. Log in with new password

The old demo authentication has been completely removed for production security.
