import { FileText, Upload, X } from 'lucide-react';

export function SupportingFileField({
  label,
  description,
  file,
  accept,
  onChange,
}: Readonly<{
  label: string;
  description: string;
  file: File | null;
  accept?: string;
  onChange: (file: File | null) => void;
}>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {file ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-900">{file.name}</p>
            <p className="text-xs text-emerald-700">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label}`}
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-rw-blue hover:bg-white hover:text-rw-blue">
          <Upload className="h-4 w-4" /> Choose file
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}
