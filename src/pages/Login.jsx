import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) return;

    setIsLoading(true);
    try {
      const result = await login(trimmedEmail, trimmedPassword);
      if (result?.ok) {
        navigate('/', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 scale-105"
        style={{
          backgroundImage: "url('/images/home/hero-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f08]/92 via-[#2a1608]/78 to-brand-700/55" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(237,128,27,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(237,128,27,0.2),transparent_40%)]" />

      <img
        src="/images/home/orange-corner.png"
        alt=""
        className="absolute -top-16 -left-16 w-[460px] opacity-60 pointer-events-none select-none"
      />
      <img
        src="/images/home/lotus-watermark.png"
        alt=""
        className="absolute -bottom-10 -right-10 w-[420px] opacity-15 pointer-events-none select-none"
      />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-[1.75rem] overflow-hidden border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.35)] bg-white/95 backdrop-blur-xl">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-12 text-white relative min-h-[560px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/images/home/modi-hero.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-brand-600/35" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-xl shadow-brand-500/40 overflow-hidden p-1.5 ring-2 ring-white/15">
                <img
                  src="/images/home/social-instagram.png"
                  alt="BJP Karyakarta"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-display text-2xl font-bold leading-none">BJP Karyakarta</p>
                <p className="text-[11px] uppercase tracking-[0.28em] text-brand-200 mt-1.5">
                  Control Centre
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wider text-brand-100 mb-5">
              <Sparkles size={14} />
              Admin Desk
            </div>

            <h2 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] mb-4">
              Empower every
              <br />
              <span className="text-brand-300">karyakarta</span>
              <br />
              digitally.
            </h2>
            <p className="text-orange-100/85 text-base max-w-sm leading-relaxed">
              Manage banners, news, posters, templates and campaigns from one saffron-themed control panel.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-orange-100/85 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
            <ShieldCheck className="text-brand-300 shrink-0" size={20} />
            <span>Secure access for authorised administrators only</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-7 sm:p-10 xl:p-12 flex flex-col justify-center bg-gradient-to-b from-white to-sand/40">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center overflow-hidden p-1 shadow-lg shadow-brand-500/30">
              <img
                src="/images/home/social-instagram.png"
                alt="BJP Karyakarta"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-ink">BJP Karyakarta</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600">Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-2">Welcome back</h1>
            <p className="text-stone-500 font-medium">
              Sign in to open your Karyakarta admin desk
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-bold text-ink block">
                Email Address
              </label>
              <div className="login-field relative">
                <span className="login-field-icon" aria-hidden>
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="admin@gmail.com"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-bold text-ink block">
                Password
              </label>
              <div className="login-field relative">
                <span className="login-field-icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="Enter your password"
                  className="login-input login-input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Admin Panel</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-8">
            Protected admin access · BJP Karyakarta
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
