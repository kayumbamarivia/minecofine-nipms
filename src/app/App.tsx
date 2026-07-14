import { useEffect, useState } from 'react';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { PipelineCard } from './components/PipelineCard';
import { ActivityList } from './components/ActivityList';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { Dashboard } from './components/Dashboard';
import { CompanyDataEntry } from './components/CompanyDataEntry';
import { ConsolidatedView } from './components/ConsolidatedView';
import { OperationalDashboard } from './components/OperationalDashboard';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { DocumentTracker } from './components/DocumentTracker';
import { InterMinisterialPanel } from './components/InterMinisterialPanel';
import { Login } from './components/Login';
import { AppShell } from './components/layout/AppShell';
import { PageHeader } from './components/layout/PageHeader';
import { Toaster, toast } from 'sonner';
import { localStorageAPI } from '../utils/localStorage';
import { RWANDA_PORTFOLIO, RWANDA_ACTIVITIES, RWANDA_DOCUMENTS } from '../data/mockData';
import type { Activity, AppView, Document, PipelineItem, UserRole } from '../types';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | PipelineItem['status']>('all');
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<PipelineItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pipelineRes, activitiesRes, documentsRes] = await Promise.all([
        localStorageAPI.getPipeline(),
        localStorageAPI.getActivities(),
        localStorageAPI.getDocuments(),
      ]);

      const pipelineData = pipelineRes.data ?? [];
      const activitiesData = activitiesRes.data ?? [];
      const documentsData = documentsRes.data ?? [];

      if (pipelineData.length === 0 && activitiesData.length === 0 && documentsData.length === 0) {
        await localStorageAPI.initialize({
          pipeline: RWANDA_PORTFOLIO,
          activities: RWANDA_ACTIVITIES,
          documents: RWANDA_DOCUMENTS,
        });
        setPipeline(RWANDA_PORTFOLIO);
        setActivities(RWANDA_ACTIVITIES);
        setDocuments(RWANDA_DOCUMENTS);
        toast.success('Portfolio data initialized');
      } else {
        setPipeline(pipelineData);
        setActivities(activitiesData);
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load portfolio data');
      setPipeline(RWANDA_PORTFOLIO);
      setActivities(RWANDA_ACTIVITIES);
      setDocuments(RWANDA_DOCUMENTS);
    }
  };

  const handleLogin = (role: UserRole) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setCurrentView('dashboard');
    toast.success(`Welcome — signed in as ${role === 'admin' ? 'MINECOFIN Portfolio Director' : 'SOE Representative'}`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('dashboard');
  };

  const handleToggleComplete = async (id: string) => {
    const activity = activities.find((item) => item.id === id);
    if (!activity) return;

    const updated: Activity = {
      ...activity,
      status: activity.status === 'completed' ? 'pending' : 'completed',
      completedDate: activity.status === 'completed' ? undefined : new Date().toISOString().split('T')[0],
    };
    await localStorageAPI.updateActivity(id, updated);
    setActivities((prev) => prev.map((item) => (item.id === id ? updated : item)));
    toast.success(activity.status === 'completed' ? 'Activity reopened' : 'Activity completed');
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

  const getCompanyDocuments = (companyName: string) =>
    documents.filter((doc) => doc.relatedDeal === companyName);

  if (!isLoggedIn) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <AppShell currentView={currentView} onNavigate={setCurrentView} userRole={userRole} onLogout={handleLogout}>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'data-entry' && <CompanyDataEntry userRole={userRole} />}
      {currentView === 'portfolio' && (
        <div className="space-y-6">
          <PageHeader
            badge="Portfolio"
            title="Investment Portfolio"
            description="Search, filter, and inspect state-owned enterprise investments across the Government of Rwanda portfolio."
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
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="hod_approval">HoD Approval</SelectItem>
                  <SelectItem value="ministerial_approval">Ministerial Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredPipeline.map((item) => (
              <PipelineCard
                key={item.id}
                item={item}
                currentUserLevel={userRole === 'admin' ? 'minister' : 'analyst'}
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
      {currentView === 'activities' && (
        <ActivityList
          activities={activities}
          onToggleComplete={handleToggleComplete}
          onViewActivity={(activity) => toast.info(`Viewing: ${activity.title}`)}
        />
      )}
      {currentView === 'documents' && (
        <DocumentTracker
          documents={documents}
          onViewDocument={(doc) => toast.info(`Opening: ${doc.name}`)}
          onUploadVersion={(doc) => toast.info(`Upload new version: ${doc.name}`)}
        />
      )}
      {currentView === 'consolidated' && userRole === 'admin' && <ConsolidatedView />}
      {currentView === 'operations' && userRole === 'admin' && <OperationalDashboard />}
      {currentView === 'executive' && userRole === 'admin' && <ExecutiveDashboard />}
      {currentView === 'inter-ministerial' && userRole === 'admin' && <InterMinisterialPanel />}

      <CompanyDetailsModal
        company={selectedCompany}
        documents={selectedCompany ? getCompanyDocuments(selectedCompany.companyName) : []}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <Toaster position="top-right" richColors />
    </AppShell>
  );
}
