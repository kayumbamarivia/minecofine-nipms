import { useEffect, useState } from 'react';
import { Building2, Calendar, Download, Eye, FileText, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { documentsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import { formatRwf } from '../../utils/format';
import type { PipelineItem, StoredDocument, StoredDocumentCategory } from '../../types';
import { toast } from 'sonner';

interface CompanyDetailsModalProps {
  company: PipelineItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<StoredDocumentCategory, string> = {
  business_case: 'Business case',
  business_plan: 'Business plan / strategy',
  registration_certificate: 'Registration certificate',
  shareholder_agreement: 'Shareholder agreement',
  articles_of_association: 'Articles of association',
  performance_contract: 'Performance contract',
  budget_action_plan: 'Budget & action plan',
  strategic_plan: 'Strategic plan',
  signed_financial_statements: 'Signed financial statements',
  board_minutes: 'Board minutes',
  investment_memo: 'Investment memo',
  other: 'Other',
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompanyDetailsModal({
  company,
  isOpen,
  onClose,
}: Readonly<CompanyDetailsModalProps>) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<StoredDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !company) {
      setDocuments([]);
      return;
    }

    setLoadingDocs(true);
    void documentsApi
      .list(company.id)
      .then((res) => {
        if (!cancelled) setDocuments(res.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setDocuments([]);
          toast.error(error instanceof Error ? error.message : 'Failed to load documents');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDocs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, company?.id]);

  if (!company) return null;

  const download = async (doc: StoredDocument) => {
    try {
      const token = getToken();
      const response = await fetch(documentsApi.downloadUrl(doc.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rw-blue/10">
                <Building2 className="h-5 w-5 text-rw-blue" />
              </div>
              <div>
                <p className="text-base">{company.companyName}</p>
                <p className="text-xs font-normal text-slate-500">
                  {company.sector} — {company.ministry}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">
                Documents ({loadingDocs ? '…' : documents.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Investment
                  </p>
                  <p className="mt-1 text-lg font-bold text-rw-blue">
                    {formatRwf(company.investmentAmount, true)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Ownership
                  </p>
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
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-medium capitalize text-slate-900">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              <p className="text-xs text-slate-500">
                Files from this company&apos;s Document Registry
                {loadingDocs ? ' — loading…' : ` — ${documents.length} document(s)`}
              </p>
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-rw-blue" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{doc.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {CATEGORY_LABELS[doc.category]} · {doc.originalName} ·{' '}
                        {formatSize(doc.sizeBytes)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Uploaded by {doc.uploadedByName} ·{' '}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => setPreviewDocument(doc)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => void download(doc)}
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!loadingDocs && documents.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No documents in the registry for this entity yet.
                </p>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Next Activity
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{company.nextActivity}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" /> {company.nextActivityDate}
                </div>
              </div>
              {company.approvedBy && (
                <div className="rounded-lg border border-rw-green/20 bg-rw-green/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rw-green">
                    Approved By
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{company.approvedBy}</p>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-rw-blue" />
                  <p className="text-sm font-medium">Investment pipeline tracking active</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Full audit trail and approval history will be available once the backend is
                  connected.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        document={previewDocument}
        open={previewDocument !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      />
    </>
  );
}
