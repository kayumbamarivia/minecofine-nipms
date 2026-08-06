import { useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { documentsApi } from '../../utils/services';
import { getToken } from '../../utils/api';
import type { StoredDocument } from '../../types';

interface DocumentPreviewDialogProps {
  document: StoredDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: Readonly<DocumentPreviewDialogProps>) {
  const [objectUrl, setObjectUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl = '';

    if (!open || !document) {
      setObjectUrl('');
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setObjectUrl('');
    const token = getToken();
    void fetch(documentsApi.previewUrl(document.id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Preview could not be generated');
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Preview could not be generated');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [document, open]);

  const isOriginalBrowserFormat =
    document?.mimeType === 'application/pdf' || document?.mimeType.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[96vw] max-w-7xl flex-col overflow-hidden p-5">
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>{document?.name ?? 'Document preview'}</DialogTitle>
          <DialogDescription>
            {document?.originalName} · Preview generated on demand; the stored original is unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Preparing preview…
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <Warning className="h-8 w-8 text-amber-600" />
              <p className="max-w-lg text-sm text-slate-700">{error}</p>
              <p className="text-xs text-slate-500">The original file can still be downloaded.</p>
            </div>
          )}
          {!loading && !error && objectUrl && (
            <iframe
              title={`Preview of ${document?.originalName ?? 'document'}`}
              src={objectUrl}
              className="h-full w-full border-0 bg-white"
              sandbox={isOriginalBrowserFormat ? undefined : ''}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
