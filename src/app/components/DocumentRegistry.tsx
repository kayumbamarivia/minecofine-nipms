import { useEffect, useState } from 'react';
import { Download, Eye, Trash2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody } from './layout/PageHeader';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { documentsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import type { AuthUser, StoredDocument, StoredDocumentCategory } from '../../types';
import { toast } from 'sonner';

interface DocumentRegistryProps {
  user: AuthUser;
  companies: Array<{ id: string; name: string; code: string }>;
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

export function DocumentRegistry({ user, companies }: DocumentRegistryProps) {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [storageDriver, setStorageDriver] = useState<string>('local');
  const [companyId, setCompanyId] = useState(user.companyId ?? companies[0]?.id ?? '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StoredDocumentCategory>('other');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<StoredDocument | null>(null);

  const load = async () => {
    const res = await documentsApi.list(user.companyId ? undefined : companyId || undefined);
    setDocs(res.data);
    if (res.storage?.driver) setStorageDriver(res.storage.driver);
  };

  useEffect(() => {
    void load().catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to load documents');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, user.companyId]);

  const upload = async () => {
    if (!file || !name || !companyId) {
      toast.error('Company, document name and file are required');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('companyId', companyId);
      form.append('name', name);
      form.append('category', category);
      form.append('notes', notes);
      await documentsApi.upload(form);
      setName('');
      setNotes('');
      setFile(null);
      await load();
      toast.success('Document uploaded to the company folder');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const download = async (id: string, originalName: string) => {
    try {
      const token = getToken();
      const response = await fetch(documentsApi.downloadUrl(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const remove = async (id: string) => {
    try {
      await documentsApi.remove(id);
      await load();
      toast.success('Document removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Company folder"
        title="Document Registry"
        description="Store statutory and review attachments: registration documents, performance contracts, signed statements, board minutes and related files."
      />

      <p className="text-xs text-slate-500">
        Object storage:{' '}
        <span className="font-medium text-slate-700">
          {storageDriver === 's3' ? 'MinIO / S3' : 'Local disk'}
        </span>
      </p>

      <Panel>
        <PanelBody className="space-y-4">
          <p className="text-sm font-semibold text-slate-900">Upload document</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {!user.companyId && (
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Company
                </span>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StoredDocumentCategory)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Document title
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="e.g. REG Board Minutes Q1 2026"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                File (PDF / Office / image, max 25 MB)
              </span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600"
              />
            </label>
          </div>
          <Button disabled={busy} className="gap-2" onClick={() => void upload()}>
            <Upload className="h-4 w-4" /> Upload to company folder
          </Button>
        </PanelBody>
      </Panel>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No documents in the registry yet.
                </td>
              </tr>
            )}
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{doc.name}</p>
                  <p className="text-xs text-slate-500">{doc.originalName}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{doc.companyName}</td>
                <td className="px-4 py-3 text-slate-600">{CATEGORY_LABELS[doc.category]}</td>
                <td className="px-4 py-3 text-slate-600">{formatSize(doc.sizeBytes)}</td>
                <td className="px-4 py-3 text-slate-600">{doc.uploadedByName}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setPreviewDocument(doc)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => void download(doc.id, doc.originalName)}
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-700"
                      onClick={() => void remove(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DocumentPreviewDialog
        document={previewDocument}
        open={previewDocument !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      />
    </div>
  );
}
