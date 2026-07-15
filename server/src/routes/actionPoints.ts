import { Router } from 'express';
import { Types } from 'mongoose';
import { ActionPoint } from '../models/ActionPoint.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { authMiddleware, requireRoles, type AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function toDto(
  doc: InstanceType<typeof ActionPoint>,
  companyName = '',
  raisedByName = '',
) {
  return {
    id: doc._id.toString(),
    companyId: doc.companyId.toString(),
    companyName,
    submissionId: doc.submissionId ? doc.submissionId.toString() : null,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    priority: doc.priority,
    status: doc.status,
    dueDate: doc.dueDate || null,
    raisedBy: doc.raisedBy.toString(),
    raisedByName,
    assignedTo: doc.assignedTo,
    resolutionNote: doc.resolutionNote || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

router.get('/', async (req: AuthRequest, res) => {
  const filter = req.user!.companyId ? { companyId: req.user!.companyId } : {};
  const rows = await ActionPoint.find(filter).sort({ updatedAt: -1 });

  const companyIds = [...new Set(rows.map((r) => r.companyId.toString()))];
  const userIds = [...new Set(rows.map((r) => r.raisedBy.toString()))];
  const [companies, users] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select('name'),
    User.find({ _id: { $in: userIds } }).select('fullName'),
  ]);
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u.fullName]));

  return res.json({
    data: rows.map((row) =>
      toDto(row, companyMap.get(row.companyId.toString()) ?? '', userMap.get(row.raisedBy.toString()) ?? ''),
    ),
  });
});

router.post(
  '/',
  requireRoles('portfolio_analyst', 'department_head', 'leadership'),
  async (req: AuthRequest, res) => {
    const { companyId, submissionId, title, description, category, priority, dueDate, assignedTo } =
      req.body as Record<string, unknown>;

    if (!companyId || !title) {
      return res.status(400).json({ error: 'Company and title are required' });
    }

    if (!Types.ObjectId.isValid(String(companyId))) {
      return res.status(400).json({ error: 'Invalid company identifier' });
    }

    const company = await Company.findById(String(companyId));
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const doc = await ActionPoint.create({
      companyId: company._id,
      submissionId:
        submissionId && Types.ObjectId.isValid(String(submissionId))
          ? String(submissionId)
          : null,
      title: String(title),
      description: String(description ?? ''),
      category: category ?? 'other',
      priority: priority ?? 'medium',
      status: 'open',
      dueDate: dueDate ?? '',
      raisedBy: req.user!.id,
      assignedTo: assignedTo ?? '',
    });

    return res.status(201).json({
      data: toDto(doc, company.name, req.user!.fullName),
    });
  },
);

router.patch('/:id', async (req: AuthRequest, res) => {
  const doc = await ActionPoint.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Action point not found' });
  }

  if (req.user!.companyId && doc.companyId.toString() !== req.user!.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const body = req.body as Record<string, unknown>;
  if (body.status !== undefined) doc.status = body.status as typeof doc.status;
  if (body.resolutionNote !== undefined) doc.resolutionNote = String(body.resolutionNote);
  if (body.assignedTo !== undefined) doc.assignedTo = String(body.assignedTo);
  if (body.priority !== undefined) doc.priority = body.priority as typeof doc.priority;
  if (body.description !== undefined) doc.description = String(body.description);

  await doc.save();
  const company = await Company.findById(doc.companyId).select('name');
  const raiser = await User.findById(doc.raisedBy).select('fullName');
  return res.json({
    data: toDto(doc, company?.name ?? '', raiser?.fullName ?? ''),
  });
});

export default router;
