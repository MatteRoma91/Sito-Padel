import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import {
  insertGalleryMedia,
  getGalleryMedia,
  getGalleryMediaCount,
  getGalleryTotalSize,
} from '@/lib/db/queries';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
// @ts-expect-error - no types for heic-convert
import heicConvert from 'heic-convert';
import { randomUUID } from 'crypto';

const GALLERY_LIMIT_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const GALLERY_DIR = path.join(process.cwd(), 'public', 'gallery');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', ''];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

function detectImageFormatFromBuffer(buffer: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | 'heic' | null {
  if (buffer.length < 12) return null;
  const hex = buffer.slice(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'jpeg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'png';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('52494646') && buffer.length >= 12) return 'webp';
  const ftyp = buffer.slice(4, 12).toString('ascii');
  if (ftyp.startsWith('ftyp') && (ftyp.includes('heic') || ftyp.includes('mif1'))) return 'heic';
  return null;
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
  const offset = (page - 1) * limit;

  const items = getGalleryMedia({ limit, offset });
  const total = getGalleryMediaCount();
  const totalSize = getGalleryTotalSize();

  return NextResponse.json({
    items,
    total,
    totalSize,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  try {
    await mkdir(GALLERY_DIR, { recursive: true });
  } catch {
    // directory exists
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nessun file caricato' }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.includes(file.type) || file.type === '';
    const isVideo = VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({
        success: false,
        error: 'Formato non supportato. Usa immagini (JPG, PNG, WebP, GIF, HEIC) o video (MP4, WebM).',
      }, { status: 400 });
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: isImage
          ? `Immagine troppo grande. Massimo ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`
          : `Video troppo grande. Massimo ${MAX_VIDEO_SIZE / 1024 / 1024} MB.`,
      }, { status: 400 });
    }

    const currentTotal = getGalleryTotalSize();
    if (currentTotal + file.size > GALLERY_LIMIT_BYTES) {
      return NextResponse.json({
        success: false,
        error: 'Spazio galleria esaurito (limite 20 GB).',
      }, { status: 400 });
    }

    let buffer: Buffer;
    let ext: string;
    let mimeType: string;
    let type: 'image' | 'video';

    if (isVideo) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      ext = file.type === 'video/webm' ? 'webm' : 'mp4';
      mimeType = file.type;
      type = 'video';
    } else {
      const bytes = await file.arrayBuffer();
      let buf = Buffer.from(bytes);
      const detectedFormat = detectImageFormatFromBuffer(buf);

      const supportedFormats = ['jpeg', 'png', 'gif', 'webp', 'heic'];
      if (!detectedFormat || !supportedFormats.includes(detectedFormat)) {
        return NextResponse.json({ success: false, error: 'Formato immagine non supportato.' }, { status: 400 });
      }

      if (file.type === 'image/heic' || file.type === 'image/heif' || detectedFormat === 'heic') {
        try {
          buf = Buffer.from(await heicConvert({ buffer: buf, format: 'jpeg', quality: 0.9 }));
          ext = 'jpg';
          mimeType = 'image/jpeg';
        } catch {
          return NextResponse.json({ success: false, error: 'Impossibile elaborare HEIC.' }, { status: 400 });
        }
      } else {
        ext = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;
        mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      }
      buffer = buf;
      type = 'image';
    }

    const filename = `${randomUUID()}.${ext}`;
    const filePath = path.join(GALLERY_DIR, filename);
    await writeFile(filePath, buffer);

    const file_path = `/gallery/${filename}`;
    const id = insertGalleryMedia({
      filename,
      file_path,
      size_bytes: buffer.length,
      type,
      mime_type: mimeType,
      user_id: currentUser.id,
    });

    revalidatePath('/gallery');
    revalidatePath('/settings');

    return NextResponse.json({
      success: true,
      id,
      file_path,
      type,
      size_bytes: buffer.length,
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante il caricamento' }, { status: 500 });
  }
}
