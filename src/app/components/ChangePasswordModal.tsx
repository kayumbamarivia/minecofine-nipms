import { useState } from 'react';
import { Button } from './ui/button';
import { authApi } from '../../utils/services';
import type { AuthUser } from '../../types';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  user: AuthUser;
  forced?: boolean;
  onUpdated: (user: AuthUser) => void;
  onClose?: () => void;
}

export function ChangePasswordModal({
  user,
  forced = false,
  onUpdated,
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      onUpdated(res.user);
      toast.success(res.message);
      onClose?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-serif text-xl font-bold text-slate-900">
            {forced ? 'Set a new password' : 'Change password'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {forced
              ? `${user.fullName}, your temporary password must be replaced before continuing.`
              : 'Use a strong password (10+ characters, upper/lowercase and a number).'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Current password
            </span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              New password
            </span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Confirm new password
            </span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
              autoComplete="new-password"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            {!forced && (
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
