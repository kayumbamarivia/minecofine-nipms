import { useEffect, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { EmptyState } from './ui/empty-state';
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

const selectClass =
  'w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20';

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
              <DownloadSimple className="h-4 w-4" /> Export portfolio CSV
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
              <DownloadSimple className="h-3.5 w-3.5" /> CSV
            </Button>
          }
        />
        <PanelBody className="space-y-4">
          {!user.companyId && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className={selectClass}
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
            <EmptyState
              compact
              title="No approved reports yet"
              description="Approved quarterly or annual reports for this entity will appear in this summary."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="nipms-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Type</th>
                    <th className="text-right">Revenue</th>
                    <th className="text-right">EBITDA</th>
                    <th className="text-right">Net income</th>
                    <th className="text-right">Current ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => {
                    const fs = p.financialSummary as Record<string, number>;
                    const ratios = p.ratios as Record<string, number>;
                    return (
                      <tr key={String(p.submissionId)}>
                        <td className="font-medium text-slate-900">{String(p.period)}</td>
                        <td className="capitalize">{String(p.type).replaceAll('_', ' ')}</td>
                        <td className="text-right">{formatRwf(fs.revenue ?? 0, true)}</td>
                        <td className="text-right">{formatRwf(fs.ebitda ?? 0, true)}</td>
                        <td className="text-right">{formatRwf(fs.netIncome ?? 0, true)}</td>
                        <td className="text-right">{ratios.currentRatio ?? '—'}</td>
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
            <table className="nipms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Entity</th>
                  <th>Latest period</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Net income</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {portfolioRows.map((row) => (
                  <tr key={String(row.companyId)}>
                    <td className="font-medium text-rw-blue">{String(row.code)}</td>
                    <td>{String(row.name)}</td>
                    <td>{String(row.latestPeriod ?? '—')}</td>
                    <td className="text-right">
                      {formatRwf(Number(row.latestRevenue ?? 0), true)}
                    </td>
                    <td className="text-right">
                      {formatRwf(Number(row.latestNetIncome ?? 0), true)}
                    </td>
                    <td className="text-xs text-red-700">
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
