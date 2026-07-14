import { Building2, Calendar, CheckCircle2, DollarSign, FileText, TrendingUp, AlertCircle, Upload, Eye } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { Document, PipelineItem } from '../../types';
import { formatRwf } from '../../utils/format';

interface CompanyDetailsModalProps {
  company: PipelineItem | null;
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  not_started: { color: 'bg-slate-400', label: 'Not Started', icon: Calendar },
  in_progress: { color: 'bg-rw-blue', label: 'In Progress', icon: FileText },
  review: { color: 'bg-amber-500', label: 'Under Review', icon: AlertCircle },
  completed: { color: 'bg-rw-green', label: 'Completed', icon: CheckCircle2 },
};

export function CompanyDetailsModal({ company, documents, isOpen, onClose }: CompanyDetailsModalProps) {
  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rw-blue/10">
              <Building2 className="h-5 w-5 text-rw-blue" />
            </div>
            <div>
              <p className="text-base">{company.companyName}</p>
              <p className="text-xs font-normal text-slate-500">{company.sector} — {company.ministry}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Investment</p>
                <p className="mt-1 text-lg font-bold text-rw-blue">{formatRwf(company.investmentAmount, true)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Ownership</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{company.ownership || 0}%</p>
              </div>
            </div>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
                {[
                  ['Sector', company.sector],
                  ['Type', company.investmentType.replace(/_/g, ' ')],
                  ['Stage', company.stage],
                  ['Status', company.status.replace(/_/g, ' ')],
                  ['Manager', company.projectManager],
                  ['Approval', company.approvalLevel === 'hod' ? 'HoD' : company.approvalLevel],
                  ['Province', company.province || '—'],
                  ['Ministry', company.ministry || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-0.5 text-sm font-medium capitalize text-slate-900">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{documents.length} document(s)</p>
              <Button variant="outline" size="sm" className="gap-1"><Upload className="h-3.5 w-3.5" /> Upload</Button>
            </div>
            {documents.map((doc) => {
              const statusInfo = statusConfig[doc.status];
              const StatusIcon = statusInfo.icon;
              return (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{doc.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{doc.type.replace(/_/g, ' ')}</p>
                      </div>
                      <Badge className={`${statusInfo.color} gap-1 text-[10px] text-white`}>
                        <StatusIcon className="h-3 w-3" /> {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span className="font-semibold">{doc.progress}%</span>
                      </div>
                      <Progress value={doc.progress} className="mt-1 h-1.5" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {documents.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No documents for this entity.</p>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Next Activity</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{company.nextActivity}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" /> {company.nextActivityDate}
              </div>
            </div>
            {company.approvedBy && (
              <div className="rounded-lg border border-rw-green/20 bg-rw-green/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rw-green">Approved By</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{company.approvedBy}</p>
              </div>
            )}
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rw-blue" />
                <p className="text-sm font-medium">Investment pipeline tracking active</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Full audit trail and approval history will be available once the backend is connected.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
