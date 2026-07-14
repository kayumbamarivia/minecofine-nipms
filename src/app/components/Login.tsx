import { useState } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, Building2, Landmark } from 'lucide-react';
import type { UserRole } from '../../types';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLogin(selectedRole);
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel (desktop) ── */}
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-[#002b75] lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#fad201]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#00a651]/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-4">
            <RwandaEmblem />
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
            Ministry of Finance and Economic Planning — oversee, monitor, and govern
            state-owned enterprise investments nationwide.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: '6', label: 'Active SOEs' },
              { value: '142.5B', label: 'Portfolio (RWF)' },
              { value: '6', label: 'Ministries' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-[#fad201]">{stat.value}</p>
                <p className="mt-1 text-[11px] text-blue-200/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 px-10 py-6">
          <p className="text-xs text-blue-200/40">
            © 2026 Ministry of Finance and Economic Planning — Republic of Rwanda
          </p>
        </div>
      </aside>

      {/* ── Right sign-in panel ── */}
      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile header */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3">
              <RwandaEmblem size="sm" />
              <div className="text-left">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#003da5]">
                  Republic of Rwanda
                </p>
                <p className="text-lg font-bold text-slate-900">NIPMS</p>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-300/30">
            {/* Rwanda colour stripe */}
            <div className="flex h-1.5">
              <div className="flex-1 bg-[#003da5]" />
              <div className="w-1/3 bg-[#fad201]" />
              <div className="flex-1 bg-[#00a651]" />
            </div>

            <div className="p-8">
              <div className="mb-7">
                <h2 className="font-serif text-2xl font-bold text-slate-900">Sign In</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Secure access to the national investment portfolio
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Role selector */}
                <fieldset>
                  <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Access Level
                  </legend>
                  <div className="grid grid-cols-2 gap-2.5">
                    {([
                      { role: 'admin' as const, label: 'MINECOFIN', sub: 'Portfolio Director', icon: Landmark },
                      { role: 'company' as const, label: 'SOE Portal', sub: 'Company User', icon: Building2 },
                    ]).map((option) => {
                      const active = selectedRole === option.role;
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.role}
                          type="button"
                          onClick={() => setSelectedRole(option.role)}
                          className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all duration-150 ${
                            active
                              ? 'border-[#003da5] bg-[#003da5]/5 shadow-sm'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-[#003da5]' : 'text-slate-400'}`} />
                          <span className={`text-sm font-semibold ${active ? 'text-[#003da5]' : 'text-slate-800'}`}>
                            {option.label}
                          </span>
                          <span className="text-[11px] text-slate-500">{option.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@minecofin.gov.rw"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003da5] focus:bg-white focus:ring-2 focus:ring-[#003da5]/15"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003da5] focus:bg-white focus:ring-2 focus:ring-[#003da5]/15"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-1 w-full rounded-xl bg-[#003da5] py-3 text-sm font-semibold text-white shadow-md shadow-[#003da5]/25 transition hover:bg-[#002b75] active:scale-[0.99]"
                >
                  Sign In to NIPMS
                </button>
              </form>

              <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3.5">
                <p className="text-xs font-semibold text-slate-700">Demo Access</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Use any credentials. MINECOFIN unlocks all modules; SOE Portal shows company-level access.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Ministry of Finance and Economic Planning · Kigali, Rwanda
          </p>
        </div>
      </main>
    </div>
  );
}

function RwandaEmblem({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-11 w-11' : 'h-14 w-14';
  const icon = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';
  return (
    <div className={`relative flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg`}>
      <div className="absolute inset-0 flex flex-col">
        <div className="h-1/3 bg-[#003da5]" />
        <div className="h-1/3 bg-[#fad201]" />
        <div className="h-1/3 bg-[#00a651]" />
      </div>
      <Shield className={`relative ${icon} text-[#003da5]`} />
    </div>
  );
}
