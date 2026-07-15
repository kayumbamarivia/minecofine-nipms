import { useCallback, useEffect, useState } from 'react';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { PipelineCard } from './components/PipelineCard';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { Dashboard } from './components/Dashboard';
import { ProcessWorkspace } from './components/ProcessWorkspace';
import { SubmissionsPanel } from './components/SubmissionsPanel';
import { ActionPointsPanel } from './components/ActionPointsPanel';
import { DocumentRegistry } from './components/DocumentRegistry';
import { ReportsCentre } from './components/ReportsCentre';
import { UserAdminPanel } from './components/UserAdminPanel';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Login } from './components/Login';
import { AppShell } from './components/layout/AppShell';
import { PageHeader } from './components/layout/PageHeader';
import { Toaster, toast } from 'sonner';
import { clearToken, getToken } from '../utils/api';
import { authApi, companiesApi, dashboardApi, submissionsApi } from '../utils/services';
import {
  approvalLevelFor,
  canViewLeadershipDashboards,
  companyToPipelineItem,
  greetingFor,
  isMinistryRole,
} from '../utils/roles';
import type {
  AppView,
  AuthUser,
  Company,
  DashboardSummary,
  PipelineItem,
  Submission,
} from '../types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | PipelineItem['status']>('all');
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<PipelineItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadApiData = useCallback(async () => {
    const [companiesRes, submissionsRes, summaryRes] = await Promise.all([
      companiesApi.list(),
      submissionsApi.list(),
      dashboardApi.summary(),
    ]);

    setCompanies(companiesRes.data);
    setPipeline(companiesRes.data.map(companyToPipelineItem));
    setSubmissions(submissionsRes.data);
    setSummary(summaryRes.data);
  }, []);

  useEffect(() => {
    const boot = async () => {
      if (!getToken()) {
        setBooting(false);
        return;
      }
      try {
        const { user: me } = await authApi.me();
        setUser(me);
        await loadApiData();
      } catch {
        clearToken();
      } finally {
        setBooting(false);
      }
    };
    void boot();
  }, [loadApiData]);

  const handleLogin = async (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    setCurrentView('dashboard');
    toast.success(`Welcome — ${greetingFor(loggedInUser)}`);
    await loadApiData();
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setCurrentView('dashboard');
  };

  const filteredPipeline = pipeline.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.companyName.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q) ||
      (item.ministry?.toLowerCase().includes(q) ?? false);
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading NIPMS…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const companyOptions = companies.map((c) => ({ id: c.id, name: c.name, code: c.code }));

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      user={user}
      onLogout={handleLogout}
      onChangePassword={() => setShowChangePassword(true)}
    >
      {currentView === 'dashboard' && <Dashboard summary={summary} user={user} />}
      {currentView === 'processes' && (
        <ProcessWorkspace user={user} companies={companyOptions} onCreated={loadApiData} />
      )}
      {currentView === 'submissions' && (
        <SubmissionsPanel user={user} submissions={submissions} onRefresh={loadApiData} />
      )}
      {currentView === 'action-points' && (
        <ActionPointsPanel user={user} companies={companyOptions} />
      )}
      {currentView === 'documents' && (
        <DocumentRegistry user={user} companies={companyOptions} />
      )}
      {currentView === 'reports' && (
        <ReportsCentre user={user} companies={companyOptions} />
      )}
      {currentView === 'users' && isMinistryRole(user.role) && (
        <UserAdminPanel user={user} companies={companyOptions} />
      )}
      {currentView === 'portfolio' && (
        <div className="space-y-6">
          <PageHeader
            badge="Portfolio"
            title="Investment Portfolio"
            description="State-owned enterprise registry — search, filter, and inspect portfolio entities."
          />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by entity, sector, or ministry..."
                className="border-slate-200"
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPipeline.map((item) => (
              <PipelineCard
                key={item.id}
                item={item}
                currentUserLevel={approvalLevelFor(user.role)}
                onViewDetails={(company) => {
                  setSelectedCompany(company);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
          {filteredPipeline.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              No investments match your search and filters.
            </div>
          )}
        </div>
      )}
      {currentView === 'consolidated' && canViewLeadershipDashboards(user.role) && (
        <Dashboard summary={summary} user={user} />
      )}
      {currentView === 'operations' && canViewLeadershipDashboards(user.role) && (
        <div className="rounded-xl border border-slate-200 bg-white p-10">
          <PageHeader
            badge="Operations"
            title="Operational Performance"
            description="Operational KPIs from approved quarterly reports will consolidate here by sector."
          />
        </div>
      )}
      {currentView === 'executive' && canViewLeadershipDashboards(user.role) && (
        <Dashboard summary={summary} user={user} />
      )}
      {currentView === 'inter-ministerial' && canViewLeadershipDashboards(user.role) && (
        <div className="rounded-xl border border-slate-200 bg-white p-10">
          <PageHeader
            badge="Cross-Government"
            title="Inter-Ministerial Coordination"
            description="Partner ministry workflows will be managed here as line ministries connect to portfolio collaboration."
          />
        </div>
      )}

      <CompanyDetailsModal
        company={selectedCompany}
        documents={[]}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      {(user.mustChangePassword || showChangePassword) && (
        <ChangePasswordModal
          user={user}
          forced={Boolean(user.mustChangePassword)}
          onUpdated={(updated) => {
            setUser(updated);
            setShowChangePassword(false);
          }}
          onClose={user.mustChangePassword ? undefined : () => setShowChangePassword(false)}
        />
      )}
      <Toaster position="top-right" richColors />
    </AppShell>
  );
}
