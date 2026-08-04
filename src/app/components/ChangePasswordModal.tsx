import { useState } from 'react';
import { Button } from './ui/button';
import { FormField } from './ui/form-field';
import { InlineAlert } from './ui/inline-alert';
import { authApi } from '../../utils/services';
import type { AuthUser } from '../../types';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  user: AuthUser;
  forced?: boolean;
  onUpdated: (user: AuthUser) => void;
  onClose?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20';

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 id="change-password-title" className="text-xl font-semibold text-slate-900">
            {forced ? 'Set a new password' : 'Change password'}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {forced
              ? `${user.fullName}, your temporary password must be replaced before continuing.`
              : 'Use a strong password (10+ characters, upper/lowercase and a number).'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {forced && (
            <InlineAlert variant="warning">
              You must update your password before accessing NIPMS.
            </InlineAlert>
          )}
          <FormField label="Current password" htmlFor="current-password" required>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </FormField>
          <FormField label="New password" htmlFor="new-password" required>
            <input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirm-password" required>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </FormField>
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
