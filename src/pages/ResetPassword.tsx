import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link2Off } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { PasswordField, SubmitButton } from '@/components/auth/fields';
import { resetPassword, login, getState } from '@/lib/store';

/** P4 · Reset password — /reset-password?token=… (auth.md). New password form,
 *  invalid/expired-token panel, success panel with draw-on check. */

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const tokenKnown = !!token && getState().resets.some((r) => r.token === token);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (confirm !== password) e.confirm = 'Passwords don’t match — try again.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    window.setTimeout(() => {
      const email = getState().resets.find((r) => r.token === token)?.email;
      const res = resetPassword(token, password);
      setLoading(false);
      if (!res.ok) {
        setErrors({ password: res.error ?? 'Could not reset your password.' });
        return;
      }
      // sign the user in immediately with the new password (demo convenience)
      if (email) login(email, password);
      setDone(true);
      toast.success('Password updated — you’re signed in.');
    }, 600);
  };

  return (
    <AuthShell
      eyebrow={done ? 'All set' : 'Almost there'}
      title={done ? <>You're <em>back in</em></> : <>Choose a new <em>password</em></>}
      lead={done ? undefined : 'Pick something strong — your salon earnings live here.'}
    >
      {!token || !tokenKnown ? (
        /* invalid / expired token panel */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-m)] border p-8 text-center"
          style={{ borderColor: 'var(--ysl-danger)', background: 'var(--ysl-surface)' }}
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full"
            style={{ background: 'var(--ysl-special-soft)', color: 'var(--ysl-danger)' }}>
            <Link2Off size={28} />
          </span>
          <h3 className="mt-5 font-serif text-2xl font-semibold">This link has expired</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
            Reset links are single-use and expire after 60 minutes. Request a fresh one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary mt-6 w-full">Send a new link</Link>
        </motion.div>
      ) : done ? (
        /* success panel — draw-on check */
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="text-center"
        >
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full"
            style={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <motion.path
                d="M4 12.5l5 5L20 6.5"
                stroke="var(--ysl-violet-deep)"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              />
            </svg>
          </span>
          <h3 className="mt-6 font-serif text-2xl font-semibold">Password updated — you're signed in</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
            Your account is secure again. Continue where you left off.
          </p>
          <button onClick={() => navigate('/account')} className="btn btn-gold mt-7 w-full">
            Continue
          </button>
        </motion.div>
      ) : (
        <motion.form
          onSubmit={submit}
          noValidate
          className="space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            showStrength
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <SubmitButton loading={loading}>Update password</SubmitButton>
          <p className="text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>
            Changed your mind?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--ysl-purple)' }}>Back to sign in →</Link>
          </p>
        </motion.form>
      )}
    </AuthShell>
  );
}
