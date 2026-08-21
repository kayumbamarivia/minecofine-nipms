import { Readable } from 'stream';
import mongoose from 'mongoose';

const GRIDFS_BUCKET = 'nipms_files';

export interface StoredObject {
  key: string;
  sizeBytes: number;
}

function buildKey(originalName: string) {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const month = new Date().toISOString().slice(0, 7);
  return `${month}/${Date.now()}-${safe}`;
}

function getGridFsBucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
}

export async function putObject(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredObject> {
  const key = buildKey(originalName);
  const bucket = getGridFsBucket();

  await new Promise<void>((resolve, reject) => {
    const upload = bucket.openUploadStream(key, {
      contentType: mimeType,
      metadata: { storedAt: new Date().toISOString() },
    });
    upload.on('error', reject);
    upload.on('finish', () => resolve());
    Readable.from(buffer).pipe(upload);
  });

  return { key, sizeBytes: buffer.length };
}

export async function getObjectStream(
  key: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType?: string }> {
  const bucket = getGridFsBucket();
  const files = await bucket.find({ filename: key }).toArray();
  if (!files.length) {
    throw new Error('File missing from storage');
  }
  const latest = files[files.length - 1];
  return {
    stream: bucket.openDownloadStream(latest._id) as unknown as NodeJS.ReadableStream,
    contentType: latest.contentType,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const bucket = getGridFsBucket();
  const files = await bucket.find({ filename: key }).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id)));
}

export function getStorageStatus() {
  return {
    driver: 'gridfs' as const,
    bucket: GRIDFS_BUCKET,
  };
}
