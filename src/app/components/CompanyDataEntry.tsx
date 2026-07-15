import { useState } from 'react';
import { Check, FileText, Target, TrendingUp, Users, Save } from 'lucide-react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody } from './layout/PageHeader';
import type { AuthUser } from '../../types';
import { isMinistryRole } from '../../utils/roles';

interface CompanyDataEntryProps {
  user: AuthUser;
  companies: string[];
}

export function CompanyDataEntry({ user, companies }: CompanyDataEntryProps) {
  const companyOptions = companies.length > 0 ? companies : [user.companyName ?? 'Your company'];
  const [selectedCompany, setSelectedCompany] = useState(companyOptions[0]);
  const [activeTab, setActiveTab] = useState<'financial' | 'kpi' | 'strategy' | 'governance'>('financial');
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    period: 'Q2 2026',
    currency: 'RWF (Frw)',
    revenue: '28500000000',
    cogs: '14200000000',
    grossProfit: '14300000000',
    operatingExpenses: '6800000000',
    ebitda: '7500000000',
    interestExpense: '1200000000',
    taxExpense: '980000000',
    netIncome: '5320000000',
  });

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { value: 'financial' as const, label: 'Financial Statements', icon: FileText },
    { value: 'kpi' as const, label: 'KPI & Targets', icon: Target },
    { value: 'strategy' as const, label: 'Strategy', icon: TrendingUp },
    { value: 'governance' as const, label: 'Governance', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Data Management"
        title="SOE Data Entry"
        description="Submit and manage financial statements, KPIs, strategic plans, and governance records for state-owned enterprise portfolio entities."
        actions={
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        }
      />

      {isMinistryRole(user.role) && (
        <Panel>
          <PanelBody>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Select Entity</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
            >
              {companyOptions.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.value
                  ? 'bg-rw-blue text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <PanelBody>
          {activeTab === 'financial' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Reporting Period" value={formData.period} onChange={(v) => updateField('period', v)} type="select" options={['Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025']} />
                <FormField label="Currency" value={formData.currency} onChange={(v) => updateField('currency', v)} type="select" options={['RWF (Frw)', 'USD ($)', 'EUR (€)']} />
              </div>
              <FormField label="Revenue (RWF)" value={formData.revenue} onChange={(v) => updateField('revenue', v)} />
              <FormField label="Cost of Goods Sold (COGS)" value={formData.cogs} onChange={(v) => updateField('cogs', v)} />
              <FormField label="Gross Profit" value={formData.grossProfit} onChange={(v) => updateField('grossProfit', v)} />
              <FormField label="Operating Expenses" value={formData.operatingExpenses} onChange={(v) => updateField('operatingExpenses', v)} />
              <FormField label="EBITDA" value={formData.ebitda} onChange={(v) => updateField('ebitda', v)} />
              <FormField label="Interest Expense" value={formData.interestExpense} onChange={(v) => updateField('interestExpense', v)} />
              <FormField label="Tax Expense" value={formData.taxExpense} onChange={(v) => updateField('taxExpense', v)} />
              <FormField label="Net Income" value={formData.netIncome} onChange={(v) => updateField('netIncome', v)} />
            </div>
          )}

          {activeTab === 'kpi' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Revenue Target Achievement', value: '92%' },
                { label: 'Service Delivery Index', value: '88/100' },
                { label: 'Operational Efficiency', value: '94%' },
                { label: 'Governance Compliance', value: '96%' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold text-rw-blue">{kpi.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Strategic priorities for {selectedCompany} aligned with Vision 2050 and National Strategy for Transformation (NST2).
              </p>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
                rows={8}
                defaultValue="Expand service coverage to underserved districts, modernise infrastructure through public-private partnerships, strengthen board governance per SOE reform guidelines, and improve ESG performance reporting to MINECOFIN."
              />
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-3">
              {[
                { text: 'Board charter revised — pending ministerial approval', status: 'In Review' },
                { text: 'Compliance score: 96% (Rwanda SOE Governance Framework)', status: 'Compliant' },
                { text: 'Risk assessment updated by internal audit — Q2 2026', status: 'Current' },
                { text: 'Annual General Meeting scheduled for August 2026', status: 'Upcoming' },
              ].map((item) => (
                <div key={item.text} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">{item.text}</p>
                  <span className="rounded-full bg-rw-blue/10 px-2.5 py-0.5 text-[10px] font-semibold text-rw-blue">{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>

      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-lg bg-rw-green px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check className="h-5 w-5" />
          Data saved successfully
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'select';
  options?: string[];
}) {
  const inputClass =
    'mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-rw-blue focus:bg-white focus:ring-2 focus:ring-rw-blue/20';

  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
      {label}
      {type === 'select' && options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </label>
  );
}
