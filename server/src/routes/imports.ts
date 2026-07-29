import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { financialTemplateCsv, parseFinancialWorkbook } from '../utils/excelImport.js';
import { computeFinancialRatios } from '../utils/ratios.js';
import { parsePerformanceContract } from '../utils/performanceContractImport.js';
import { parseFinancialPack, type PackMode } from '../utils/financialPackImport.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(authMiddleware);

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const ANNUAL_TEMPLATE_FILE = 'Annual Financial statements template.xlsx';
const QUARTERLY_TEMPLATE_FILE = 'Quarterly Financial statements template.xlsx';

/** Templates live at the repository root, next to the server folder. */
function resolveTemplate(fileName: string): string | null {
  const candidates = [
    path.resolve(currentDir, '..', '..', '..', fileName),
    path.resolve(currentDir, '..', '..', fileName),
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), '..', fileName),
    path.resolve(process.cwd(), 'templates', fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function sendTemplate(fileName: string, res: import('express').Response) {
  const filePath = resolveTemplate(fileName);
  if (!filePath) {
    return res.status(404).json({
      error: `Template file not found on the server (${fileName}) — enter the pack manually or upload a filled workbook`,
    });
  }
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.sendFile(filePath);
}

router.get('/annual-template', (_req, res) => sendTemplate(ANNUAL_TEMPLATE_FILE, res));

router.get('/quarterly-template', (_req, res) => sendTemplate(QUARTERLY_TEMPLATE_FILE, res));

/**
 * Business Process 4 / 6 — auto-fill the quarterly or annual reporting form
 * from a filled MINECOFIN statements workbook.
 */
router.post('/financial-pack', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Upload a completed Excel (.xlsx) workbook' });
    }

    const requested = String(
      (req.query.mode as string | undefined) ?? (req.body?.mode as string | undefined) ?? '',
    ).toLowerCase();
    if (requested && requested !== 'annual' && requested !== 'quarterly') {
      return res.status(400).json({ error: 'mode must be "annual" or "quarterly"' });
    }

    const data = parseFinancialPack(
      req.file.buffer,
      requested ? (requested as PackMode) : undefined,
    );
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to parse the statements workbook',
    });
  }
});

router.get('/financial-template', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="nipms-financial-statement-template.csv"',
  );
  return res.send(financialTemplateCsv());
});

/**
 * RS Business Process 4 — option to upload filled Excel/CSV into system tables.
 */
router.post('/financial-statements', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Upload an Excel (.xlsx) or CSV file' });
    }

    const parsed = parseFinancialWorkbook(req.file.buffer);
    const ratios = computeFinancialRatios(parsed.financialStatements);

    return res.json({
      data: {
        financialStatements: parsed.financialStatements,
        ratios,
        mappedFields: parsed.mappedFields,
        unmappedHeaders: parsed.unmappedHeaders,
      },
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to parse spreadsheet',
    });
  }
});

router.post('/performance-contract', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Upload a completed Word (.docx) contract' });
    }
    if (
      req.file.mimetype !==
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      !req.file.originalname.toLowerCase().endsWith('.docx')
    ) {
      return res.status(400).json({ error: 'Performance contract must be a .docx file' });
    }

    const data = await parsePerformanceContract(req.file.buffer);
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to read performance contract',
    });
  }
});

export default router;
