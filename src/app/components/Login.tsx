import { useEffect, useMemo, useState } from 'react';
import { Lock, EnvelopeSimple, Eye, EyeSlash, ArrowLeft } from '@phosphor-icons/react';
import type { AuthUser } from '../../types';
import { authApi } from '../../utils/services';
import { ApiError, setToken } from '../../utils/api';
import { InlineAlert } from './ui/inline-alert';

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

  useEffect(() => {
    // Lock the whole document while the login screen is shown — no scrolling
    // in any direction, no matter how the content lays out, ever.
    const { html, body } = { html: document.documentElement, body: document.body };
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.height = '100%';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    // Belt-and-suspenders: some browsers can still pan the visual viewport on
    // wheel/touch input (e.g. when zoomed) even with overflow:hidden set.
    // Actively cancel any scroll-driving input while this screen is mounted
    // so the page truly cannot be nudged in any direction.
    const cancelScroll = (event: Event) => event.preventDefault();
    window.addEventListener('wheel', cancelScroll, { passive: false });
    window.addEventListener('touchmove', cancelScroll, { passive: false });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      window.removeEventListener('wheel', cancelScroll);
      window.removeEventListener('touchmove', cancelScroll);
    };
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

  const titles: Record<AuthScreen, { title: string; subtitle?: string }> = {
    login: { title: 'Login' },
    forgot: { title: 'Reset password', subtitle: 'We will email you a secure link' },
    reset: { title: 'New password', subtitle: PASSWORD_HINT },
    verify: { title: 'Verifying…', subtitle: 'Confirming your email address' },
    resend: { title: 'Verify email', subtitle: 'Confirm your address to continue' },
  };

  return (
    <div className="login-stage fixed inset-0 flex items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Professional financial-district backdrop — pinned to the viewport, never scrolls or drifts */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <img
          src="/business-skyline2.jpg"
          alt=""
          className="login-stage-bg absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020a1c]/60 via-[#04122a]/55 to-[#020617]/78" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a56c4]/18 via-transparent to-[#00a651]/12" />
        <div className="login-glow login-glow--blue absolute -left-24 top-0 h-96 w-96 rounded-full bg-[#3b82c4]/30 blur-3xl" />
        <div className="login-glow login-glow--gold absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#fad201]/15 blur-3xl" />
        <div className="login-glow login-glow--green absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#34a86a]/18 blur-3xl" />
      </div>

      {/* Outer soft shell */}
      <div className="login-card relative z-10 w-full max-w-[min(980px,calc(100vw-2.5rem))] rounded-[2rem] border border-white/50 bg-white/95 p-3 shadow-[0_30px_80px_rgba(15,40,80,0.28)] sm:max-w-[min(980px,calc(100vw-4rem))] sm:p-4">
        <div className="relative flex max-h-[calc(100vh-2rem)] flex-col gap-3 lg:h-[min(520px,calc(100vh-4rem))] lg:max-h-none lg:flex-row lg:items-stretch lg:gap-0">
          <aside className="login-visual relative hidden w-full overflow-hidden rounded-[1.5rem] lg:block lg:w-[54%]">
            <img
              src="/convention-centre.png"
              alt=""
              className="login-bg-image absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#04122a]/30 to-transparent" />
            <div className="login-visual-glow absolute inset-x-10 bottom-10 h-28 rounded-full bg-[#1a56c4]/35 blur-2xl" />

            <div className="absolute inset-0 flex flex-col justify-between p-8 xl:p-10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
                  <span className="text-base font-bold text-white [font-family:var(--font-display)]">N</span>
                </span>
                <div>
                  <p className="text-base font-semibold tracking-[0.02em] text-white [font-family:var(--font-display)]">
                    NIPMS
                  </p>
                  <p className="text-[11px] tracking-wide text-white/55">Investment Portfolio Platform</p>
                </div>
              </div>

              <div className="max-w-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#fad201]">
                  Kigali · Rwanda
                </p>
                <h1 className="mt-3 text-[2rem] font-semibold leading-[1.16] tracking-tight text-white [font-family:var(--font-display)] xl:text-[2.2rem]">
                  Clarity for every investment decision
                </h1>
                <p className="mt-3.5 text-[15px] leading-relaxed text-white/70">
                  Track holdings and monitor performance in one secure workspace.
                </p>
              </div>

              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                We invite you to join our platform
              </p>
            </div>
          </aside>

          <main className="login-form-pane relative z-10 flex flex-1 flex-col justify-center overflow-hidden rounded-[1.5rem] px-6 py-6 sm:px-10 sm:py-9 lg:-ml-6 lg:px-12 lg:py-12 xl:px-14">
            <div className="mx-auto w-full max-w-[320px]">
              <div className="mb-6 flex items-center gap-3 sm:mb-8 lg:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#003da5] text-white">
                  <span className="text-base font-bold [font-family:var(--font-display)]">N</span>
                </span>
                <div>
                  <p className="text-base font-semibold tracking-[0.02em] text-slate-800 [font-family:var(--font-display)]">
                    NIPMS
                  </p>
                  <p className="text-[11px] tracking-wide text-slate-500">Investment Portfolio Platform</p>
                </div>
              </div>

              {screen !== 'login' && screen !== 'verify' && (
                <button
                  type="button"
                  onClick={goLogin}
                  className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to sign in
                </button>
              )}

              <div className="mb-6 space-y-1.5 sm:mb-8">
                <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-900 [font-family:var(--font-display)] sm:text-[2.1rem]">
                  {titles[screen].title}
                </h2>
                {titles[screen].subtitle && (
                  <p className="text-sm leading-relaxed text-slate-500">{titles[screen].subtitle}</p>
                )}
              </div>

              {error && (
                <InlineAlert variant="danger" className="mb-5">
                  {error}
                </InlineAlert>
              )}
              {info && (
                <InlineAlert variant="success" className="mb-5">
                  {info}
                </InlineAlert>
              )}

              {screen === 'login' && (
                <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
                  <LineField
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="username"
                    icon={<EnvelopeSimple className="h-4 w-4" weight="regular" />}
                  />
                  <LineField
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                    icon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-500 transition hover:text-slate-800"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeSlash className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit mt-2 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Login'}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <span className="text-slate-400">Invitation only</span>
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('forgot');
                        setError('');
                        setInfo('');
                      }}
                      className="font-medium transition hover:text-slate-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              )}

              {screen === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-6 sm:space-y-8">
                  <LineField
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="username"
                    icon={<EnvelopeSimple className="h-4 w-4" weight="regular" />}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Please wait…' : 'Send reset link'}
                  </button>
                </form>
              )}

              {screen === 'resend' && (
                <form onSubmit={handleResend} className="space-y-6 sm:space-y-8">
                  <LineField
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="username"
                    icon={<EnvelopeSimple className="h-4 w-4" weight="regular" />}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Please wait…' : 'Resend verification'}
                  </button>
                </form>
              )}

              {screen === 'reset' && (
                <form onSubmit={handleReset} className="space-y-6 sm:space-y-8">
                  <LineField
                    id="new-password"
                    label="New password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    icon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-500"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <LineField
                    id="confirm-password"
                    label="Confirm password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    icon={<Lock className="h-4 w-4" />}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? 'Please wait…' : 'Update password'}
                  </button>
                </form>
              )}

              {screen === 'verify' && (
                <p className="text-sm text-slate-600">
                  {loading ? 'Confirming your email address…' : 'Verification complete.'}
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function LineField({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  icon,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="login-line-field">
      <label
        htmlFor={id}
        className="mb-2.5 block text-[13px] font-medium tracking-wide text-slate-600"
      >
        {label}
      </label>
      <div className="relative flex items-center gap-2 border-b border-slate-800/25 transition-[border-color] focus-within:border-[#003da5]">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="login-line-input min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
        />
        <span className="shrink-0 text-slate-500">{icon}</span>
      </div>
    </div>
  );
}
