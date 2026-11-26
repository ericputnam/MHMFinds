// Browser-only: shrink a picture the visitor picked on /submit-mod into a JPEG
// data URL small enough to send in the form body (see lib/submissionImage.ts).

import { SUBMISSION_IMAGE_MAX_BYTES, SUBMISSION_IMAGE_MAX_SIDE } from '@/lib/submissionImage';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/** Largest original file we try to read in the browser at all. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export async function shrinkImageForUpload(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, WebP, GIF or AVIF image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is larger than 25 MB. Please choose a smaller one.');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That image could not be opened. Please try another one.');
  });
  const scale = Math.min(1, SUBMISSION_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process the image.');
  // JPEG has no transparency: paint a dark background like the site's cards.
  ctx.fillStyle = '#151a2e';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // base64 payload length × 3/4 ≈ bytes
    if (((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4 <= SUBMISSION_IMAGE_MAX_BYTES) {
      return dataUrl;
    }
  }
  throw new Error('That image is too detailed to upload. Please try a smaller one.');
}
