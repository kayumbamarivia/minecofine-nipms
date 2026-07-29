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
  assignedAnalystName = '',
  companyAssigneeName = '',
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
    assignmentType: doc.assignmentType || 'company',
    assignedAnalystId: doc.assignedAnalystId?.toString() ?? null,
    assignedAnalystName: assignedAnalystName || null,
    companyAssigneeId: doc.companyAssigneeId?.toString() ?? null,
    companyAssigneeName: companyAssigneeName || null,
    assignedTo: assignedAnalystName || companyAssigneeName || doc.assignedTo,
    resolutionNote: doc.resolutionNote || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

router.get('/assignees', async (req: AuthRequest, res) => {
  const user = req.user!;
  const filter =
    user.companyId
      ? { companyId: user.companyId, role: { $in: ['company_submitter', 'company_approver'] } }
      : { role: 'portfolio_analyst' };
  const rows = await User.find({ ...filter, isActive: true })
    .select('fullName role companyId title')
    .sort({ fullName: 1 });

  return res.json({
    data: rows.map((row) => ({
      id: row._id.toString(),
      fullName: row.fullName,
      role: row.role,
      companyId: row.companyId?.toString() ?? null,
      title: row.title,
    })),
  });
});

router.get('/', async (req: AuthRequest, res) => {
  const filter = req.user!.companyId ? { companyId: req.user!.companyId } : {};
  const rows = await ActionPoint.find(filter).sort({ updatedAt: -1 });

  const companyIds = [...new Set(rows.map((r) => r.companyId.toString()))];
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [
        r.raisedBy.toString(),
        ...(r.assignedAnalystId ? [r.assignedAnalystId.toString()] : []),
        ...(r.companyAssigneeId ? [r.companyAssigneeId.toString()] : []),
      ]),
    ),
  ];
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
        userMap.get(row.raisedBy.toString()) ?? '',
        row.assignedAnalystId ? userMap.get(row.assignedAnalystId.toString()) ?? '' : '',
        row.companyAssigneeId ? userMap.get(row.companyAssigneeId.toString()) ?? '' : '',
      ),
    ),
  });
});

router.post(
  '/',
  requireRoles('portfolio_analyst', 'department_head', 'leadership'),
  async (req: AuthRequest, res) => {
    const {
      companyId,
      submissionId,
      title,
      description,
      category,
      priority,
      dueDate,
      assignmentType,
      assignedAnalystId,
    } = req.body as {
      companyId?: string;
      submissionId?: string;
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      dueDate?: string;
      assignmentType?: string;
      assignedAnalystId?: string;
    };

    if (!companyId || !title) {
      return res.status(400).json({ error: 'Company and title are required' });
    }

    if (!Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: 'Invalid company identifier' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const nextAssignmentType = assignmentType === 'analyst' ? 'analyst' : 'company';
    let analyst: InstanceType<typeof User> | null = null;
    if (nextAssignmentType === 'analyst') {
      if (!assignedAnalystId || !Types.ObjectId.isValid(assignedAnalystId)) {
        return res.status(400).json({ error: 'Select a valid portfolio analyst' });
      }
      analyst = await User.findOne({
        _id: assignedAnalystId,
        role: 'portfolio_analyst',
        isActive: true,
      });
      if (!analyst) {
        return res.status(400).json({ error: 'Selected analyst is not available' });
      }
    }

    const doc = await ActionPoint.create({
      companyId: company._id,
      submissionId:
        submissionId && Types.ObjectId.isValid(submissionId)
          ? submissionId
          : null,
      title,
      description: description ?? '',
      category: category ?? 'other',
      priority: priority ?? 'medium',
      status: 'open',
      dueDate: dueDate ?? '',
      raisedBy: req.user!.id,
      assignmentType: nextAssignmentType,
      assignedAnalystId: analyst?._id ?? null,
      companyAssigneeId: null,
      assignedTo: '',
    });

    return res.status(201).json({
      data: toDto(doc, company.name, req.user!.fullName, analyst?.fullName ?? ''),
    });
  },
);

router.patch('/:id', async (req: AuthRequest, res) => {
  const user = req.user!;
  const doc = await ActionPoint.findById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Action point not found' });
  }

  if (user.companyId && doc.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const body = req.body as {
    status?: typeof doc.status;
    resolutionNote?: string;
    companyAssigneeId?: string;
    priority?: typeof doc.priority;
    description?: string;
  };
  const assignmentType = doc.assignmentType || 'company';
  const canHandle =
    user.role === 'department_head' ||
    user.role === 'leadership' ||
    (user.role === 'portfolio_analyst' &&
      assignmentType === 'analyst' &&
      doc.assignedAnalystId?.toString() === user.id) ||
    (Boolean(user.companyId) &&
      assignmentType === 'company' &&
      doc.companyAssigneeId?.toString() === user.id);

  if (
    (body.status !== undefined || body.resolutionNote !== undefined) &&
    !canHandle
  ) {
    return res.status(403).json({ error: 'This action point is assigned to another handler' });
  }

  if (body.companyAssigneeId !== undefined) {
    if (!user.companyId || assignmentType !== 'company') {
      return res.status(403).json({
        error: 'Only the assigned company can select its responsible person',
      });
    }
    if (!body.companyAssigneeId || !Types.ObjectId.isValid(body.companyAssigneeId)) {
      return res.status(400).json({ error: 'Select a valid company user' });
    }
    const companyAssignee = await User.findOne({
      _id: body.companyAssigneeId,
      companyId: doc.companyId,
      role: { $in: ['company_submitter', 'company_approver'] },
      isActive: true,
    });
    if (!companyAssignee) {
      return res.status(400).json({ error: 'Selected person does not belong to this company' });
    }
    doc.companyAssigneeId = companyAssignee._id;
    doc.assignedTo = '';
  }

  if (body.status !== undefined) doc.status = body.status as typeof doc.status;
  if (body.resolutionNote !== undefined) doc.resolutionNote = body.resolutionNote;
  if (
    (user.role === 'department_head' || user.role === 'leadership') &&
    body.priority !== undefined
  ) {
    doc.priority = body.priority as typeof doc.priority;
  }
  if (
    (user.role === 'department_head' || user.role === 'leadership') &&
    body.description !== undefined
  ) {
    doc.description = body.description;
  }

  await doc.save();
  const company = await Company.findById(doc.companyId).select('name');
  const raiser = await User.findById(doc.raisedBy).select('fullName');
  const [analyst, companyAssignee] = await Promise.all([
    doc.assignedAnalystId
      ? User.findById(doc.assignedAnalystId).select('fullName')
      : Promise.resolve(null),
    doc.companyAssigneeId
      ? User.findById(doc.companyAssigneeId).select('fullName')
      : Promise.resolve(null),
  ]);
  return res.json({
    data: toDto(
      doc,
      company?.name ?? '',
      raiser?.fullName ?? '',
      analyst?.fullName ?? '',
      companyAssignee?.fullName ?? '',
    ),
  });
});

export default router;
