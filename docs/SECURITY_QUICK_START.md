# Security Quick Start Guide

## Setup Steps (5 minutes)

### 1. Configure Turnstile CAPTCHA

Add to your `.env` file:

```bash
# For Development (test keys - always pass)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"

# For Production (get from https://dash.cloudflare.com/)
# NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-real-site-key"
# TURNSTILE_SECRET_KEY="your-real-secret-key"
```

### 2. Set Admin Credentials

Add to your `.env` file:

```bash
ADMIN_USERNAME="adminuser45"
ADMIN_PASSWORD="5GbHE%X9c%#tIg4i"
```

**⚠️ IMPORTANT:** Change these after first login!

### 3. Create Admin User

Run the setup script:

```bash
npm run admin:create
```

You should see:
```
🔐 Creating admin user...
🔒 Hashing password...
✅ Admin user created successfully!

📝 Login credentials:
   Username: adminuser45
   Password: 5GbHE%X9c%#tIg4i
   Email: adminuser45@admin.local

⚠️  IMPORTANT: Change the password after first login!
🔗 Admin dashboard: http://localhost:3000/admin
```

### 4. Test the Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test CAPTCHA on submit page:**
   - Visit: http://localhost:3000/submit-mod
   - You should see a CAPTCHA widget at the bottom of the form
   - With test keys, it will auto-complete

3. **Test admin access:**
   - Visit: http://localhost:3000/admin
   - You should be redirected to sign-in (if not logged in)
   - Sign in with your admin credentials
   - You should see the admin dashboard

---

## Security Features Enabled

✅ **CAPTCHA Protection**
- Submit-mod page now requires CAPTCHA completion
- Bot submissions are blocked
- Rate limiting: 5 submissions per hour per IP

✅ **Admin Authentication**
- `/admin` routes require login
- Only users with `isAdmin=true` can access
- Automatic redirect for unauthorized users

✅ **Audit Logging**
- All admin actions are logged
- View logs in database table: `admin_audit_logs`

✅ **Password Security**
- Passwords hashed with bcrypt (12 rounds)
- Never stored in plain text
- Secure admin account setup

---

## Quick Reference

### Admin Routes (all require authentication):
- `/admin` - Dashboard with stats
- `/admin/mods` - Manage mods
- `/admin/submissions` - Review submissions
- `/admin/creators` - Manage creators
- `/admin/users` - Manage users
- `/admin/categories` - Manage categories

### API Routes (all require admin role):
- `GET /api/admin/stats` - Dashboard statistics

### Scripts:
- `npm run admin:create` - Create admin user
- `npm run db:studio` - View database (including audit logs)

---

## Troubleshooting

### CAPTCHA not showing?
- Check `.env` has `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set
- Restart dev server after adding env vars
- Check browser console for errors

### Can't access admin panel?
- Make sure you're logged in
- Check if user has `isAdmin=true` in database
- Try running `npm run admin:create` again

### Admin user already exists?
- The script will update existing user to admin
- Check database: `npm run db:studio`
- Look for user with email `adminuser45@admin.local`

---

## Next Steps

1. ✅ Everything is set up!
2. 📖 Read full documentation: `docs/SECURITY_IMPLEMENTATION.md`
3. 🔒 Change admin password after first login
4. 🚀 Deploy to production (see deployment checklist in docs)

---

**Need Help?**
- Check: `docs/SECURITY_IMPLEMENTATION.md` for detailed guide
- Check: `docs/SECURITY_HARDENING.md` for production security
