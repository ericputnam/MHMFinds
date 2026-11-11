import { put } from '@vercel/blob';
import axios from 'axios';
import { needsRehost } from '@/lib/imageUpload';

/**
 * Downloads an image from a URL and uploads it to Vercel Blob storage.
 * Returns the Vercel Blob URL, or null if the operation fails.
 */
export async function uploadImageToBlob(
  imageUrl: string,
  options?: {
    folder?: string;
    filename?: string;
  }
): Promise<string | null> {
  try {
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      validateStatus: (status) => status < 400,
    });

    // Determine content type
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Generate filename
    const extension = getExtensionFromContentType(contentType);
    const folder = options?.folder || 'mods';
    const filename = options?.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const blobPath = `${folder}/${filename}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, response.data, {
      access: 'public',
      contentType,
    });

    console.log(`   📤 Uploaded image to Vercel Blob: ${blob.url}`);
    return blob.url;
  } catch (error: any) {
    console.error(`   ❌ Failed to upload image from ${imageUrl}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
  };

  return typeMap[contentType.split(';')[0]] || 'jpg';
}

/**
 * Check if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Must start with http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  // Skip data URIs, placeholders, tracking pixels
  const skipPatterns = [
    'data:image',
    'placeholder',
    '1x1',
    'pixel',
    'tracking',
    'spacer',
    'blank',
    'transparent',
    'gravatar',
    'avatar',
    'icon',
    'logo',
    'favicon',
  ];

  const lowerUrl = url.toLowerCase();
  return !skipPatterns.some((pattern) => lowerUrl.includes(pattern));
}

/**
 * Copy mod image URLs that can't be stored as-is (see needsRehost — Patreon's
 * expiring signed URLs) to Vercel Blob. Other URLs pass through unchanged.
 * Throws if a URL that needs re-hosting can't be copied, so the caller can
 * tell the editor instead of silently saving an image that won't display.
 */
export async function rehostModImages<T extends { thumbnail?: unknown; images?: unknown }>(
  body: T
): Promise<T> {
  const rehost = async (url: string): Promise<string> => {
    if (!needsRehost(url)) return url;
    const blobUrl = await uploadImageToBlob(url, { folder: 'mods/uploads' });
    if (!blobUrl) {
      throw new ImageRehostError(
        'Could not copy the Patreon image. Download it and use "Upload image" instead.'
      );
    }
    return blobUrl;
  };

  const out = { ...body };
  if (typeof body.thumbnail === 'string') {
    out.thumbnail = await rehost(body.thumbnail);
  }
  if (Array.isArray(body.images)) {
    out.images = await Promise.all(
      body.images.map((img) => (typeof img === 'string' ? rehost(img) : img))
    );
  }
  return out;
}

export class ImageRehostError extends Error {}
