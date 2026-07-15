import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody, PanelHeader } from './layout/PageHeader';
import { reportsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import { formatRwf } from '../../utils/format';
import type { AuthUser } from '../../types';
import { toast } from 'sonner';

interface ReportsCentreProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
}

export function ReportsCentre({ user, companies }: ReportsCentreProps) {
  const [companyId, setCompanyId] = useState(user.companyId ?? companies[0]?.id ?? '');
  const [companyReport, setCompanyReport] = useState<Record<string, unknown> | null>(null);
  const [portfolio, setPortfolio] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!companyId) return;
    void reportsApi
      .companySummary(companyId)
      .then((res) => setCompanyReport(res.data))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Report failed'));
  }, [companyId]);

  useEffect(() => {
    if (user.companyId) return;
    void reportsApi
      .portfolioSummary()
      .then((res) => setPortfolio(res.data))
      .catch(() => undefined);
  }, [user.companyId]);

  const downloadCsv = async (url: string, filename: string) => {
    try {
      const token = getToken();
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const periods = (companyReport?.periods as Array<Record<string, unknown>>) ?? [];
  const company = companyReport?.company as { code?: string; name?: string; sector?: string } | undefined;
  const portfolioRows = (portfolio?.rows as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Business Process 9"
        title="Reports & Extracts"
        description="Generate financial, operational and governance summaries from approved quarterly and annual submissions."
        actions={
          !user.companyId ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                void downloadCsv(reportsApi.portfolioCsvUrl(), 'portfolio-summary.csv')
              }
            >
              <Download className="h-4 w-4" /> Export portfolio CSV
            </Button>
          ) : undefined
        }
      />

      <Panel>
        <PanelHeader
          title="Company financial performance summary"
          description="Compiled from approved quarterly and annual reports"
          actions={
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!companyId}
              onClick={() =>
                void downloadCsv(
                  reportsApi.companyCsvUrl(companyId),
                  `${company?.code ?? 'company'}-financial-summary.csv`,
                )
              }
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          }
        />
        <PanelBody className="space-y-4">
          {!user.companyId && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          )}

          {company && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{company.name}</span> · {company.sector} ·{' '}
              {String(companyReport?.reportCount ?? 0)} approved report(s)
            </p>
          )}

          {periods.length === 0 ? (
            <p className="text-sm text-slate-500">
              No approved quarterly or annual reports available for this entity yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3 text-right">Revenue</th>
                    <th className="py-2 pr-3 text-right">EBITDA</th>
                    <th className="py-2 pr-3 text-right">Net income</th>
                    <th className="py-2 text-right">Current ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periods.map((p) => {
                    const fs = p.financialSummary as Record<string, number>;
                    const ratios = p.ratios as Record<string, number>;
                    return (
                      <tr key={String(p.submissionId)}>
                        <td className="py-2 pr-3 font-medium">{String(p.period)}</td>
                        <td className="py-2 pr-3 capitalize">{String(p.type).replaceAll('_', ' ')}</td>
                        <td className="py-2 pr-3 text-right">{formatRwf(fs.revenue ?? 0, true)}</td>
                        <td className="py-2 pr-3 text-right">{formatRwf(fs.ebitda ?? 0, true)}</td>
                        <td className="py-2 pr-3 text-right">{formatRwf(fs.netIncome ?? 0, true)}</td>
                        <td className="py-2 text-right">{ratios.currentRatio ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      {!user.companyId && portfolioRows.length > 0 && (
        <Panel>
          <PanelHeader
            title="Portfolio snapshot"
            description="Latest approved figures across active SOEs"
          />
          <PanelBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Latest period</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">Net income</th>
                  <th className="px-5 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolioRows.map((row) => (
                  <tr key={String(row.companyId)} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-rw-blue">{String(row.code)}</td>
                    <td className="px-5 py-3">{String(row.name)}</td>
                    <td className="px-5 py-3">{String(row.latestPeriod ?? '—')}</td>
                    <td className="px-5 py-3 text-right">
                      {formatRwf(Number(row.latestRevenue ?? 0), true)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatRwf(Number(row.latestNetIncome ?? 0), true)}
                    </td>
                    <td className="px-5 py-3 text-xs text-red-700">
                      {Array.isArray(row.redFlags) && row.redFlags.length > 0
                        ? `${row.redFlags.length} flag(s)`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
