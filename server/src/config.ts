import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function csv(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((part) => part.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function resolveAppUrl() {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl) return renderUrl.replace(/\/$/, '');
  return 'http://localhost:5173';
}

function resolveCorsOrigins() {
  const origins = new Set([
    ...csv(process.env.CORS_ORIGINS),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);
  const appUrl = resolveAppUrl();
  if (appUrl.startsWith('http')) origins.add(appUrl);
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim().replace(/\/$/, '');
  if (renderUrl) origins.add(renderUrl);
  return [...origins];
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nipms',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: resolveCorsOrigins(),
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Public web app URL used in verification / reset email links */
  appUrl: resolveAppUrl(),
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
