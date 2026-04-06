# Admin Authentication Setup

## Overview
The admin dashboard uses a simple secret URL authentication system. Access is granted via a secure URL that sets a 90-day session cookie.

## Setup Instructions

### 1. Set Admin Secret Environment Variable

In your Vercel project environment variables, add:

**Variable Name:** `ADMIN_SECRET`  
**Value:** A long, random string (recommended: 32+ characters)

**Example:** `braddcorp-is-the-best-2024-secure-admin-panel-xyz789`

**Default:** If not set, defaults to `braddcorp-is-the-best` (⚠️ Change this in production!)

### 2. Access URLs

Once deployed, your admin access URL will be:

```
https://your-domain.com/api/admin/auth/[YOUR_SECRET]
```

For example, if your secret is `braddcorp-is-the-best`:
```
https://rendezvousil.com/api/admin/auth/braddcorp-is-the-best
```

### 3. Usage

1. **First Time Access:**
   - Visit your secret URL: `/api/admin/auth/[YOUR_SECRET]`
   - You'll be automatically redirected to `/admin` with a session cookie set
   - Bookmark this URL for easy access

2. **Subsequent Access:**
   - Use your bookmarked secret URL, or
   - Go directly to `/admin` (if your session is still valid)

3. **Session Duration:**
   - Sessions last 90 days
   - After 90 days, use your secret URL again to create a new session

### 4. Security Best Practices

- **Keep the secret URL private** - Do not share it or post it publicly
- **Use a strong secret** - 32+ random characters recommended
- **Bookmark securely** - Use a password-protected browser profile
- **Rotate periodically** - Change the `ADMIN_SECRET` every few months
- **HTTPS only** - Cookies are set with `secure` flag in production

### 5. Multiple Admins

To grant access to multiple administrators:
- Share the same secret URL with trusted admins
- Each admin should bookmark it privately
- Or, implement email-based magic links (see previous implementations)

### 6. Revoking Access

To revoke all admin access:
1. Change the `ADMIN_SECRET` environment variable in Vercel
2. Redeploy the application
3. All existing sessions will become invalid
4. Generate new secret URLs for authorized admins

## Troubleshooting

### Cookie not persisting
- Ensure `ADMIN_SECRET` matches between environment and URL
- Check browser allows cookies from your domain
- Try clearing browser cookies and accessing secret URL again

### Redirect loop
- Clear all cookies for your domain
- Visit the secret URL directly (not `/admin` first)
- Check browser console for detailed logs

### Environment variable not working
- Verify environment variable is set in Vercel project settings
- Ensure variable name is exactly `ADMIN_SECRET`
- Redeploy after changing environment variables

## API Endpoints

- `GET /api/admin/auth/[secret]` - Secret authentication endpoint
- Cookie set: `admin_session=authenticated` (90 day expiry)
- Redirect: `/admin` on success, `/admin/login?error=invalid` on failure
