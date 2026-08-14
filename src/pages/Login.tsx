import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Field, PasswordField, SubmitButton, inputCls, inputStyle } from '@/components/auth/fields';
import { login } from '@/lib/store';

/** P2 · Login — /login (auth.md). Gmail + password, demo hint card,
 *  ?next= handoff, danger shake on wrong password. */

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (!res.ok || !res.user) {
        setError(res.error ?? 'Could not sign you in.');
        setShakeKey((k) => k + 1);
        return;
      }
      toast.success(`Sawubona, ${res.user.name.split(' ')[0]} — welcome back.`);
      if (next) navigate(next);
      else if (res.user.role === 'owner') navigate('/dashboard');
      else if (res.user.role === 'admin') navigate('/admin');
      else navigate('/account');
    }, 550);
  };

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Sign in to <em>YSL</em></>}
      lead="Your bookings, favourites and store — right where you left them."
    >
      <motion.form
        key={shakeKey}
        onSubmit={submit}
        noValidate
        className="space-y-5"
        animate={shakeKey ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
        transition={{ duration: 0.4 }}
      >
        <Field label="Gmail address" error={error && error.toLowerCase().includes('account') ? error : undefined}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            autoComplete="email"
            className={inputCls}
            style={inputStyle}
          />
        </Field>

        <PasswordField
          value={password}
          onChange={setPassword}
          error={error && !error.toLowerCase().includes('account') ? error : undefined}
        />

        <SubmitButton loading={loading}>Sign in</SubmitButton>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium" style={{ color: 'var(--ysl-purple)' }}>
            Forgot password?
          </Link>
          <span style={{ color: 'var(--ysl-muted)' }}>
            New here?{' '}
            <Link to="/signup" className="font-medium" style={{ color: 'var(--ysl-purple)' }}>
              Create an account →
            </Link>
          </span>
        </div>

        {/* demo hint card */}
        <div className="rounded-[var(--radius-m)] p-5" style={{ background: 'var(--ysl-lilac)' }}>
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-purple)' }}>
            <KeyRound size={14} /> Demo accounts — for reviewers
          </p>
          <div className="mt-3 space-y-2 font-mono text-[13px]" style={{ color: 'var(--ysl-ink)' }}>
            <button type="button" onClick={() => fill('ama.glow@gmail.com', 'ysl-owner-2026')}
              className="block w-full rounded-md bg-ysl-surface px-3 py-2 text-left transition-colors hover:bg-white">
              ama.glow@gmail.com <span style={{ color: 'var(--ysl-muted)' }}>/ ysl-owner-2026</span>
              <span className="float-right text-[11px] uppercase tracking-wider" style={{ color: 'var(--ysl-purple)' }}>owner</span>
            </button>
            <button type="button" onClick={() => fill('lufuno.m@gmail.com', 'ysl-demo-2026')}
              className="block w-full rounded-md bg-ysl-surface px-3 py-2 text-left transition-colors hover:bg-white">
              lufuno.m@gmail.com <span style={{ color: 'var(--ysl-muted)' }}>/ ysl-demo-2026</span>
              <span className="float-right text-[11px] uppercase tracking-wider" style={{ color: 'var(--ysl-purple)' }}>customer</span>
            </button>
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--ysl-muted)' }}>
            Tap a row to autofill. Any seeded salon-owner Gmail works with the owner password.
          </p>
        </div>
      </motion.form>
    </AuthShell>
  );
}
