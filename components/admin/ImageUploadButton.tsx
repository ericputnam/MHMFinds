'use client';

import React, { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { ImagePlus, Loader2 } from 'lucide-react';
import {
  ALLOWED_UPLOAD_IMAGE_TYPES,
  MAX_UPLOAD_IMAGE_BYTES,
} from '@/lib/imageUpload';

interface ImageUploadButtonProps {
  /** Called with the public Blob URL of each uploaded image. */
  onUploaded: (url: string) => void;
  multiple?: boolean;
  label?: string;
}

/**
 * Uploads image files from the editor's computer to Vercel Blob (client
 * upload, token from /api/admin/upload-image). Use this for Patreon previews:
 * a copied Patreon image address expires and does not display on the site.
 */
export function ImageUploadButton({
  onUploaded,
  multiple = false,
  label = 'Upload image',
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!(ALLOWED_UPLOAD_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          throw new Error(`${file.name}: use a JPG, PNG, WebP, GIF or AVIF image`);
        }
        if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
          throw new Error(`${file.name}: image is larger than 15 MB`);
        }
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        const blob = await upload(`mods/uploads/${safeName}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload-image/',
          contentType: file.type,
        });
        onUploaded(blob.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_UPLOAD_IMAGE_TYPES.join(',')}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 whitespace-nowrap px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white rounded-lg transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
        {uploading ? 'Uploading…' : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
