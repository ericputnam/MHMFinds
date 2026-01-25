import { put } from '@vercel/blob';
import axios from 'axios';

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
 * Upload multiple images and return their Blob URLs.
 * Filters out any failed uploads.
 */
export async function uploadImagesToBlob(
  imageUrls: string[],
  options?: {
    folder?: string;
    filenamePrefix?: string;
    maxImages?: number;
  }
): Promise<string[]> {
  const urls = imageUrls.slice(0, options?.maxImages || 10); // Limit images
  const blobUrls: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const filename = options?.filenamePrefix
      ? `${options.filenamePrefix}-${i}`
      : undefined;

    const blobUrl = await uploadImageToBlob(url, {
      folder: options?.folder,
      filename,
    });

    if (blobUrl) {
      blobUrls.push(blobUrl);
    }

    // Small delay between uploads to be nice to the source server
    if (i < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return blobUrls;
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
 * Check if a URL is from an allowed external source (not WM/wewantmods.com)
 */
export function isExternalImageUrl(url: string): boolean {
  if (!url) return false;

  const blockedDomains = [
    'wewantmods.com',
    'localhost',
  ];

  try {
    const urlObj = new URL(url);
    return !blockedDomains.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
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
