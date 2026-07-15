import { Router } from 'express';
import { Company } from '../models/Company.js';
import { authMiddleware, requireRoles, type AuthRequest } from '../middleware/auth.js';
import { toCompanyDto } from '../serializers.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const filter = req.user!.companyId ? { _id: req.user!.companyId } : {};
  const companies = await Company.find(filter).sort({ name: 1 });
  return res.json({ data: companies.map(toCompanyDto) });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  if (req.user!.companyId && company._id.toString() !== req.user!.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.json({ data: toCompanyDto(company) });
});

router.post('/', requireRoles('portfolio_analyst'), async (req: AuthRequest, res) => {
  const body = req.body as Record<string, unknown>;
  const code = String(body.code ?? '').trim().toUpperCase();
  const name = String(body.name ?? '').trim();
  const sector = String(body.sector ?? '').trim();

  if (!code || !name || !sector) {
    return res.status(400).json({ error: 'Code, name, and sector are required' });
  }

  const existing = await Company.findOne({ code });
  if (existing) {
    return res.status(409).json({ error: 'A company with this code already exists' });
  }

  const company = await Company.create({
    code,
    name,
    sector,
    status: 'pending_registration',
    location: body.location ?? '',
    province: body.province ?? '',
    ministry: body.ministry ?? 'MINECOFIN',
    description: body.description ?? '',
    investmentAmount: Number(body.investmentAmount ?? 0),
    ownershipPct: Number(body.ownershipPct ?? 100),
    ceoName: body.ceoName ?? '',
    cfoName: body.cfoName ?? '',
    boardChair: body.boardChair ?? '',
    establishedDate: body.createdDate ?? body.establishedDate ?? '',
  });

  return res.status(201).json({ data: toCompanyDto(company) });
});

router.patch('/:id', requireRoles('portfolio_analyst'), async (req: AuthRequest, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const fields = req.body as Record<string, unknown>;
  const map: Record<string, keyof typeof company> = {
    name: 'name',
    sector: 'sector',
    status: 'status',
    location: 'location',
    province: 'province',
    ministry: 'ministry',
    description: 'description',
    investmentAmount: 'investmentAmount',
    ownershipPct: 'ownershipPct',
    ceoName: 'ceoName',
    cfoName: 'cfoName',
    boardChair: 'boardChair',
    createdDate: 'establishedDate',
  };

  for (const [key, prop] of Object.entries(map)) {
    if (fields[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (company as any)[prop] = fields[key];
    }
  }

  await company.save();
  return res.json({ data: toCompanyDto(company) });
});

export default router;
