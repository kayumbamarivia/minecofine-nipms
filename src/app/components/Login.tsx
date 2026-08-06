import { useEffect, useMemo, useState } from 'react';
import { Lock, EnvelopeSimple, Eye, EyeSlash, ArrowLeft } from '@phosphor-icons/react';
import type { AuthUser } from '../../types';
import { RwandaFlag } from './brand/RwandaFlag';
import { authApi } from '../../utils/services';
import { ApiError, setToken } from '../../utils/api';
import { InlineAlert } from './ui/inline-alert';
import { Button } from './ui/button';

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
      title: 'Sign in to NIPMS',
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
      <aside className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-rw-blue-dark lg:flex">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rw-blue via-rw-yellow to-rw-green" />
          <div className="absolute -right-20 top-24 h-72 w-72 rounded-full bg-rw-blue-light/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-rw-green/10 blur-3xl" />
        </div>

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-4">
            <RwandaFlag size="md" className="rounded-lg" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">
                Republic of Rwanda
              </p>
              <p className="text-xl font-bold text-white">NIPMS</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10">
          <h1 className="text-[2rem] font-semibold leading-[1.25] text-white [font-family:var(--font-display)]">
            National Investment Portfolio Management System
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-blue-100/75">
            Secure portfolio oversight for government equity investments — provisioned
            accounts only, with email verification and password protections.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-blue-100/70">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rw-yellow" aria-hidden />
              SOE registry and portfolio monitoring
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rw-yellow" aria-hidden />
              Structured reporting and approval workflows
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rw-yellow" aria-hidden />
              Role-based access for ministry and company users
            </li>
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 px-10 py-6">
          <p className="text-xs text-blue-200/45">
            © 2026 Ministry of Finance and Economic Planning — Republic of Rwanda
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-page p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3">
              <RwandaFlag size="sm" className="rounded-lg" />
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-rw-blue">
                  Republic of Rwanda
                </p>
                <p className="text-lg font-bold text-slate-900">NIPMS</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-1" aria-hidden>
              <div className="flex-1 bg-rw-blue" />
              <div className="w-1/4 bg-rw-yellow" />
              <div className="flex-1 bg-rw-green" />
            </div>

            <div className="p-7 sm:p-8">
              {screen !== 'login' && screen !== 'verify' && (
                <button
                  type="button"
                  onClick={goLogin}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to sign in
                </button>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 [font-family:var(--font-display)]">
                  {titles[screen].title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{titles[screen].subtitle}</p>
              </div>

              {error && (
                <InlineAlert variant="danger" className="mb-4">
                  {error}
                </InlineAlert>
              )}
              {info && (
                <InlineAlert variant="success" className="mb-4">
                  {info}
                </InlineAlert>
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
                      className="text-xs font-medium text-rw-blue hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full">
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                </form>
              )}

              {screen === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-5">
                  <EmailField value={email} onChange={setEmail} />
                  <Button type="submit" disabled={loading} className="h-11 w-full">
                    {loading ? 'Please wait…' : 'Send reset link'}
                  </Button>
                </form>
              )}

              {screen === 'resend' && (
                <form onSubmit={handleResend} className="space-y-5">
                  <EmailField value={email} onChange={setEmail} />
                  <Button type="submit" disabled={loading} className="h-11 w-full">
                    {loading ? 'Please wait…' : 'Resend verification email'}
                  </Button>
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
                  <Button type="submit" disabled={loading} className="h-11 w-full">
                    {loading ? 'Please wait…' : 'Update password'}
                  </Button>
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
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        Official Email Address
      </label>
      <div className="relative">
        <EnvelopeSimple
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="email"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@minecofin.gov.rw"
          required
          autoComplete="username"
          className="block h-11 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
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
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={
            id.includes('new') || id.includes('confirm') ? 'new-password' : 'current-password'
          }
          className="block h-11 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-rw-blue focus:ring-2 focus:ring-rw-blue/20"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
