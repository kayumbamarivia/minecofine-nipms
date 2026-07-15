import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export type StorageDriver = 'local' | 's3';

export const config = {
  port: Number(process.env.PORT) || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nipms',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(','),
  nodeEnv: process.env.NODE_ENV || 'development',

  /**
   * Object storage:
   * - local  → disk under server/uploads (simple local development)
   * - s3     → MinIO or any S3-compatible store (recommended for ministry / shared deployment)
   */
  storageDriver: (process.env.STORAGE_DRIVER || 'local') as StorageDriver,
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'nipms-documents',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  },

  /** Public web app URL used in verification / reset email links */
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  mailFromName: process.env.MAIL_FROM_NAME || 'NIPMS',
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@nipms.local',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};
