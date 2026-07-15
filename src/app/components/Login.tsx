import { useEffect, useMemo, useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import type { AuthUser } from '../../types';
import { RwandaFlag } from './brand/RwandaFlag';
import { authApi } from '../../utils/services';
import { ApiError, setToken } from '../../utils/api';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

type AuthScreen = 'login' | 'forgot' | 'reset' | 'verify' | 'resend';

function readAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('auth');
  const token = params.get('token') || '';
  if (mode === 'reset' && token) return { screen: 'reset' as AuthScreen, token };
  if (mode === 'verify' && token) return { screen: 'verify' as AuthScreen, token };
  return { screen: 'login' as AuthScreen, token: '' };
}

function clearAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.pathname);
}

const PASSWORD_HINT =
  'At least 10 characters, with uppercase, lowercase and a number.';

export function Login({ onLogin }: LoginProps) {
  const initial = useMemo(() => readAuthParams(), []);
  const [screen, setScreen] = useState<AuthScreen>(initial.screen);
  const [token, setAuthToken] = useState(initial.token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (initial.screen === 'verify' && initial.token) {
      void runVerify(initial.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goLogin = () => {
    clearAuthParams();
    setScreen('login');
    setError('');
    setInfo('');
    setAuthToken('');
  };

  const runVerify = async (verifyToken: string) => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await authApi.verifyEmail(verifyToken);
      setInfo(res.message);
      clearAuthParams();
      setScreen('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setScreen('resend');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { token: jwt, user } = await authApi.login(email.trim(), password);
      setToken(jwt);
      onLogin(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(err.message);
        setScreen('resend');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await authApi.forgotPassword(email.trim());
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await authApi.resendVerification(email.trim());
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await authApi.resetPassword(token, newPassword);
      setInfo(res.message);
      clearAuthParams();
      setScreen('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<AuthScreen, { title: string; subtitle: string }> = {
    login: {
      title: 'Sign In',
      subtitle: 'Authorised access for company officers and MINECOFIN staff',
    },
    forgot: {
      title: 'Reset password',
      subtitle: 'We will send a secure link to your official email',
    },
    reset: {
      title: 'Choose a new password',
      subtitle: PASSWORD_HINT,
    },
    verify: {
      title: 'Verifying email…',
      subtitle: 'Please wait while we confirm your address',
    },
    resend: {
      title: 'Verify your email',
      subtitle: 'Accounts must confirm their address before first sign-in',
    },
  };

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-[#002b75] lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#fad201]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#00a651]/10 blur-3xl" />
        </div>

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-4">
            <RwandaFlag size="md" className="rounded-xl" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200/80">
                Republic of Rwanda
              </p>
              <p className="text-xl font-bold text-white">NIPMS</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10">
          <h1 className="font-serif text-[2.1rem] font-bold leading-[1.2] text-white">
            National Investment Portfolio Management System
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-blue-100/75">
            Secure portfolio oversight for government equity investments — provisioned
            accounts only, with email verification and password protections.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10 px-10 py-6">
          <p className="text-xs text-blue-200/40">
            © 2026 Ministry of Finance and Economic Planning — Republic of Rwanda
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3">
              <RwandaFlag size="sm" className="rounded-xl" />
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#003da5]">
                  Republic of Rwanda
                </p>
                <p className="text-lg font-bold text-slate-900">NIPMS</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/30">
            <div className="flex h-1.5">
              <div className="flex-1 bg-[#003da5]" />
              <div className="w-1/3 bg-[#fad201]" />
              <div className="flex-1 bg-[#00a651]" />
            </div>

            <div className="p-8">
              {screen !== 'login' && screen !== 'verify' && (
                <button
                  type="button"
                  onClick={goLogin}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
              )}

              <div className="mb-7">
                <h2 className="font-serif text-2xl font-bold text-slate-900">
                  {titles[screen].title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{titles[screen].subtitle}</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {info && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {info}
                </div>
              )}

              {screen === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <EmailField value={email} onChange={setEmail} />
                  <PasswordField
                    id="password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('forgot');
                        setError('');
                        setInfo('');
                      }}
                      className="text-xs font-medium text-[#003da5] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <SubmitButton loading={loading} label="Sign In" />
                </form>
              )}

              {screen === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-5">
                  <EmailField value={email} onChange={setEmail} />
                  <SubmitButton loading={loading} label="Send reset link" />
                </form>
              )}

              {screen === 'resend' && (
                <form onSubmit={handleResend} className="space-y-5">
                  <EmailField value={email} onChange={setEmail} />
                  <SubmitButton loading={loading} label="Resend verification email" />
                </form>
              )}

              {screen === 'reset' && (
                <form onSubmit={handleReset} className="space-y-5">
                  <PasswordField
                    id="new-password"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                  <PasswordField
                    id="confirm-password"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                  <SubmitButton loading={loading} label="Update password" />
                </form>
              )}

              {screen === 'verify' && (
                <p className="text-sm text-slate-600">
                  {loading ? 'Confirming your email address…' : 'Verification complete.'}
                </p>
              )}

              {!info && screen === 'login' && (
                <p className="mt-6 text-center text-xs text-slate-400">
                  No public signup — accounts are provisioned by ministry administrators.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label
        htmlFor="email"
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
      >
        Official Email Address
      </label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          id="email"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@minecofin.gov.rw"
          required
          autoComplete="username"
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#003da5] focus:bg-white focus:ring-2 focus:ring-[#003da5]/15"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
      >
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={id.includes('new') || id.includes('confirm') ? 'new-password' : 'current-password'}
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#003da5] focus:bg-white focus:ring-2 focus:ring-[#003da5]/15"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center rounded-xl bg-[#003da5] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002b75] disabled:opacity-60"
    >
      {loading ? 'Please wait…' : label}
    </button>
  );
}
