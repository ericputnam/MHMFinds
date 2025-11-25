# Admin Login Guide

## Quick Start

### 1. Access Admin Panel

Visit: **http://localhost:3000/admin**

You'll be automatically redirected to: **http://localhost:3000/admin/login**

### 2. Login Credentials

```
Email: adminuser45@admin.local
Password: 5GbHE%X9c%#tIg4i
```

### 3. After Login

You'll be redirected to the admin dashboard at `/admin`

---

## How It Works

### Authentication Flow

1. **User visits `/admin`** (or any `/admin/*` route)
2. **Middleware checks authentication**
   - If not logged in → redirects to `/admin/login`
   - If logged in but not admin → redirects to `/`
   - If logged in AND admin → allows access
3. **User logs in** at `/admin/login`
4. **NextAuth validates credentials**
   - Checks if user exists
   - Verifies password with bcrypt
   - Returns user with isAdmin flag
5. **Redirects to requested page**

### Security Features

✅ **Password Security**
- Passwords hashed with bcrypt (12 rounds)
- Never stored in plain text
- Secure comparison

✅ **Route Protection**
- Middleware protects all `/admin` routes
- Automatic redirect for unauthorized users
- Role-based access (isAdmin flag)

✅ **Session Management**
- JWT-based sessions
- Secure HTTP-only cookies
- Auto-expiration

---

## Admin Pages

Once logged in, you can access:

- `/admin` - Dashboard with statistics
- `/admin/mods` - Manage mods
- `/admin/submissions` - Review submissions
- `/admin/creators` - Manage creators
- `/admin/users` - Manage users
- `/admin/categories` - Manage categories

---

## Troubleshooting

### Can't access login page?

Make sure dev server is running:
```bash
npm run dev
```

### Invalid credentials error?

1. Check the admin user exists:
   ```bash
   npm run db:studio
   ```
2. Look for user with email: `adminuser45@admin.local`
3. If not found, recreate:
   ```bash
   npm run admin:create
   ```

### Redirected to home page after login?

Check if user has `isAdmin=true`:
```bash
npm run db:studio
```

Open `users` table, find your user, check `isAdmin` column.

If false, update via Prisma Studio or recreate admin:
```bash
npm run admin:create
```

---

## Adding More Admins

### Option 1: Using the Script

1. Update `.env`:
   ```bash
   ADMIN_USERNAME="newadmin"
   ADMIN_PASSWORD="secure-password-123"
   ```

2. Run script:
   ```bash
   npm run admin:create
   ```

### Option 2: Via Database

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Find user in `users` table

3. Set `isAdmin` to `true`

4. Create account record in `accounts` table:
   - `userId`: user's ID
   - `type`: "credentials"
   - `provider`: "credentials"
   - `providerAccountId`: user's ID
   - `id_token`: bcrypt hash of password

---

## Security Best Practices

### Change Default Password

⚠️ **CRITICAL**: Change the default password immediately!

1. Login to admin panel
2. Go to settings (when implemented)
3. Change password

### Production Checklist

Before deploying:

- [ ] Change admin credentials in `.env`
- [ ] Run `npm run admin:create` on production
- [ ] Enable 2FA (when implemented)
- [ ] Set up IP whitelisting (optional)
- [ ] Configure security headers
- [ ] Enable rate limiting

---

## Technical Details

### Files

- `app/admin/login/page.tsx` - Login UI
- `app/api/auth/[...nextauth]/route.ts` - Auth configuration
- `middleware.ts` - Route protection
- `lib/auth/adminAuth.ts` - Auth utilities

### Database

Admin passwords are stored in the `accounts` table:
- `provider`: "credentials"
- `id_token`: bcrypt hash of password (not ideal but works)

### Session

JWT token contains:
```json
{
  "id": "user_id",
  "email": "admin@example.com",
  "username": "adminuser",
  "isAdmin": true,
  "isCreator": false,
  "isPremium": true
}
```

---

## Next Steps

1. ✅ Login works!
2. 📝 Implement password change functionality
3. 🔐 Add 2FA (recommended)
4. 📊 Build out admin dashboard features
5. 🚀 Deploy to production

