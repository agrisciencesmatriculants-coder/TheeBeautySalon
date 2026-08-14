/** T5 · Graduation Bell — ceremony editor, ring-the-bell (notifies all owners),
 *  gold graduation theme switch (setGradTheme), bell status + grad specials table. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Bell, CalendarDays, GraduationCap } from 'lucide-react';
import {
  createEvent, daysUntil, endSpecial, getNextGraduation, getSalon, getService,
  isSpecialLive, ringTheBell, setGradTheme, setTheme, todayIso, useStoreState,
} from '@/lib/store';
import type { AcademicEvent } from '@/lib/store';
import { formatDate, formatDateTime } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import { AdminModal, EmailPreviewModal, Field, inputStyle, SectionHeader, ThemeSwitch } from './shared';

function fireGoldConfetti() {
  confetti({
    particleCount: 60, spread: 80, startVelocity: 34, scalar: 0.9,
    colors: ['#F2C94C', '#D4AF6A', '#8B5CF6', '#FFFFFF'],
    origin: { y: 0.4 },
  });
}

export default function GraduationSection() {
  const s = useStoreState();
  const grad = getNextGraduation();
  const owners = s.users.filter((u) => u.role === 'owner');

  const [title, setTitle] = useState('Rhodes Graduation 2026 — April ceremonies');
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [desc, setDesc] = useState('Caps in the air on the Great Field — grad specials go live across every student salon.');
  const [ringTarget, setRingTarget] = useState<AcademicEvent | null>(null);
  const [ringing, setRinging] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const gradSpecials = s.specials.filter((sp) => sp.graduation && sp.status !== 'rejected' && sp.status !== 'expired');
  const liveGradCount = gradSpecials.filter((sp) => isSpecialLive(sp)).length;
  const days = grad ? daysUntil(grad.date) : null;
  const theme = s.settings.theme;
  const gradTheme = s.settings.gradTheme;

  const saveCeremony = () => {
    if (!title.trim() || !date) {
      toast.error('Add a ceremony name and date first.');
      return;
    }
    if (date < todayIso()) {
      toast.error('Ceremony date must be in the future.');
      return;
    }
    createEvent({ title: title.trim(), date, kind: 'graduation' });
    toast.success('Ceremony scheduled', { description: `${title.trim()} · ${formatDate(date)}` });
  };

  const doRing = () => {
    if (!ringTarget) return;
    const res = ringTheBell(ringTarget.id);
    setRingTarget(null);
    if (res.ok) {
      setRinging(true);
      fireGoldConfetti();
      window.setTimeout(() => setRinging(false), 2600);
      toast.success(`Bell rung — ${res.notified} owners notified via Brevo`, {
        description: 'Dashboard grad-alerts were written for every salon owner.',
        action: { label: 'Preview email', onClick: () => setEmailOpen(true) },
      });
    }
  };

  const toggleGradTheme = (on: boolean) => {
    setGradTheme(on);
    if (on) {
      fireGoldConfetti();
      toast.success('Graduation theme ON — the whole site dressed up', {
        description: 'Banner live, nav bell pulsing, gold laurels sitewide.',
      });
    } else {
      toast('Graduation theme OFF', { description: 'Back to the standard purple identity.' });
    }
  };

  return (
    <div>
      <SectionHeader
        title="Graduation Bell"
        sub="Create the ceremony, ring the bell to rally owners, and flip the whole site into graduation mode."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        {/* ── hero card: bell + ceremony editor ── */}
        <div className="card-surface overflow-hidden">
          <div className="grad-banner relative flex items-center gap-6 px-7 py-8">
            <img src="/grad-cap.svg" alt="" aria-hidden className="absolute right-6 top-4 w-20 opacity-25" />
            <motion.div
              className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
              style={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', boxShadow: '0 10px 34px rgba(242,201,76,.45)' }}
              animate={ringing ? { rotate: [0, 14, -12, 8, -6, 3, 0] } : { rotate: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
            >
              <Bell size={42} style={{ color: 'var(--ysl-violet-deep)' }} className={ringing || gradTheme ? 'bell-ring' : ''} />
            </motion.div>
            <div className="relative">
              <p className="text-[11px] font-medium uppercase tracking-[.25em]" style={{ color: 'var(--grad-gold)' }}>
                {grad ? (grad.bellRung ? 'Bell rung' : 'Awaiting the bell') : 'No ceremony scheduled'}
              </p>
              <p className="mt-1 font-serif text-3xl font-semibold leading-tight text-white">
                {grad ? grad.title : 'Schedule the next graduation'}
              </p>
              {grad && days !== null && (
                <p className="mt-1 text-sm" style={{ color: 'rgba(242,236,250,.8)' }}>
                  {formatDate(grad.date)} · {days >= 0 ? `in ${days} day${days === 1 ? '' : 's'}` : 'passed'}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ceremony name">
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ceremony date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                className="w-full p-3 text-sm outline-none"
                style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <button onClick={saveCeremony} className="btn btn-ghost !py-3 text-[11px]">
              <CalendarDays size={14} /> Save ceremony
            </button>
          </div>
        </div>

        {/* ── actions column ── */}
        <div className="space-y-6">
          {/* ring the bell */}
          <div className="card-surface p-6">
            <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Ring the bell</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
              Notifies <strong style={{ color: 'var(--ysl-ink)' }}>all {owners.length} salon owners</strong> — a dashboard grad-alert
              plus a Brevo “Graduation is coming” email prompting them to create grad specials.
            </p>
            <button
              onClick={() => grad ? setRingTarget(grad) : toast.error('Schedule a ceremony first.')}
              className="btn btn-gold mt-4 w-full !py-4"
            >
              <Bell size={16} className={ringing ? 'bell-ring' : ''} /> Ring the bell
            </button>
          </div>

          {/* theme switches */}
          <div className="card-surface p-6">
            <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Site themes</p>
            <div className="mt-4 flex items-center gap-4 p-4" style={{ background: 'var(--ysl-lilac)', borderRadius: 'var(--radius-m)', border: gradTheme ? '1px solid var(--ysl-gold)' : '1px solid transparent' }}>
              <GraduationCap size={22} style={{ color: 'var(--ysl-gold)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium">Graduation theme</p>
                <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                  Turn it on like dark mode — the whole site dresses up for graduation day.
                </p>
              </div>
              <ThemeSwitch gold large on={gradTheme} onChange={toggleGradTheme} label="Graduation theme" />
            </div>
            <div className="mt-3 flex items-center gap-4 p-4" style={{ background: 'var(--ysl-lilac)', borderRadius: 'var(--radius-m)' }}>
              <span className="grid h-6 w-6 place-items-center" style={{ color: 'var(--ysl-purple)' }}>◐</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>Composes with the graduation overlay.</p>
              </div>
              <ThemeSwitch on={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} label="Dark mode" />
            </div>
          </div>

          {/* bell status */}
          <div className="card-surface p-6" style={gradTheme ? { borderColor: 'var(--ysl-gold)', boxShadow: '0 8px 30px rgba(242,201,76,.22)' } : undefined}>
            <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Bell status</p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex justify-between">
                <span style={{ color: 'var(--ysl-muted)' }}>Season</span>
                <motion.span key={String(gradTheme)} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="chip !text-[10px]" style={{ background: gradTheme ? 'rgba(30,158,106,.14)' : 'var(--ysl-lilac)', color: gradTheme ? 'var(--ysl-success)' : 'var(--ysl-muted)' }}>
                  {gradTheme ? 'ON' : 'OFF'}
                </motion.span>
              </p>
              <p className="flex justify-between">
                <span style={{ color: 'var(--ysl-muted)' }}>Ceremony</span>
                <span className="font-medium">{grad && days !== null ? (days >= 0 ? `in ${days} days` : 'passed') : '—'}</span>
              </p>
              <p className="flex justify-between">
                <span style={{ color: 'var(--ysl-muted)' }}>Grad specials live</span>
                <span className="font-serif font-bold" style={{ color: 'var(--ysl-gold)' }}>{liveGradCount}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── grad specials table ── */}
      <div className="mt-10">
        <SectionHeader title="Graduation specials" sub="Every special flagged 🎓 — admin- and owner-created." />
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                {['Salon', 'Service', 'Discount', 'Status', 'Countdown', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {gradSpecials.map((sp) => (
                  <motion.tr key={sp.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <img src={getSalon(sp.salonId)?.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                        {getSalon(sp.salonId)?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip chip-gold !normal-case !tracking-normal"><GraduationCap size={11} /> {getService(sp.serviceId)?.name}</span>
                    </td>
                    <td className="px-4 py-3 font-serif font-bold" style={{ color: 'var(--ysl-special)' }}>
                      {sp.kind === 'percent' ? `-${sp.value}%` : `-R${sp.value}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip !text-[9px] ${sp.status === 'pending' ? 'chip-amber' : 'chip-success'}`}>
                        {isSpecialLive(sp) ? 'live' : sp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSpecialLive(sp) ? <CountdownTimer endsAt={sp.endsAt} variant="grad" compact /> : <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{formatDateTime(sp.endsAt)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSpecialLive(sp) && (
                        <button
                          onClick={() => { endSpecial(sp.id); toast('Grad special ended'); }}
                          className="btn !border !px-3 !py-1.5 text-[10px]"
                          style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)', background: 'transparent' }}
                        >
                          End early
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!gradSpecials.length && (
                <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'var(--ysl-muted)' }}>
                  No graduation specials yet — ring the bell and create one in the Specials console.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ring confirm modal ── */}
      <AdminModal open={!!ringTarget} onClose={() => setRingTarget(null)} title={`Ring the bell for ${owners.length} salon owners?`}>
        {ringTarget && (
          <div>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              Every owner gets a dashboard grad-alert and a Brevo email for
              <strong style={{ color: 'var(--ysl-ink)' }}> “{ringTarget.title}”</strong> ({formatDate(ringTarget.date)}),
              prompting them to create graduation specials.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setRingTarget(null)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Not yet</button>
              <button onClick={doRing} className="btn btn-gold flex-1 !py-3 text-[11px]"><Bell size={14} /> Ring it</button>
            </div>
          </div>
        )}
      </AdminModal>

      <EmailPreviewModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        to={`${owners.length} salon owners`}
        subject="🎓 Graduation is coming — create your grad special"
        body={`The Graduation Bell has been rung${grad ? ` for "${grad.title}" (${formatDate(grad.date)})` : ''}. Open your dashboard and flag a special as a Graduation Special to be featured on the graduation page with the gold badge.`}
      />
    </div>
  );
}
