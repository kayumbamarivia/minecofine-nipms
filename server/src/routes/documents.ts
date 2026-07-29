import { Router } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { DocumentFile } from '../models/DocumentFile.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import {
  putObject,
  getObjectStream,
  deleteObject,
  resolveLegacyDriver,
} from '../storage/objectStore.js';
import { config } from '../config.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use PDF, Office, CSV, or image files.'));
    }
  },
});

const router = Router();
router.use(authMiddleware);

function toDto(
  doc: InstanceType<typeof DocumentFile>,
  companyName = '',
  uploadedByName = '',
) {
  return {
    id: doc._id.toString(),
    companyId: doc.companyId.toString(),
    companyName,
    submissionId: doc.submissionId ? doc.submissionId.toString() : null,
    name: doc.name,
    category: doc.category,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    storageDriver: doc.storageDriver || 'local',
    notes: doc.notes || null,
    uploadedBy: doc.uploadedBy.toString(),
    uploadedByName,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function previewPage(title: string, content: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 32px; color: #172033; background: white; font: 14px/1.55 Arial, sans-serif; }
    h1, h2, h3 { color: #101828; } table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #d0d5dd; padding: 8px; text-align: left; vertical-align: top; }
    img { max-width: 100%; height: auto; } pre { white-space: pre-wrap; overflow-wrap: anywhere; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

router.get('/', async (req: AuthRequest, res) => {
  const { companyId, submissionId } = req.query as {
    companyId?: string;
    submissionId?: string;
  };
  const filter: Record<string, unknown> = {};

  if (req.user!.companyId) {
    filter.companyId = req.user!.companyId;
  } else if (companyId && Types.ObjectId.isValid(companyId)) {
    filter.companyId = companyId;
  }
  if (submissionId && Types.ObjectId.isValid(submissionId)) {
    filter.submissionId = submissionId;
  }

  const rows = await DocumentFile.find(filter).sort({ createdAt: -1 });
  const companyIds = [...new Set(rows.map((r) => r.companyId.toString()))];
  const userIds = [...new Set(rows.map((r) => r.uploadedBy.toString()))];
  const [companies, users] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select('name'),
    User.find({ _id: { $in: userIds } }).select('fullName'),
  ]);
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u.fullName]));

  return res.json({
    data: rows.map((row) =>
      toDto(
        row,
        companyMap.get(row.companyId.toString()) ?? '',
        userMap.get(row.uploadedBy.toString()) ?? '',
      ),
    ),
    storage: { driver: config.storageDriver },
  });
});

router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { companyId, submissionId, name, category, notes } = req.body as Record<string, string>;
    const file = req.file;

    if (!file?.buffer) {
      return res.status(400).json({ error: 'A file is required' });
    }

    const targetCompanyId = user.companyId ?? companyId;
    if (!targetCompanyId || !Types.ObjectId.isValid(targetCompanyId)) {
      return res.status(400).json({ error: 'Valid company is required' });
    }

    if (!category || !name) {
      return res.status(400).json({ error: 'Document name and category are required' });
    }

    const company = await Company.findById(targetCompanyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (user.companyId && company._id.toString() !== user.companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stored = await putObject(file.buffer, file.originalname, file.mimetype);

    const doc = await DocumentFile.create({
      companyId: company._id,
      submissionId:
        submissionId && Types.ObjectId.isValid(submissionId) ? submissionId : null,
      name,
      category,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: stored.sizeBytes,
      storagePath: stored.key,
      storageDriver: stored.driver,
      uploadedBy: user.id,
      notes: notes ?? '',
    });

    return res.status(201).json({
      data: toDto(doc, company.name, user.fullName),
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

router.get('/:id/download', async (req: AuthRequest, res) => {
  try {
    const doc = await DocumentFile.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.user!.companyId && doc.companyId.toString() !== req.user!.companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const driver = resolveLegacyDriver(doc.storagePath, doc.storageDriver);
    const { stream, contentType } = await getObjectStream(doc.storagePath, driver);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.originalName.replace(/"/g, '')}"`,
    );
    res.setHeader('Content-Type', contentType || doc.mimeType || 'application/octet-stream');
    stream.pipe(res);
  } catch (error) {
    return res.status(404).json({
      error: error instanceof Error ? error.message : 'File missing from storage',
    });
  }
});

router.get('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const doc = await DocumentFile.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (req.user!.companyId && doc.companyId.toString() !== req.user!.companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const driver = resolveLegacyDriver(doc.storagePath, doc.storageDriver);
    const { stream, contentType } = await getObjectStream(doc.storagePath, driver);
    const buffer = await streamToBuffer(stream);
    const mimeType = contentType || doc.mimeType || 'application/octet-stream';
    const filename = doc.originalName.toLowerCase();

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${doc.originalName.replaceAll('"', '')}"`,
    );

    if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
      res.setHeader('Content-Type', mimeType);
      return res.send(buffer);
    }

    let convertedHtml = '';
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      const converted = await mammoth.convertToHtml({ buffer });
      convertedHtml = converted.value;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/csv' ||
      /\.(xlsx|xls|csv)$/.test(filename)
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      convertedHtml = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return `<h2>${escapeHtml(sheetName)}</h2>${XLSX.utils.sheet_to_html(sheet)}`;
      }).join('');
    } else if (mimeType.startsWith('text/') || filename.endsWith('.txt')) {
      convertedHtml = `<pre>${escapeHtml(buffer.toString('utf8'))}</pre>`;
    } else {
      return res.status(415).json({
        error: 'Preview is unavailable for this file type. Download the original file instead.',
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(previewPage(doc.originalName, convertedHtml));
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to generate preview',
    });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const user = req.user!;
  const doc = await DocumentFile.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (user.companyId && doc.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const canDelete =
    user.role === 'portfolio_analyst' ||
    user.role === 'department_head' ||
    doc.uploadedBy.toString() === user.id;

  if (!canDelete) {
    return res.status(403).json({ error: 'Insufficient permissions to delete this document' });
  }

  const driver = resolveLegacyDriver(doc.storagePath, doc.storageDriver);
  try {
    await deleteObject(doc.storagePath, driver);
  } catch (error) {
    console.warn('Storage delete warning:', error);
  }
  await doc.deleteOne();
  return res.json({ success: true });
});

export default router;
