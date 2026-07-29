import { Router } from 'express';
import { Types } from 'mongoose';
import { Company } from '../models/Company.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { WorkflowEvent } from '../models/WorkflowEvent.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { toSubmissionDto } from '../serializers.js';
import { computeFinancialRatios } from '../utils/ratios.js';
import type { SubmissionStatus, SubmissionType, UserRole } from '../types.js';

const router = Router();
router.use(authMiddleware);

async function hydrateSubmission(submissionId: string) {
  const submission = await Submission.findById(submissionId);
  if (!submission) return null;

  const [company, submitter] = await Promise.all([
    Company.findById(submission.companyId).select('name code'),
    submission.submittedBy ? User.findById(submission.submittedBy).select('fullName') : null,
  ]);

  return toSubmissionDto({
    ...submission.toObject(),
    companyName: company?.name ?? '',
    companyCode: company?.code ?? '',
    submittedByName: submitter?.fullName ?? null,
  });
}

async function listSubmissions(companyId: string | null) {
  const filter = companyId ? { companyId } : {};
  const rows = await Submission.find(filter).sort({ updatedAt: -1 });

  const companyIds = [...new Set(rows.map((r) => r.companyId.toString()))];
  const userIds = [...new Set(rows.map((r) => r.submittedBy?.toString()).filter(Boolean))] as string[];

  const [companies, users] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select('name code'),
    User.find({ _id: { $in: userIds } }).select('fullName'),
  ]);

  const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return rows.map((row) => {
    const company = companyMap.get(row.companyId.toString());
    const submitter = row.submittedBy ? userMap.get(row.submittedBy.toString()) : null;
    return toSubmissionDto({
      ...row.toObject(),
      companyName: company?.name ?? '',
      companyCode: company?.code ?? '',
      submittedByName: submitter?.fullName ?? null,
    });
  });
}

async function logEvent(
  submissionId: string,
  actorId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  comment = '',
) {
  await WorkflowEvent.create({
    submissionId,
    actorId,
    action,
    fromStatus,
    toStatus,
    comment,
  });
}

function enrichPayload(type: SubmissionType, payload: Record<string, unknown>) {
  if (type !== 'quarterly_report' && type !== 'annual_report') {
    return payload;
  }

  const statements = (payload.financialStatements as Record<string, number>) ?? payload;
  const ratios = computeFinancialRatios(statements);
  return {
    ...payload,
    financialStatements: {
      revenue: Number(statements.revenue ?? 0),
      costOfSales: Number(statements.costOfSales ?? 0),
      operatingExpenses: Number(statements.operatingExpenses ?? 0),
      interestExpense: Number(statements.interestExpense ?? 0),
      taxExpense: Number(statements.taxExpense ?? 0),
      currentAssets: Number(statements.currentAssets ?? 0),
      nonCurrentAssets: Number(statements.nonCurrentAssets ?? 0),
      currentLiabilities: Number(statements.currentLiabilities ?? 0),
      nonCurrentLiabilities: Number(statements.nonCurrentLiabilities ?? 0),
      equity: Number(statements.equity ?? 0),
      operatingCashFlow: Number(statements.operatingCashFlow ?? 0),
      investingCashFlow: Number(statements.investingCashFlow ?? 0),
      financingCashFlow: Number(statements.financingCashFlow ?? 0),
    },
    ratios,
    operationalMetrics: payload.operationalMetrics ?? {},
    governanceMetrics: payload.governanceMetrics ?? {},
    documentChecklist: payload.documentChecklist ?? {
      signedFinancialStatements: false,
      boardMinutes: false,
      otherReports: false,
    },
    // Preserve the full IFRS pack when present (quarterly_fs_v1/v2, annual_fs_v1).
    ...(payload.templateVersion ? { templateVersion: payload.templateVersion } : {}),
    ...(payload.cover ? { cover: payload.cover } : {}),
    ...(payload.trialBalance ? { trialBalance: payload.trialBalance } : {}),
    ...(payload.balanceSheet ? { balanceSheet: payload.balanceSheet } : {}),
    ...(payload.incomeStatement ? { incomeStatement: payload.incomeStatement } : {}),
    ...(payload.cashFlow ? { cashFlow: payload.cashFlow } : {}),
    ...(payload.changesInEquity ? { changesInEquity: payload.changesInEquity } : {}),
    ...(payload.balanceSheetNotes ? { balanceSheetNotes: payload.balanceSheetNotes } : {}),
    ...(payload.incomeStatementNotes ? { incomeStatementNotes: payload.incomeStatementNotes } : {}),
    ...(payload.financialAnalysisComments
      ? { financialAnalysisComments: payload.financialAnalysisComments }
      : {}),
    ...(payload.operationalKpis ? { operationalKpis: payload.operationalKpis } : {}),
    ...(payload.governanceKpis ? { governanceKpis: payload.governanceKpis } : {}),
  };
}

function canAct(role: UserRole, status: SubmissionStatus, type?: SubmissionType): boolean {
  if (role === 'company_submitter' && ['draft', 'returned'].includes(status)) return true;
  if (
    role === 'portfolio_analyst' &&
    ['draft', 'returned'].includes(status) &&
    type === 'soe_creation'
  ) {
    return true;
  }
  if (role === 'company_approver' && status === 'pending_company_approval') return true;
  if (role === 'portfolio_analyst' && status === 'pending_ministry_review') return true;
  if (role === 'department_head' && status === 'pending_department_approval') return true;
  return false;
}

function nextOnSubmit(
  status: SubmissionStatus,
  type: SubmissionType,
  role: UserRole,
): { status: SubmissionStatus; stage: 'company' | 'ministry' | 'department' } | null {
  if (status !== 'draft' && status !== 'returned') return null;

  // Business Process 1 — Create SOE: analyst → Head of Department
  if (type === 'soe_creation' && role === 'portfolio_analyst') {
    return { status: 'pending_department_approval', stage: 'department' };
  }

  // Company packages start with company approval
  return { status: 'pending_company_approval', stage: 'company' };
}

function nextOnApprove(
  role: UserRole,
  status: SubmissionStatus,
): { status: SubmissionStatus; stage: 'ministry' | 'department' | 'final' } | null {
  if (role === 'company_approver' && status === 'pending_company_approval') {
    return { status: 'pending_ministry_review', stage: 'ministry' };
  }
  if (role === 'portfolio_analyst' && status === 'pending_ministry_review') {
    return { status: 'pending_department_approval', stage: 'department' };
  }
  if (role === 'department_head' && status === 'pending_department_approval') {
    return { status: 'approved', stage: 'final' };
  }
  return null;
}

async function applyApprovedEffects(submission: InstanceType<typeof Submission>) {
  const company = await Company.findById(submission.companyId);
  if (!company) return;

  const payload = submission.payload as Record<string, unknown>;

  if (submission.type === 'soe_creation') {
    company.status = 'active';
    if (payload.name) company.name = String(payload.name);
    if (payload.sector) company.sector = String(payload.sector);
    if (payload.location) company.location = String(payload.location);
    if (payload.province) company.province = String(payload.province);
    if (payload.ministry) company.ministry = String(payload.ministry);
    if (payload.description) company.description = String(payload.description);
    if (payload.ceoName) company.ceoName = String(payload.ceoName);
    if (payload.cfoName) company.cfoName = String(payload.cfoName);
    if (payload.boardChair) company.boardChair = String(payload.boardChair);
    if (payload.establishedDate) company.establishedDate = String(payload.establishedDate);
    if (payload.investmentAmount !== undefined) {
      company.investmentAmount = Number(payload.investmentAmount);
    }
    if (payload.ownershipPct !== undefined) {
      company.ownershipPct = Number(payload.ownershipPct);
    }
    await company.save();
  }

  if (submission.type === 'profile_update') {
    const fields = [
      'name',
      'sector',
      'establishedDate',
      'location',
      'province',
      'ministry',
      'description',
      'investmentAmount',
      'ownershipPct',
      'ceoName',
      'cfoName',
      'boardChair',
    ] as const;
    for (const field of fields) {
      if (payload[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (company as any)[field] = payload[field];
      }
    }
    await company.save();
  }
}

router.get('/', async (req: AuthRequest, res) => {
  const data = await listSubmissions(req.user!.companyId);
  return res.json({ data });
});

function canEditFeedback(role: UserRole) {
  return ['company_approver', 'portfolio_analyst', 'department_head'].includes(role);
}

async function toEventDto(event: InstanceType<typeof WorkflowEvent>) {
  const actor = await User.findById(event.actorId).select('fullName');
  return {
    id: event._id.toString(),
    submissionId: event.submissionId.toString(),
    actorId: event.actorId.toString(),
    actorName: actor?.fullName ?? 'Unknown',
    action: event.action,
    comment: event.comment || null,
    fromStatus: event.fromStatus || null,
    toStatus: event.toStatus || null,
    createdAt: event.createdAt.toISOString(),
  };
}

router.get('/:id/events', async (req: AuthRequest, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (req.user!.companyId && submission.companyId.toString() !== req.user!.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const events = await WorkflowEvent.find({ submissionId: submission._id }).sort({ createdAt: 1 });
  const actors = await User.find({
    _id: { $in: events.map((e) => e.actorId) },
  }).select('fullName');
  const actorMap = new Map(actors.map((a) => [a._id.toString(), a.fullName]));

  return res.json({
    data: events.map((e) => ({
      id: e._id.toString(),
      submissionId: e.submissionId.toString(),
      actorId: e.actorId.toString(),
      actorName: actorMap.get(e.actorId.toString()) ?? 'Unknown',
      action: e.action,
      comment: e.comment || null,
      fromStatus: e.fromStatus || null,
      toStatus: e.toStatus || null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.patch('/:id/events/:eventId', async (req: AuthRequest, res) => {
  const user = req.user!;
  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  if (!canEditFeedback(user.role)) {
    return res.status(403).json({ error: 'Your role cannot edit review feedback' });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  if (user.companyId && submission.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const event = await WorkflowEvent.findOne({
    _id: req.params.eventId,
    submissionId: submission._id,
  });
  if (!event) {
    return res.status(404).json({ error: 'Feedback event not found' });
  }

  const nextComment = comment.trim();
  event.comment = nextComment;
  await event.save();

  // Keep the active return banner in sync when clarifying the latest return reason.
  if (event.action === 'returned' || event.action === 'feedback') {
    const latestFeedback = await WorkflowEvent.findOne({
      submissionId: submission._id,
      action: { $in: ['returned', 'feedback'] },
      comment: { $ne: '' },
    }).sort({ createdAt: -1 });
    if (latestFeedback && latestFeedback._id.toString() === event._id.toString()) {
      submission.comments = nextComment;
      await submission.save();
    }
  }

  await logEvent(
    submission._id.toString(),
    user.id,
    'feedback_updated',
    submission.status,
    submission.status,
    `Updated feedback by ${user.fullName}`,
  );

  return res.json({ data: await toEventDto(event) });
});

router.post('/:id/feedback', async (req: AuthRequest, res) => {
  const user = req.user!;
  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    return res.status(400).json({ error: 'Feedback text is required' });
  }
  if (!canEditFeedback(user.role)) {
    return res.status(403).json({ error: 'Your role cannot add review feedback' });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  if (user.companyId && submission.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const nextComment = comment.trim();
  submission.comments = nextComment;
  submission.reviewedBy = new Types.ObjectId(user.id);
  await submission.save();

  const event = await WorkflowEvent.create({
    submissionId: submission._id,
    actorId: user.id,
    action: 'feedback',
    fromStatus: submission.status,
    toStatus: submission.status,
    comment: nextComment,
  });

  return res.json({ data: await toEventDto(event) });
});

router.patch('/:id/comments', async (req: AuthRequest, res) => {
  const user = req.user!;
  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  if (!canEditFeedback(user.role)) {
    return res.status(403).json({ error: 'Your role cannot edit review feedback' });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  if (user.companyId && submission.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const nextComment = comment.trim();
  submission.comments = nextComment;
  submission.reviewedBy = new Types.ObjectId(user.id);
  await submission.save();

  // Prefer updating the latest return/feedback event so the timeline stays accurate.
  const latestFeedback = await WorkflowEvent.findOne({
    submissionId: submission._id,
    action: { $in: ['returned', 'feedback'] },
  }).sort({ createdAt: -1 });

  if (latestFeedback) {
    latestFeedback.comment = nextComment;
    await latestFeedback.save();
  } else {
    await WorkflowEvent.create({
      submissionId: submission._id,
      actorId: user.id,
      action: 'feedback',
      fromStatus: submission.status,
      toStatus: submission.status,
      comment: nextComment,
    });
  }

  await logEvent(
    submission._id.toString(),
    user.id,
    'feedback_updated',
    submission.status,
    submission.status,
    `Clarified active feedback by ${user.fullName}`,
  );

  return res.json({ data: await hydrateSubmission(submission._id.toString()) });
});

router.post('/', async (req: AuthRequest, res) => {
  const user = req.user!;
  if (!['company_submitter', 'portfolio_analyst'].includes(user.role)) {
    return res.status(403).json({
      error: 'Only company data submitters or portfolio analysts can create submissions',
    });
  }

  const { companyId, type, title, period, payload } = req.body as Record<string, unknown>;
  const submissionType = type as SubmissionType;

  if (!type || !title) {
    return res.status(400).json({ error: 'Type and title are required' });
  }

  // Business Process 1 — Create a new SOE (ministry analyst initiates)
  if (submissionType === 'soe_creation') {
    if (user.role !== 'portfolio_analyst') {
      return res.status(403).json({ error: 'Only portfolio analysts can initiate SOE creation' });
    }

    const profile = (payload ?? {}) as Record<string, unknown>;
    const code = String(profile.code ?? '').trim().toUpperCase();
    const name = String(profile.name ?? '').trim();
    const sector = String(profile.sector ?? '').trim();

    if (!code || !name || !sector) {
      return res.status(400).json({
        error: 'SOE creation requires company code, name and sector',
      });
    }

    if (await Company.findOne({ code })) {
      return res.status(409).json({ error: 'A company with this code already exists' });
    }

    const company = await Company.create({
      code,
      name,
      sector,
      status: 'pending_registration',
      location: String(profile.location ?? ''),
      province: String(profile.province ?? ''),
      ministry: String(profile.ministry ?? 'MINECOFIN'),
      description: String(profile.description ?? ''),
      investmentAmount: Number(profile.investmentAmount ?? 0),
      ownershipPct: Number(profile.ownershipPct ?? 100),
      ceoName: String(profile.ceoName ?? ''),
      cfoName: String(profile.cfoName ?? ''),
      boardChair: String(profile.boardChair ?? ''),
      establishedDate: String(profile.establishedDate ?? ''),
    });

    const submission = await Submission.create({
      companyId: company._id,
      type: 'soe_creation',
      title: String(title),
      period: '',
      status: 'draft',
      workflowStage: 'ministry',
      payload: {
        ...profile,
        code,
        name,
        sector,
        attachmentsExpected: [
          'business_case',
          'business_plan_or_strategy',
          'registration_certificate',
          'shareholder_agreements',
          'articles_of_association',
        ],
      },
      submittedBy: user.id,
    });

    await logEvent(submission._id.toString(), user.id, 'created', '', 'draft');
    return res.status(201).json({ data: await hydrateSubmission(submission._id.toString()) });
  }

  const targetCompanyId = user.companyId ?? (companyId as string | undefined);
  if (!targetCompanyId) {
    return res.status(400).json({ error: 'Company is required' });
  }
  if (!Types.ObjectId.isValid(targetCompanyId)) {
    return res.status(400).json({ error: 'Invalid company identifier' });
  }

  const company = await Company.findById(targetCompanyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const enriched = enrichPayload(submissionType, (payload as Record<string, unknown>) ?? {});

  const submission = await Submission.create({
    companyId: company._id,
    type: submissionType,
    title: String(title),
    period: period ?? '',
    status: 'draft',
    workflowStage: 'company',
    payload: enriched,
    submittedBy: user.id,
  });

  await logEvent(submission._id.toString(), user.id, 'created', '', 'draft');
  return res.status(201).json({ data: await hydrateSubmission(submission._id.toString()) });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const user = req.user!;
  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (user.companyId && submission.companyId.toString() !== user.companyId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!['draft', 'returned'].includes(submission.status)) {
    return res.status(400).json({ error: 'Only draft or returned submissions can be edited' });
  }

  if (!['company_submitter', 'portfolio_analyst'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions to edit' });
  }

  const { title, period, payload } = req.body as Record<string, unknown>;
  if (title !== undefined) submission.title = String(title);
  if (period !== undefined) submission.period = String(period);
  if (payload !== undefined) {
    submission.payload = enrichPayload(
      submission.type,
      payload as Record<string, unknown>,
    );
  }
  await submission.save();

  await logEvent(submission._id.toString(), user.id, 'updated', submission.status, submission.status);
  return res.json({ data: await hydrateSubmission(submission._id.toString()) });
});

router.post('/:id/submit', async (req: AuthRequest, res) => {
  const user = req.user!;
  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const status = submission.status;
  if (!canAct(user.role, status, submission.type)) {
    return res.status(403).json({ error: 'You cannot submit at this stage' });
  }

  const next = nextOnSubmit(status, submission.type, user.role);
  if (!next) {
    return res.status(400).json({ error: 'Submission cannot be submitted in its current status' });
  }

  submission.status = next.status;
  submission.workflowStage = next.stage;
  submission.submittedBy = new Types.ObjectId(user.id);
  submission.comments = '';
  await submission.save();

  await logEvent(submission._id.toString(), user.id, 'submitted', status, next.status);
  return res.json({ data: await hydrateSubmission(submission._id.toString()) });
});

router.post('/:id/approve', async (req: AuthRequest, res) => {
  const user = req.user!;
  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const status = submission.status;
  const next = nextOnApprove(user.role, status);
  if (!next) {
    return res.status(403).json({ error: 'You cannot approve at this stage' });
  }

  submission.status = next.status;
  submission.workflowStage = next.stage;
  submission.reviewedBy = new Types.ObjectId(user.id);
  submission.comments = '';
  await submission.save();

  if (next.status === 'approved') {
    await applyApprovedEffects(submission);
  }

  await logEvent(submission._id.toString(), user.id, 'approved', status, next.status);
  return res.json({ data: await hydrateSubmission(submission._id.toString()) });
});

router.post('/:id/return', async (req: AuthRequest, res) => {
  const user = req.user!;
  const { comment } = req.body as { comment?: string };
  if (!comment?.trim()) {
    return res.status(400).json({ error: 'A comment is required when returning a submission' });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const status = submission.status;
  const allowed: SubmissionStatus[] = [
    'pending_company_approval',
    'pending_ministry_review',
    'pending_department_approval',
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Submission cannot be returned in its current status' });
  }

  if (!canAct(user.role, status, submission.type)) {
    return res.status(403).json({ error: 'You cannot return at this stage' });
  }

  submission.status = 'returned';
  submission.workflowStage = submission.type === 'soe_creation' ? 'ministry' : 'company';
  submission.reviewedBy = new Types.ObjectId(user.id);
  submission.comments = comment.trim();
  await submission.save();

  await logEvent(submission._id.toString(), user.id, 'returned', status, 'returned', comment.trim());
  return res.json({ data: await hydrateSubmission(submission._id.toString()) });
});

export default router;
