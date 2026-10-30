import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authOptions } from '@/lib/authOptions';
import {
  ALLOWED_UPLOAD_IMAGE_TYPES,
  MAX_UPLOAD_IMAGE_BYTES,
} from '@/lib/imageUpload';

export const dynamic = 'force-dynamic';

// POST - Issue a Vercel Blob client-upload token so the admin mod forms can
// upload an image file straight from the browser (no 4.5 MB serverless body
// limit). Used instead of pasting an image address — Patreon image addresses
// are signed, expire, and are rejected by next/image.
//
// No onUploadCompleted callback: the form gets the blob URL back from
// upload() directly, and Vercel's callback would carry no admin session.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('mods/uploads/')) {
          throw new Error('Invalid upload path');
        }
        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_IMAGE_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating image upload token:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload failed' },
      { status: 400 }
    );
  }
}
