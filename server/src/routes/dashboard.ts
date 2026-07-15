import { Router } from 'express';
import { Company } from '../models/Company.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { toSubmissionDto } from '../serializers.js';

const router = Router();
router.use(authMiddleware);

router.get('/summary', async (req: AuthRequest, res) => {
  const user = req.user!;
  const companyFilter = user.companyId ? { _id: user.companyId } : {};
  const submissionFilter = user.companyId ? { companyId: user.companyId } : {};

  const [companies, submissions] = await Promise.all([
    Company.find(companyFilter),
    Submission.find(submissionFilter).sort({ updatedAt: -1 }),
  ]);

  const pendingStatuses = [
    'pending_company_approval',
    'pending_ministry_review',
    'pending_department_approval',
    'returned',
  ];

  const submissionsByStatus: Record<string, number> = {};
  for (const s of submissions) {
    submissionsByStatus[s.status] = (submissionsByStatus[s.status] ?? 0) + 1;
  }

  const portfolioValue = companies.reduce((sum, c) => sum + (c.investmentAmount ?? 0), 0);

  const recent = submissions.slice(0, 5);
  const companyIds = [...new Set(recent.map((r) => r.companyId.toString()))];
  const userIds = [...new Set(recent.map((r) => r.submittedBy?.toString()).filter(Boolean))] as string[];
  const [companyDocs, userDocs] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select('name code'),
    User.find({ _id: { $in: userIds } }).select('fullName'),
  ]);
  const companyMap = new Map(companyDocs.map((c) => [c._id.toString(), c]));
  const userMap = new Map(userDocs.map((u) => [u._id.toString(), u]));

  const sectorAllocation = Object.entries(
    companies.reduce<Record<string, number>>((acc, c) => {
      acc[c.sector] = (acc[c.sector] ?? 0) + (c.investmentAmount ?? 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return res.json({
    data: {
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c) => c.status === 'active').length,
      pendingSubmissions: submissions.filter((s) => pendingStatuses.includes(s.status)).length,
      approvedThisQuarter: submissions.filter((s) => s.status === 'approved').length,
      portfolioValue,
      submissionsByStatus,
      sectorAllocation,
      companies: companies.map((c) => ({
        id: c._id.toString(),
        code: c.code,
        name: c.name,
        sector: c.sector,
        investmentAmount: c.investmentAmount ?? 0,
        status: c.status,
      })),
      recentSubmissions: recent.map((row) => {
        const company = companyMap.get(row.companyId.toString());
        const submitter = row.submittedBy ? userMap.get(row.submittedBy.toString()) : null;
        return toSubmissionDto({
          ...row.toObject(),
          companyName: company?.name ?? '',
          companyCode: company?.code ?? '',
          submittedByName: submitter?.fullName ?? null,
        });
      }),
    },
  });
});

export default router;
