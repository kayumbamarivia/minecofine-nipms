import { useState } from 'react';
import { DownloadSimple, FileXls, UploadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { getToken } from '../../utils/api';
import { importsApi, type FinancialPackMode, type ParsedFinancialPack } from '../../utils/services';

/**
 * Download the official workbook / upload a filled one to auto-fill the form.
 * Shared by the quarterly and annual reporting wizards.
 */
export function FinancialPackImportPanel({
  mode,
  templateFileName,
  onParsed,
  disabled,
}: Readonly<{
  mode: FinancialPackMode;
  templateFileName: string;
  onParsed: (pack: ParsedFinancialPack) => void;
  disabled?: boolean;
}>) {
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    mappedLines: number;
    trialBalanceRows: number;
    warnings: string[];
  } | null>(null);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const token = getToken();
      const url =
        mode === 'annual' ? importsApi.annualTemplateUrl() : importsApi.quarterlyTemplateUrl();
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          body.error ??
            'Template file not found — enter the pack manually or upload a filled workbook',
        );
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = templateFileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Template download failed');
    } finally {
      setDownloading(false);
    }
  };

  const uploadWorkbook = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const { data } = await importsApi.parseFinancialPack(file, mode);
      onParsed(data);
      setLastResult({
        mappedLines: data.mappedLines,
        trialBalanceRows: data.trialBalance.length,
        warnings: data.warnings,
      });
      toast.success(
        `Imported ${data.mappedLines} statement lines and ${data.trialBalance.length} trial balance accounts — review every section before saving`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Workbook import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="rounded-xl border border-rw-blue/20 bg-rw-blue-subtle/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileXls className="mt-0.5 h-4 w-4 shrink-0 text-rw-blue" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Auto-fill from the official Excel template
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Download the MINECOFIN {mode === 'annual' ? 'annual' : 'quarterly'} workbook, fill the
              amount columns, then upload it here. Cover details, trial balance, statements and KPIs
              are mapped into the sections below — you can still edit everything afterwards.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={() => void downloadTemplate()}
          >
            <DownloadSimple className="mr-1 h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download template'}
          </Button>
          <label className="inline-flex cursor-pointer items-center">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <UploadSimple className="h-4 w-4" />
              {importing ? 'Reading workbook…' : 'Upload filled workbook'}
            </span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              disabled={importing || disabled}
              onChange={(event) => {
                void uploadWorkbook(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {lastResult && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">
            {lastResult.mappedLines} statement lines · {lastResult.trialBalanceRows} trial balance
            accounts imported
          </p>
          {lastResult.warnings.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              {lastResult.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
