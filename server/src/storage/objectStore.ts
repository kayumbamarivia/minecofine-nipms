import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localRoot = path.join(__dirname, '..', '..', 'uploads');

export interface StoredObject {
  /** Logical key used in MongoDB (relative path or S3 object key) */
  key: string;
  /** Driver that wrote the object */
  driver: 'local' | 's3';
  sizeBytes: number;
}

function ensureLocalRoot() {
  if (!fs.existsSync(localRoot)) {
    fs.mkdirSync(localRoot, { recursive: true });
  }
}

function buildKey(originalName: string) {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const month = new Date().toISOString().slice(0, 7);
  return `${month}/${Date.now()}-${safe}`;
}

let s3Client: S3Client | null = null;
let bucketReady: Promise<void> | null = null;

function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
    });
  }
  return s3Client;
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const client = getS3();
      try {
        await client.send(new HeadBucketCommand({ Bucket: config.s3.bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
        console.log(`Created S3/MinIO bucket: ${config.s3.bucket}`);
      }
    })();
  }
  await bucketReady;
}

export async function putObject(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<StoredObject> {
  const key = buildKey(originalName);

  if (config.storageDriver === 's3') {
    await ensureBucket();
    await getS3().send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return { key, driver: 's3', sizeBytes: buffer.length };
  }

  ensureLocalRoot();
  const fullPath = path.join(localRoot, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return { key, driver: 'local', sizeBytes: buffer.length };
}

export async function getObjectStream(
  key: string,
  driver: 'local' | 's3' = config.storageDriver,
): Promise<{ stream: NodeJS.ReadableStream; contentType?: string }> {
  if (driver === 's3') {
    const result = await getS3().send(
      new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      }),
    );
    if (!result.Body) {
      throw new Error('Empty object body from storage');
    }
    return {
      stream: result.Body as NodeJS.ReadableStream,
      contentType: result.ContentType,
    };
  }

  // Local: key may be absolute path (legacy) or relative key
  const fullPath = path.isAbsolute(key) ? key : path.join(localRoot, key);
  if (!fs.existsSync(fullPath)) {
    throw new Error('File missing from storage');
  }
  return { stream: fs.createReadStream(fullPath) };
}

export async function deleteObject(
  key: string,
  driver: 'local' | 's3' = config.storageDriver,
): Promise<void> {
  if (driver === 's3') {
    await getS3().send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      }),
    );
    return;
  }

  const fullPath = path.isAbsolute(key) ? key : path.join(localRoot, key);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function resolveLegacyDriver(storagePath: string, storageDriver?: string): 'local' | 's3' {
  if (storageDriver === 's3' || storageDriver === 'local') return storageDriver;
  // Legacy absolute disk paths
  if (path.isAbsolute(storagePath) || storagePath.includes(`${path.sep}uploads${path.sep}`)) {
    return 'local';
  }
  return config.storageDriver;
}

export function getStorageStatus() {
  return {
    driver: config.storageDriver,
    bucket: config.storageDriver === 's3' ? config.s3.bucket : null,
    endpoint: config.storageDriver === 's3' ? config.s3.endpoint : null,
  };
}
