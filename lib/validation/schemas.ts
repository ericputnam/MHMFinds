import { z } from 'zod';

/**
 * Input validation schemas for MHMFinds API
 * Uses Zod for runtime type validation and sanitization
 */

// Common validation patterns
const urlPattern = z.string().url('Invalid URL format');
const emailPattern = z.string().email('Invalid email format');

/**
 * Mod Submission Schema
 * Used for POST /api/submit-mod
 */
export const ModSubmissionSchema = z.object({
  modUrl: urlPattern,
  modName: z.string().min(1, 'Mod name is required').max(200, 'Mod name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  submitterName: z.string().min(1, 'Your name is required').max(100, 'Name too long'),
  submitterEmail: emailPattern,
});

/**
 * Format Zod errors for API response
 */
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}
