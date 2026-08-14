import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Field, PasswordField, Checkbox, SubmitButton, inputCls, inputStyle } from '@/components/auth/fields';
import {
  signup, updateSalon, isGmail, slugify, CATEGORIES, AREAS,
} from '@/lib/store';
import type { CategoryKey } from '@/lib/store';

/** P1 · Sign up — /signup (auth.md). Role toggle, Gmail validation, 18+ gate,
 *  owner fields (store name / category / area) + admin-vetting explainer. */

type Role = 'customer' | 'owner';

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole: Role = params.get('role') === 'owner' ? 'owner' : 'customer';

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState<CategoryKey>('braids');
  const [area, setArea] = useState<string>(AREAS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const roles: { key: Role; label: string }[] = useMemo(() => [
    { key: 'customer', label: "I'm booking" },
    { key: 'owner', label: "I'm a salon owner" },
  ], []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your full name.';
    if (!isGmail(email)) e.email = 'Please use a Gmail address ending in @gmail.com.';
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (confirm !== password) e.confirm = 'Passwords don’t match — try again.';
    if (!age) e.age = 'You must confirm you are 18 or older to join YSL.';
    if (role === 'owner' && !storeName.trim()) e.storeName = 'Give your store a name — you can change it later.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    window.setTimeout(() => {
      const res = signup({ name, email, password, role, ageConfirmed: age });
      setLoading(false);
      if (!res.ok || !res.user) {
        toast.error(res.error ?? 'Could not create your account.');
        if (res.error?.toLowerCase().includes('gmail')) setErrors((p) => ({ ...p, email: res.error! }));
        return;
      }
      if (role === 'owner' && res.user.salonId) {
        updateSalon(res.user.salonId, {
          name: storeName.trim(),
          slug: slugify(`${storeName.trim()}-${res.user.salonId.slice(-4)}`),
          categories: [category],
          area,
          blurb: `${storeName.trim()} — a brand-new student salon on Young Space Lighty.`,
        });
        toast.success('Store created — it goes live after a quick admin review.');
        navigate('/dashboard');
      } else {
        toast.success(`Welcome to YSL, ${res.user.name.split(' ')[0]}!`);
        navigate('/account');
      }
    }, 650);
  };

  return (
    <AuthShell
      eyebrow="Join YSL"
      title={<>Create your <em>account</em></>}
      lead="Book Grahamstown's best student salons — or open your own store and start earning."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {/* role toggle (segmented control) */}
        <div className="relative grid grid-cols-2 rounded-full border p-1 hairline" style={{ background: 'var(--ysl-lilac)' }}>
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className="relative z-10 rounded-full py-2.5 text-[12px] font-medium uppercase tracking-[.14em] transition-colors"
              style={{ color: role === r.key ? 'var(--ysl-cream)' : 'var(--ysl-purple)' }}
            >
              {role === r.key && (
                <motion.span
                  layoutId="role-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--ysl-violet-deep)', zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                />
              )}
              {r.label}
            </button>
          ))}
        </div>

        <Field label="Full name" error={errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ama Owusu"
            autoComplete="name"
            className={`${inputCls} ${errors.name ? '!border-ysl-danger' : ''}`}
            style={inputStyle}
          />
        </Field>

        <Field
          label="Gmail address"
          error={errors.email}
          hint="Use your personal Gmail, e.g. example@gmail.com — no student email needed."
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            autoComplete="email"
            className={`${inputCls} ${errors.email ? '!border-ysl-danger' : ''}`}
            style={inputStyle}
          />
        </Field>

        <PasswordField
          value={password}
          onChange={setPassword}
          error={errors.password}
          showStrength
          autoComplete="new-password"
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
        />

        {/* owner-only fields (spring expand) */}
        <AnimatePresence initial={false}>
          {role === 'owner' && (
            <motion.div
              key="owner-fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 rounded-[var(--radius-m)] border p-5 hairline" style={{ background: 'var(--ysl-surface)' }}>
                <Field label="Store name" error={errors.storeName}>
                  <input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Glow by Ama"
                    className={`${inputCls} ${errors.storeName ? '!border-ysl-danger' : ''}`}
                    style={inputStyle}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Main category">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CategoryKey)}
                      className={inputCls}
                      style={inputStyle}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Area">
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                    >
                      {AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                {/* owner note panel */}
                <div className="flex gap-3 rounded-[var(--radius-s)] p-4" style={{ background: 'var(--ysl-lilac)' }}>
                  <Info size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-purple)' }} />
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-ink)' }}>
                    Your store goes live after a quick admin review — usually same day.
                    You'll set services, prices and your weekly schedule in the dashboard.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Checkbox
          checked={age}
          onChange={setAge}
          error={errors.age}
          label="I'm 18 or older"
        />
        <Checkbox
          checked={marketing}
          onChange={setMarketing}
          label="Email me specials and graduation deals"
        />

        <SubmitButton loading={loading}>
          {role === 'owner' ? 'Create account & open my store' : 'Create account'}
        </SubmitButton>

        <p className="text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>
          Already a member?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--ysl-purple)' }}>
            Sign in →
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
