# MustHaveMods Admin Dashboard

## Overview

A comprehensive administrative dashboard for managing all aspects of your MustHaveMods platform. The admin dashboard provides full CRUD operations, bulk editing, approval workflows, and content management tools.

## Accessing the Admin Dashboard

**URL:** `http://localhost:3000/admin`

The admin dashboard is fully integrated into your main Next.js application under the `/admin` route.

## Features

### 1. Dashboard Home (`/admin`)

**Statistics Overview:**
- Total Mods
- Total Creators
- Pending Submissions
- Total Users
- Total Downloads
- Total Favorites
- Average Rating
- Recently Added Mods

**Quick Actions:**
- Add New Mod
- Review Submissions
- Manage Creators

### 2. Mods Management (`/admin/mods`)

**Features:**
- ✅ **Search:** Full-text search across mod titles, descriptions, and authors
- ✅ **Filter:** Filter by category (Gameplay, Build/Buy, CAS, UI/UX, Script Mod)
- ✅ **Bulk Operations:**
  - Bulk delete selected mods
  - Bulk feature/unfeature mods
  - Select all/deselect all functionality
- ✅ **Individual Mod Actions:**
  - Edit mod details (title, category, author, thumbnail, download URL)
  - Delete individual mods
  - Toggle featured/verified status
  - View mod externally
- ✅ **Pagination:** 20 mods per page
- ✅ **Visual Editor:** Inline modal editor for quick updates

**Edit Fields:**
- Title
- Category
- Author
- Thumbnail URL
- Download URL
- Featured (checkbox)
- Verified (checkbox)

### 3. Mod Submissions (`/admin/submissions`)

**Approval Workflow:**
- ✅ View all pending submissions
- ✅ **Approve:** Converts submission to actual mod with one click
- ✅ **Reject:** Reject with optional reason
- ✅ **Status Tabs:** Filter by Pending / Approved / Rejected
- ✅ **Submission Details:**
  - Mod name and description
  - Category
  - Mod URL (clickable)
  - Submitter name and email
  - Submission date

**How Approval Works:**
When you approve a submission:
1. Creates a new Mod in the database
2. Uses submission data (name, description, category, URL)
3. Marks submission as "approved"
4. Records review timestamp

### 4. Creators Management (`/admin/creators`)

**Features:**
- ✅ View all creator profiles
- ✅ Search creators by name, handle, email
- ✅ **Edit Creator:**
  - Handle
  - Bio
  - Website
  - Verified status
  - Featured status
- ✅ Display creator stats (mod count)
- ✅ Delete creator profiles
- ✅ Visual cards with avatars

### 5. Users Management (`/admin/users`)

**Features:**
- ✅ View all user accounts
- ✅ Search by email, username, display name
- ✅ **User Roles Management:**
  - Admin (full system access)
  - Premium (premium features)
  - Creator (can upload mods)
- ✅ Pagination (20 users per page)
- ✅ Delete user accounts
- ✅ Visual role badges
- ✅ Join date tracking

### 6. Categories Management (`/admin/categories`)

**Features:**
- ✅ View hierarchical category tree
- ✅ Add new categories
- ✅ Edit existing categories
- ✅ Delete categories (with safety checks)
- ✅ **Category Fields:**
  - Name
  - Slug
  - Description
  - Order
  - Level (auto-calculated)
  - Path (auto-calculated)
- ✅ Mod count per category
- ✅ Visual hierarchy display

**Safety Features:**
- Cannot delete categories with subcategories
- Cannot delete categories with associated mods
- Shows warning before deletion

## API Endpoints

### Mods
- `GET /api/admin/mods` - List mods (pagination, search, filter)
- `POST /api/admin/mods` - Create mod
- `GET /api/admin/mods/[id]` - Get single mod
- `PATCH /api/admin/mods/[id]` - Update mod
- `DELETE /api/admin/mods/[id]` - Delete mod
- `DELETE /api/admin/mods/bulk` - Bulk delete
- `PATCH /api/admin/mods/bulk` - Bulk update

### Submissions
- `GET /api/admin/submissions` - List submissions
- `POST /api/admin/submissions/[id]/approve` - Approve submission
- `POST /api/admin/submissions/[id]/reject` - Reject submission

### Creators
- `GET /api/admin/creators` - List creators
- `PATCH /api/admin/creators/[id]` - Update creator
- `DELETE /api/admin/creators/[id]` - Delete creator

### Users
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/[id]` - Update user roles
- `DELETE /api/admin/users/[id]` - Delete user

### Categories
- `GET /api/admin/categories` - List categories
- `POST /api/admin/categories` - Create category
- `PATCH /api/admin/categories/[id]` - Update category
- `DELETE /api/admin/categories/[id]` - Delete category

### Stats
- `GET /api/admin/stats` - Dashboard statistics

## Usage Guide

### Managing Mods

**To Edit a Mod:**
1. Go to `/admin/mods`
2. Click the edit icon on any mod
3. Update fields in the modal
4. Click "Save Changes"

**To Bulk Delete Mods:**
1. Select mods using checkboxes
2. Click "Delete (X)" button
3. Confirm deletion

**To Bulk Feature Mods:**
1. Select mods using checkboxes
2. Click "Feature" button
3. Mods will be featured immediately

### Approving Submissions

**To Approve a Mod Submission:**
1. Go to `/admin/submissions`
2. Review the submission details
3. Click "Approve" button
4. Confirm approval
5. Mod is automatically created in database

**To Reject a Submission:**
1. Click "Reject" button
2. Optionally enter rejection reason
3. Submit rejection

### Managing Creators

**To Edit Creator Profile:**
1. Go to `/admin/creators`
2. Click "Edit" on creator card
3. Update handle, bio, website
4. Toggle verified/featured status
5. Click "Save Changes"

### Managing Users

**To Grant Admin Access:**
1. Go to `/admin/users`
2. Click edit icon on user
3. Check "Admin" checkbox
4. Click "Save Changes"

**To Grant Premium/Creator Status:**
- Follow same process as admin access
- Toggle Premium or Creator checkboxes

### Managing Categories

**To Add a Category:**
1. Go to `/admin/categories`
2. Click "Add Category"
3. Enter name, slug, description
4. Click "Create"

**To Edit a Category:**
1. Click edit icon on category
2. Update fields
3. Click "Save"

## Security Considerations

⚠️ **Important:** This admin dashboard currently has no authentication/authorization. Before deploying to production:

1. **Add Authentication Middleware**
   - Protect `/admin` routes
   - Check for `user.isAdmin === true`
   - Redirect unauthorized users

2. **Example Middleware:**
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     if (request.nextUrl.pathname.startsWith('/admin')) {
       // Check if user is authenticated and is admin
       // Redirect if not authorized
     }
   }
   ```

3. **API Route Protection:**
   - All `/api/admin/*` routes should verify admin status
   - Return 403 for unauthorized requests

## Design & UI

**Color Scheme:**
- Primary: Sims Pink (#EC4899) / Purple (#A855F7)
- Background: Slate 950 (#020617)
- Cards: Slate 900 (#0F172A)
- Borders: Slate 800 (#1E293B)

**Components:**
- Modern dark theme matching main site
- Glassmorphism effects
- Smooth transitions and hover states
- Responsive grid layouts
- Mobile-friendly tables

## Next Steps

### Recommended Enhancements:

1. **Authentication** (CRITICAL)
   - Add NextAuth admin check middleware
   - Protect all admin routes

2. **Image Upload**
   - Integrate with AWS S3 or Cloudinary
   - Direct upload from mod editor
   - Thumbnail generation

3. **Rich Text Editor**
   - Add WYSIWYG editor for mod descriptions
   - Markdown support

4. **Activity Logs**
   - Track admin actions
   - Show recent changes
   - Audit trail

5. **Batch Operations**
   - CSV import/export
   - Bulk image upload
   - Mass category assignment

6. **Analytics**
   - Mod performance over time
   - User growth charts
   - Popular categories

7. **Email Notifications**
   - Notify submitters of approval/rejection
   - Alert admins of new submissions

## Troubleshooting

**Problem:** Can't access admin dashboard
- **Solution:** Navigate to `http://localhost:3000/admin`

**Problem:** Changes not saving
- **Solution:** Check browser console for errors, verify API routes are working

**Problem:** Can't delete category
- **Solution:** Categories with mods or subcategories cannot be deleted (safety feature)

**Problem:** Bulk operations not working
- **Solution:** Ensure mods are selected (checkboxes checked)

## Support

For issues or questions about the admin dashboard:
1. Check this documentation
2. Review browser console for errors
3. Check Next.js server logs
4. Verify database connection

---

**Built with:** Next.js 14, TypeScript, Prisma, PostgreSQL
**Last Updated:** November 2025
