import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { FileText, Download, Upload, Eye, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Document, DocumentStatus, DocumentType } from '../../types';
import { PageHeader } from './layout/PageHeader';

export type { Document, DocumentStatus, DocumentType } from '../../types';

interface DocumentTrackerProps {
  documents: Document[];
  onViewDocument: (doc: Document) => void;
  onUploadVersion: (doc: Document) => void;
}

const statusConfig = {
  not_started: { color: 'bg-slate-500', label: 'Not Started', icon: Clock },
  in_progress: { color: 'bg-rw-blue', label: 'In Progress', icon: FileText },
  review: { color: 'bg-amber-500', label: 'Under Review', icon: AlertCircle },
  completed: { color: 'bg-rw-green', label: 'Completed', icon: CheckCircle2 },
};

const documentTypeLabels: Record<DocumentType, string> = {
  strategic_plan: 'Strategic Plan',
  board_charter: 'Board Charter',
  investment_memo: 'Investment Memo',
  valuation: 'Valuation Report',
  due_diligence: 'Due Diligence Report',
  term_sheet: 'Term Sheet',
};

export function DocumentTracker({ documents, onViewDocument, onUploadVersion }: DocumentTrackerProps) {
  const inProgress = documents.filter((d) => d.status === 'in_progress' || d.status === 'review').length;
  const completed = documents.filter((d) => d.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Document Registry"
        title="Investment Document Registry"
        description="Centralised repository for strategic plans, board charters, investment memos, valuations, and due diligence reports across all portfolio entities."
      />

      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="text-slate-500">Total Documents: </span>
          <span className="font-semibold">{documents.length}</span>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
          <span className="text-blue-700">In Progress: </span>
          <span className="font-semibold text-blue-900">{inProgress}</span>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm">
          <span className="text-green-700">Completed: </span>
          <span className="font-semibold text-green-900">{completed}</span>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">No documents registered.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map((doc) => {
            const statusInfo = statusConfig[doc.status];
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={doc.id} className="transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rw-blue/10">
                        <FileText className="h-5 w-5 text-rw-blue" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900">{doc.name}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{documentTypeLabels[doc.type]}</p>
                      </div>
                    </div>
                    <Badge className={`${statusInfo.color} gap-1 text-[10px] text-white`}>
                      <StatusIcon className="h-3 w-3" /> {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-semibold text-slate-700">{doc.progress}%</span>
                    </div>
                    <Progress value={doc.progress} className="h-1.5" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Related Entity</p>
                      <p className="mt-0.5 font-medium text-slate-700">{doc.relatedDeal}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Assigned To</p>
                      <p className="mt-0.5 font-medium text-slate-700">{doc.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Due Date</p>
                      <p className="mt-0.5 font-medium text-slate-700">{doc.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Version</p>
                      <p className="mt-0.5 font-medium text-slate-700">{doc.version}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => onViewDocument(doc)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => onUploadVersion(doc)}>
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
