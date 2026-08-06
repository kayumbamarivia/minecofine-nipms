import { Key, ShieldCheck } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { PageHeader, Panel, PanelBody } from './layout/PageHeader';
import type { AuthUser } from '../../types';
import { ROLE_SHORT } from '../../utils/roles';

interface SettingsPanelProps {
  user: AuthUser;
  onChangePassword: () => void;
}

export function SettingsPanel({ user, onChangePassword }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Account"
        title="Settings"
        description="Manage your account security and preferences."
      />

      <Panel>
        <PanelBody className="space-y-5">
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rw-blue-subtle text-rw-blue"
              aria-hidden
            >
              <ShieldCheck className="h-5 w-5" weight="regular" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Account</h2>
              <p className="mt-1 text-sm text-slate-600">
                Signed in as <span className="font-medium text-slate-800">{user.fullName}</span>
                {' · '}
                {ROLE_SHORT[user.role]}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
              aria-hidden
            >
              <Key className="h-5 w-5" weight="regular" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Change password</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                Update your password regularly. Use at least 10 characters with upper and lowercase
                letters and a number.
              </p>
            </div>
          </div>
          <Button type="button" onClick={onChangePassword} className="shrink-0 sm:self-center">
            Change password
          </Button>
        </PanelBody>
      </Panel>
    </div>
  );
}
