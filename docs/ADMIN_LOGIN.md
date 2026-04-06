# Admin Login Instructions

## Current Admin Users

Both existing admin users have been set up with a temporary default password:

- **Email**: `Adin@braddcorp.com`
- **Email**: `stephen@bradd.us`
- **Default Password**: `12345678`

## First Login Process

1. Go to `/admin/login`
2. Enter your email and the default password: `12345678`
3. You will be automatically redirected to the password change page
4. Enter the current password (`12345678`) and set a new secure password (minimum 8 characters)
5. After changing your password, you'll be redirected to the admin dashboard

## Security Features

- All passwords are hashed using SHA-256 before storage
- Sessions use JWT tokens with 8-hour expiration
- All administrative actions are logged in the audit log
- Failed login attempts are tracked
- First-time users must change their default password

## Creating New Admin Users

When creating new admin users via the setup endpoint, they will automatically:
- Receive the default password: `12345678`
- Be flagged to change password on first login
- Be required to set a secure password before accessing the dashboard

## Password Requirements

- Minimum 8 characters
- No maximum length
- Can include letters, numbers, and special characters
