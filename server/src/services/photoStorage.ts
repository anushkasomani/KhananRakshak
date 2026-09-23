import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Where uploaded photos live. For now: a folder on this machine (server/uploads, git-ignored), served at /api/uploads.
 * To move to cloud storage (S3, Cloudinary, ...), reimplement savePhoto() to upload there and return its URL;
 * nothing else in the app needs to change.
 *
 * File names are random UUIDs, so a photo can only be opened by someone who was given its link.
 */
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
export const PUBLIC_PREFIX = '/api/uploads';

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  jpeg: { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};

export class PhotoError extends Error {}

/** Saves a base64 data-URL image and returns its public URL. Throws PhotoError for bad input. */
export async function savePhoto(dataUrl: unknown, folder: string): Promise<string> {
  const match = typeof dataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new PhotoError('Photos must be JPEG, PNG or WebP images.');
  const type = TYPES[match[1]];
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_BYTES) throw new PhotoError('Each photo must be under 3 MB.');
  if (!type.magic(bytes)) throw new PhotoError('One of the photos is not a valid image.');

  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${type.ext}`;
  await fs.writeFile(path.join(dir, name), bytes);
  return `${PUBLIC_PREFIX}/${folder}/${name}`;
}
