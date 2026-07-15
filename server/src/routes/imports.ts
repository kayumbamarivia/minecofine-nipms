import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { financialTemplateCsv, parseFinancialWorkbook } from '../utils/excelImport.js';
import { computeFinancialRatios } from '../utils/ratios.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(authMiddleware);

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

export default router;
