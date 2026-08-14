import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import BrevoModal from '@/components/auth/BrevoModal';
import { Field, SubmitButton, inputCls, inputStyle } from '@/components/auth/fields';
import { requestPasswordReset } from '@/lib/store';

/** P3 · Forgot password — /forgot-password (auth.md). Single field → inline
 *  Brevo-styled "email sent" swap; demo shows the reset link inline. */

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [brevoOpen, setBrevoOpen] = useState(false);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      const res = requestPasswordReset(email);
      setLoading(false);
      if (!res.ok || !res.resetLink) {
        setError(res.error ?? 'Something went wrong — try again.');
        return;
      }
      setResetLink(res.resetLink);
      setBrevoOpen(true);
    }, 600);
  };

  return (
    <AuthShell
      eyebrow="No worries"
      title={<>Reset your <em>password</em></>}
      lead="Enter your Gmail and we'll email you a reset link."
    >
      <AnimatePresence mode="wait" initial={false}>
        {!resetLink ? (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <Field label="Gmail address" error={error}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                autoComplete="email"
                className={`${inputCls} ${error ? '!border-ysl-danger' : ''}`}
                style={inputStyle}
              />
            </Field>
            <SubmitButton loading={loading}>Send reset link</SubmitButton>
            <p className="text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>
              Remembered it?{' '}
              <Link to="/login" className="font-medium" style={{ color: 'var(--ysl-purple)' }}>Back to sign in →</Link>
            </p>
          </motion.form>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="text-center"
          >
            <motion.span
              initial={{ rotateX: 0 }}
              animate={{ rotateX: -30 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto grid h-20 w-20 place-items-center rounded-full"
              style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-gold)', transformOrigin: 'top center' }}
            >
              <MailCheck size={36} />
            </motion.span>
            <h3 className="mt-6 font-serif text-2xl font-semibold">Check your inbox</h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
              Email sent via Brevo — check <span className="font-medium" style={{ color: 'var(--ysl-ink)' }}>{email.trim().toLowerCase()}</span> for your reset link.
              It expires in 60 minutes.
            </p>
            <button onClick={() => setBrevoOpen(true)} className="btn btn-primary mt-7 w-full">
              Preview the email
            </button>
            {/* demo convenience: the reset link inline */}
            <p className="mt-4 text-sm" style={{ color: 'var(--ysl-muted)' }}>
              Demo shortcut:{' '}
              <Link to={resetLink} className="font-medium underline" style={{ color: 'var(--ysl-purple)' }}>
                open the reset link →
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <BrevoModal
        open={brevoOpen}
        onClose={() => setBrevoOpen(false)}
        to={email.trim().toLowerCase()}
        headline="Reset your YSL password"
        ctaLabel="Reset my password"
        ctaHref={resetLink ?? undefined}
      >
        <p>
          Hi there — we received a request to reset the password for your Young Space Lighty account.
          Tap the button below to choose a new password. This link expires in 60 minutes.
        </p>
        <p className="mt-3">If you didn't request this, you can safely ignore this email.</p>
      </BrevoModal>
    </AuthShell>
  );
}
