# Admin Dashboard Documentation

## Overview

A comprehensive, secure admin dashboard for managing Rendezvous event registrations with role-based access control, analytics, audit logging, and system settings management.

## Security Features

### Authentication & Authorization
- **Cookie-based sessions** - Secure HttpOnly cookies for session management
- **Role-based access control** - Three permission levels:
  - **Admin** - Full access to all features including settings and audit logs
  - **Editor** - Can view and manage registrations, limited settings access
  - **Viewer** - Read-only access to dashboard and registrations
- **Audit logging** - All administrative actions are logged with IP address and user agent
- **Secure routes** - All admin pages check authentication before rendering

### Recommended Security Enhancements
1. **Replace demo authentication** - Current login uses simple password check (admin123)
   - Integrate **Stack Auth** (already configured) or OAuth providers
   - Add multi-factor authentication (MFA)
   - Implement password hashing with bcrypt
2. **Session management** - Add session expiration and refresh tokens
3. **CSRF protection** - Add CSRF tokens for form submissions
4. **Rate limiting** - Prevent brute force login attempts
5. **IP whitelisting** - Optional restriction to specific networks

## Features

### 1. Dashboard Overview (`/admin`)
- **Real-time statistics**:
  - Total families registered
  - Total individual attendees
  - Total revenue collected
  - Lodging breakdown (Motel/RV/Tent)
- **Analytics charts**:
  - Registrations over time (bar chart)
  - Lodging distribution (pie chart)
- **Recent registrations** - Latest 5 family registrations

### 2. Registration Management (`/admin/registrations`)
- **Search functionality** - Search by family name or email
- **Filter by lodging type** - Motel, RV, or Tent
- **Data table** with columns:
  - Family name, email, attendee count
  - Lodging type, total cost
  - Payment status (paid/pending)
  - Registration date
- **Export to CSV** - Download all registration data for:
  - Name badge printing
  - Meal planning (attendee counts)
  - Lodging assignments
  - T-shirt order bulk purchasing
  - Emergency contact lists

### 3. System Settings (`/admin/settings`)
**Requires Admin or Editor role**

- **Registration control**:
  - Toggle registration form on/off
  - Close registration after deadline
- **Event date configuration**:
  - Early bird deadline (affects pricing)
  - Final registration deadline
  - Event start/end dates
- **All changes logged** in audit trail

### 4. Audit Logs (`/admin/audit`)
**Requires Admin role only**

- **Complete activity tracking**:
  - Who performed action
  - What action was taken
  - When it occurred
  - IP address and user agent
- **Action types logged**:
  - Admin login/logout
  - Settings changes
  - Registration exports
  - Data modifications
- **Accountability & security compliance**

## Database Schema

### Admin Tables

```sql
-- Admin users with role-based permissions
admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer',
  full_name VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Audit trail for all admin actions
audit_logs (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP
)

-- System configuration settings
system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP
)
```

## API Routes

### Authentication
- `POST /api/admin/login` - Authenticate admin user
- `POST /api/admin/logout` - Clear admin session

### Dashboard Data
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/analytics` - Chart data
- `GET /api/admin/registrations/recent` - Latest registrations

### Registration Management
- `GET /api/admin/registrations` - List all registrations (with search/filter)
- `GET /api/admin/registrations/export` - Export CSV

### System Configuration
- `GET /api/admin/settings` - Fetch system settings
- `PUT /api/admin/settings` - Update settings (Admin/Editor only)

### Audit
- `GET /api/admin/audit` - Fetch audit logs (Admin only)

## Access Control Matrix

| Feature | Viewer | Editor | Admin |
|---------|--------|--------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Registrations | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ✅ |
| View Settings | ❌ | ✅ | ✅ |
| Update Settings | ❌ | ✅ | ✅ |
| View Audit Logs | ❌ | ❌ | ✅ |
| Manage Admin Users | ❌ | ❌ | ✅ |

## Usage Instructions

### First-Time Setup

1. **Access admin login**: Navigate to `/admin/login`
2. **Initial credentials** (demo - replace in production):
   - Email: any email
   - Password: `admin123`
3. **First login creates admin user** in database automatically

### Managing Registrations

1. Navigate to **Registrations** tab
2. Use search bar to find specific families
3. Filter by lodging type for planning
4. Click **Export CSV** to download data for:
   - Badge printing
   - Meal counts
   - Room assignments

### Configuring System

1. Navigate to **Settings** tab
2. Toggle **Registration Enabled** to open/close registration
3. Update event dates as needed
4. Click **Save Settings** to apply changes

### Monitoring Activity

1. Navigate to **Audit Logs** tab (Admin only)
2. Review all administrative actions
3. Check for unauthorized access attempts
4. Verify proper usage by team members

## Next Steps & Recommendations

### Immediate Security Improvements
1. **Replace demo authentication** with production-ready solution:
   ```typescript
   // Recommended: Use Stack Auth (already configured)
   import { stackServerApp } from '@/lib/stack'
   
   const user = await stackServerApp.getUser()
   if (!user || !user.role?.includes('admin')) {
     redirect('/admin/login')
   }
   ```

2. **Add MFA** - Two-factor authentication for admin accounts
3. **Implement password hashing** - Use bcrypt or similar
4. **Add rate limiting** - Prevent brute force attacks

### Feature Enhancements
1. **Email notifications** - Alert admins of new registrations
2. **Advanced analytics** - More charts and insights
3. **Lodging assignment tool** - Assign specific rooms/sites
4. **Payment integration** - Track and process payments
5. **Bulk operations** - Update multiple registrations at once
6. **Family detail view** - Click to see complete registration details
7. **Admin user management** — `/admin/users`: create/delete Clerk users, roles, ban/unban, password reset, last-seen + platform tracking (`user_app_activity`, `POST /api/auth/activity`, Clerk `session.created` webhook)

### Scalability Considerations
- Add pagination for large datasets (100+ registrations)
- Implement caching for dashboard statistics
- Add database indexes for common queries (already included)
- Consider CDN for exported CSV files

## Design System

The dashboard uses a professional dark theme with:
- **Primary color**: Blue accent for key actions
- **Neutral grays**: Clean, modern interface
- **Semantic colors**: 
  - Green for success/paid status
  - Yellow for warnings
  - Red for destructive actions
- **Responsive design**: Works on desktop and tablet (mobile optimized)
- **Accessible**: WCAG compliant with proper contrast ratios

## Support

For issues or questions:
- Contact: Stephen@Bradd.us
- Phone: (217) 935-5058
- Review audit logs for troubleshooting
