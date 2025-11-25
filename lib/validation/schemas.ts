import { z } from 'zod';

/**
 * Input validation schemas for MHMFinds API
 * Uses Zod for runtime type validation and sanitization
 */

// Common validation patterns
const urlPattern = z.string().url('Invalid URL format');
const emailPattern = z.string().email('Invalid email format');
const cuidPattern = z.string().cuid('Invalid ID format');

/**
 * Mod Creation Schema
 * Used for POST /api/mods
 */
export const ModCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  shortDescription: z.string().max(500, 'Short description too long').optional(),
  version: z.string().max(50, 'Version too long').optional(),
  gameVersion: z.string().max(50, 'Game version too long').optional(),
  category: z.string().min(1, 'Category is required'),
  categoryId: cuidPattern.optional(),
  tags: z.array(z.string()).max(20, 'Too many tags').optional(),
  thumbnail: urlPattern.optional(),
  images: z.array(urlPattern).max(20, 'Too many images').optional(),
  downloadUrl: urlPattern.optional(),
  sourceUrl: urlPattern.optional(),
  source: z.string().max(100, 'Source too long'),
  sourceId: z.string().max(100, 'Source ID too long').optional(),
  isFree: z.boolean().default(true),
  price: z.number().min(0, 'Price must be positive').max(10000, 'Price too high').optional(),
  isNSFW: z.boolean().default(false),
});

/**
 * Mod Update Schema
 * Used for PUT/PATCH /api/mods/[id]
 */
export const ModUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),
  shortDescription: z.string().max(500, 'Short description too long').optional(),
  version: z.string().max(50, 'Version too long').optional(),
  gameVersion: z.string().max(50, 'Game version too long').optional(),
  category: z.string().optional(),
  categoryId: cuidPattern.optional(),
  tags: z.array(z.string()).max(20, 'Too many tags').optional(),
  thumbnail: urlPattern.optional(),
  images: z.array(urlPattern).max(20, 'Too many images').optional(),
  downloadUrl: urlPattern.optional(),
  sourceUrl: urlPattern.optional(),
  isFree: z.boolean().optional(),
  price: z.number().min(0, 'Price must be positive').max(10000, 'Price too high').optional(),
  isNSFW: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

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
 * Review Submission Schema
 * Used for POST /api/mods/[id]/reviews
 */
export const ReviewCreateSchema = z.object({
  rating: z.number().int('Rating must be an integer').min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment too long').optional(),
});

/**
 * Collection Creation Schema
 * Used for POST /api/collections
 */
export const CollectionCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().default(true),
});

/**
 * Creator Profile Update Schema
 * Used for PUT /api/creators/[id]
 */
export const CreatorProfileUpdateSchema = z.object({
  handle: z.string().min(3, 'Handle must be at least 3 characters').max(50, 'Handle too long').regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens').optional(),
  bio: z.string().max(1000, 'Bio too long').optional(),
  website: urlPattern.optional(),
  socialLinks: z.object({
    twitter: z.string().max(100).optional(),
    instagram: z.string().max(100).optional(),
    youtube: z.string().max(100).optional(),
    patreon: z.string().max(100).optional(),
    discord: z.string().max(100).optional(),
  }).optional(),
});

/**
 * Admin Submission Rejection Schema
 * Used for POST /api/admin/submissions/[id]/reject
 */
export const SubmissionRejectSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000, 'Reason too long'),
});

/**
 * User Update Schema (Admin)
 * Used for PUT /api/admin/users/[id]
 */
export const UserUpdateSchema = z.object({
  isCreator: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  displayName: z.string().max(100, 'Display name too long').optional(),
});

/**
 * Helper function to validate request body
 * Returns parsed data or throws ZodError
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Helper function to validate request body with safe parsing
 * Returns { success: true, data } or { success: false, error }
 */
export async function safeValidateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; error: z.ZodError }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    return result;
  } catch (error) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON body',
        },
      ]),
    };
  }
}

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
