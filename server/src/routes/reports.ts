import { Router } from 'express';
import { Types } from 'mongoose';
import { Company } from '../models/Company.js';
import { Submission } from '../models/Submission.js';
import { authMiddleware, requireRoles, type AuthRequest } from '../middleware/auth.js';
import { computeFinancialRatios } from '../utils/ratios.js';

const router = Router();
router.use(authMiddleware);

/**
 * Business Process 9 — Ad hoc reporting
 * Builds financial / operational / governance summaries from approved submissions.
 */
router.get(
  '/company/:companyId',
  requireRoles('portfolio_analyst', 'department_head', 'leadership', 'company_approver', 'company_submitter'),
  async (req: AuthRequest, res) => {
    const { companyId } = req.params;
    if (!Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: 'Invalid company identifier' });
    }

    if (req.user!.companyId && req.user!.companyId !== companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const approved = await Submission.find({
      companyId,
      status: 'approved',
      type: { $in: ['quarterly_report', 'annual_report'] },
    }).sort({ period: 1, updatedAt: 1 });

    const periods = approved.map((s) => {
      const payload = s.payload as Record<string, unknown>;
      const statements = (payload.financialStatements as Record<string, number>) ?? {};
      const ratios =
        (payload.ratios as Record<string, unknown>) ?? computeFinancialRatios(statements);
      return {
        submissionId: s._id.toString(),
        type: s.type,
        title: s.title,
        period: s.period,
        updatedAt: s.updatedAt.toISOString(),
        financialSummary: {
          revenue: Number(statements.revenue ?? 0),
          ebitda: Number((ratios as { ebitda?: number }).ebitda ?? 0),
          netIncome: Number((ratios as { netIncome?: number }).netIncome ?? 0),
          totalAssets: Number((ratios as { totalAssets?: number }).totalAssets ?? 0),
          equity: Number(statements.equity ?? 0),
        },
        ratios,
        operationalMetrics: payload.operationalMetrics ?? {},
        governanceMetrics: payload.governanceMetrics ?? {},
        redFlags: (ratios as { redFlags?: string[] }).redFlags ?? [],
      };
    });

    const latest = periods[periods.length - 1] ?? null;

    const format = String(req.query.format ?? 'json');
    if (format === 'csv') {
      const header = [
        'period',
        'type',
        'revenue',
        'ebitda',
        'netIncome',
        'totalAssets',
        'equity',
        'grossMarginPct',
        'currentRatio',
        'debtToEquity',
        'returnOnEquityPct',
      ];
      const lines = [header.join(',')];
      for (const p of periods) {
        const r = p.ratios as Record<string, unknown>;
        lines.push(
          [
            p.period,
            p.type,
            p.financialSummary.revenue,
            p.financialSummary.ebitda,
            p.financialSummary.netIncome,
            p.financialSummary.totalAssets,
            p.financialSummary.equity,
            r.grossMarginPct ?? '',
            r.currentRatio ?? '',
            r.debtToEquity ?? '',
            r.returnOnEquityPct ?? '',
          ].join(','),
        );
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${company.code}-financial-summary.csv"`,
      );
      return res.send(lines.join('\n'));
    }

    return res.json({
      data: {
        company: {
          id: company._id.toString(),
          code: company.code,
          name: company.name,
          sector: company.sector,
          status: company.status,
        },
        reportCount: periods.length,
        latest,
        periods,
        generatedAt: new Date().toISOString(),
      },
    });
  },
);

router.get(
  '/portfolio-summary',
  requireRoles('portfolio_analyst', 'department_head', 'leadership'),
  async (_req: AuthRequest, res) => {
    const companies = await Company.find({ status: 'active' }).sort({ name: 1 });
    const approved = await Submission.find({
      status: 'approved',
      type: { $in: ['quarterly_report', 'annual_report'] },
    });

    const byCompany = new Map<string, typeof approved>();
    for (const s of approved) {
      const key = s.companyId.toString();
      const list = byCompany.get(key) ?? [];
      list.push(s);
      byCompany.set(key, list);
    }

    const rows = companies.map((c) => {
      const list = byCompany.get(c._id.toString()) ?? [];
      const latest = list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
      const statements =
        ((latest?.payload as Record<string, unknown>)?.financialStatements as Record<
          string,
          number
        >) ?? {};
      const ratios =
        ((latest?.payload as Record<string, unknown>)?.ratios as Record<string, unknown>) ??
        computeFinancialRatios(statements);

      return {
        companyId: c._id.toString(),
        code: c.code,
        name: c.name,
        sector: c.sector,
        investmentAmount: c.investmentAmount,
        approvedReports: list.length,
        latestPeriod: latest?.period ?? null,
        latestRevenue: Number(statements.revenue ?? 0),
        latestNetIncome: Number((ratios as { netIncome?: number }).netIncome ?? 0),
        latestCurrentRatio: (ratios as { currentRatio?: number }).currentRatio ?? null,
        redFlags: (ratios as { redFlags?: string[] }).redFlags ?? [],
      };
    });

    const format = String((_req.query as { format?: string }).format ?? 'json');
    if (format === 'csv') {
      const header = [
        'code',
        'name',
        'sector',
        'investmentAmount',
        'approvedReports',
        'latestPeriod',
        'latestRevenue',
        'latestNetIncome',
        'latestCurrentRatio',
      ];
      const lines = [header.join(',')];
      for (const r of rows) {
        lines.push(
          [
            r.code,
            `"${r.name.replaceAll('"', '""')}"`,
            `"${r.sector.replaceAll('"', '""')}"`,
            r.investmentAmount,
            r.approvedReports,
            r.latestPeriod ?? '',
            r.latestRevenue,
            r.latestNetIncome,
            r.latestCurrentRatio ?? '',
          ].join(','),
        );
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="portfolio-summary.csv"');
      return res.send(lines.join('\n'));
    }

    return res.json({
      data: {
        generatedAt: new Date().toISOString(),
        companyCount: rows.length,
        rows,
      },
    });
  },
);

export default router;
