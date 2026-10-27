import { redirect } from 'next/navigation';

// Renamed to /admin/subscribers — the `waitlist` table has been the newsletter list
// since the site launched. Kept so old bookmarks still land on the page.
export default function AdminWaitlistRedirect() {
  redirect('/admin/subscribers/');
}
