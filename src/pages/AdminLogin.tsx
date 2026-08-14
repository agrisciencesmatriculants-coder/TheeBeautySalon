/** AdminLogin — /admin/login (outside Layout). Violet-dark split screen,
 *  password gate via store.adminLogin; demo credentials shown on the page. */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { adminLogin, useStore } from '@/lib/store';

const DEMO_EMAIL = 'youngagripreneurs.ng@gmail.com';
const DEMO_PASSWORD = 'ysl-admin-2026';

export default function AdminLogin() {
  const navigate = useNavigate();
  const sessionUser = useStore((s) =>
    s.sessionUserId ? (s.users.find((u) => u.id === s.sessionUserId) ?? null) : null,
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [success, setSuccess] = useState(false);

  // Already signed in as admin → straight to the console.
  useEffect(() => {
    if (success) {
      const t = window.setTimeout(() => navigate('/admin', { replace: true }), 420);
      return () => window.clearTimeout(t);
    }
  }, [success, navigate]);

  if (!success && sessionUser?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (success) return;
    const res = adminLogin(email, password);
    if (res.ok) {
      setError(null);
      setSuccess(true);
    } else {
      setError(res.error ?? 'Invalid admin credentials.');
      setShakeKey((k) => k + 1);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="flex min-h-[100dvh]" style={{ background: 'var(--ysl-violet-deep)' }}>
      {/* ── left editorial panel ── */}
      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <img src="/auth-side.png" alt="Student salon, Grahamstown" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(200deg, rgba(36,18,51,.35) 0%, rgba(36,18,51,.88) 78%)' }}
        />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="eyebrow eyebrow-gold">Operations console</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.08] text-white">
            Where Grahamstown<br />
            gets <em style={{ color: 'var(--ysl-gold-light)' }}>governed.</em>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed" style={{ color: 'rgba(242,236,250,.75)' }}>
            Vet salons, run specials, ring the Graduation Bell — every action is audit-logged.
          </p>
        </div>
      </div>

      {/* ── right gate panel ── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12">
        {/* radial glows + laurel watermark */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(55% 45% at 18% 8%, rgba(139,92,246,.28), transparent 70%),' +
              'radial-gradient(45% 40% at 88% 92%, rgba(139,92,246,.16), transparent 70%),' +
              'radial-gradient(35% 30% at 80% 12%, rgba(212,175,106,.12), transparent 70%)',
          }}
        />
        <img
          src="/laurel.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 w-[640px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[.05]"
        />

        <motion.div
          key={shakeKey}
          initial={{ opacity: 0, scale: 0.92, y: 26 }}
          animate={
            shakeKey > 0 && error
              ? { opacity: 1, scale: 1, y: 0, x: [0, -12, 12, -9, 9, -4, 4, 0] }
              : success
                ? { opacity: 0, scale: 0.96, y: -14 }
                : { opacity: 1, scale: 1, y: 0, x: 0 }
          }
          transition={
            shakeKey > 0 && error
              ? { x: { duration: 0.5 }, opacity: { duration: 0.3 }, scale: { type: 'spring', stiffness: 260, damping: 22 }, y: { type: 'spring', stiffness: 260, damping: 22 } }
              : { type: 'spring', stiffness: 240, damping: 24, duration: 0.35 }
          }
          className="relative w-full"
          style={{ maxWidth: 440 }}
        >
          <div
            className="p-9 sm:p-10"
            style={{
              background: 'var(--ysl-surface)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid rgba(139,92,246,.25)',
            }}
          >
            <div className="flex flex-col items-center text-center">
              <img src="/ysl-logo.svg" alt="YSL seal" className="h-16 w-16" />
              <p className="eyebrow mt-5 justify-center" style={{ color: 'var(--ysl-purple)' }}>Authorised operators only</p>
              <h1 className="mt-3 font-serif text-4xl font-semibold" style={{ color: 'var(--ysl-ink)' }}>
                Admin Console
              </h1>
              <p className="mt-2 text-[13px]" style={{ color: 'var(--ysl-muted)' }}>
                All actions are audit-logged.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                  Email
                </span>
                <span className="relative block">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ysl-muted)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    autoComplete="username"
                    className="w-full py-3 pl-10 pr-4 text-sm outline-none transition-shadow"
                    style={{
                      background: 'var(--ysl-cream)',
                      border: `1px solid ${error ? 'var(--ysl-danger)' : 'var(--ysl-line)'}`,
                      borderRadius: 'var(--radius-s)',
                      color: 'var(--ysl-ink)',
                    }}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                  Password
                </span>
                <span className="relative block">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ysl-muted)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full py-3 pl-10 pr-11 text-sm outline-none"
                    style={{
                      background: 'var(--ysl-cream)',
                      border: `1px solid ${error ? 'var(--ysl-danger)' : 'var(--ysl-line)'}`,
                      borderRadius: 'var(--radius-s)',
                      color: 'var(--ysl-ink)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ysl-muted)' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 overflow-hidden text-[13px] font-medium"
                    style={{ color: 'var(--ysl-danger)' }}
                  >
                    <AlertTriangle size={14} /> {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: 'var(--ysl-success)' }}
                  >
                    <ShieldCheck size={14} /> Welcome back — opening the console…
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" className="btn btn-primary w-full !py-3.5" disabled={success}>
                Enter console <ArrowRight size={15} />
              </button>
            </form>

            {/* demo credentials hint */}
            <button
              type="button"
              onClick={fillDemo}
              className="mt-6 block w-full p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--ysl-lilac)',
                border: '1px dashed var(--ysl-purple)',
                borderRadius: 'var(--radius-m)',
              }}
            >
              <span className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-purple)' }}>
                  Demo credentials — tap to fill
                </span>
                <ShieldCheck size={13} style={{ color: 'var(--ysl-purple)' }} />
              </span>
              <span className="mt-2 block font-mono text-[12.5px] font-medium" style={{ color: 'var(--ysl-ink)' }}>
                {DEMO_EMAIL}
              </span>
              <span className="block font-mono text-[12.5px] font-medium" style={{ color: 'var(--ysl-ink)' }}>
                {DEMO_PASSWORD}
              </span>
            </button>
          </div>

          <p className="mt-5 text-center text-[11px] uppercase tracking-[.25em]" style={{ color: 'rgba(242,236,250,.45)' }}>
            YSL Mega Beauty Salon · Grahamstown
          </p>
        </motion.div>
      </div>
    </div>
  );
}
