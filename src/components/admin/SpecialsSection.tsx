/** T3 · Specials console (flagship) — click a store → multi-select its service
 *  cards → set % off / R off + window → live customer-view preview → Activate.
 *  Admin specials go live instantly via store.createSpecial. */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  BadgePercent, Check, ChevronLeft, ChevronRight, GraduationCap, Search, Timer, X,
} from 'lucide-react';
import {
  approveSpecial, createSpecial, endSpecial, getSalon, getService,
  getServicesBySalon, isSpecialLive, logAudit, rejectSpecial, useStoreState,
} from '@/lib/store';
import type { Salon, Service, Special } from '@/lib/store';
import { formatDateTime, formatZAR, formatZARShort } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import { AdminModal, Field, inputStyle, SectionHeader, ThemeSwitch } from './shared';

type Kind = 'percent' | 'amount';

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function discountLabel(sp: Special): string {
  return sp.kind === 'percent' ? `-${sp.value}%` : `-${formatZARShort(sp.value)}`;
}

export default function SpecialsSection() {
  const s = useStoreState();

  // wizard state
  const [step, setStep] = useState(1);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<Kind>('percent');
  const [value, setValue] = useState('30');
  const [startAt, setStartAt] = useState(() => toLocalInput(new Date()));
  const [endAt, setEndAt] = useState(() => toLocalInput(new Date(Date.now() + 3 * 86400000)));
  const [grad, setGrad] = useState(s.settings.gradTheme);
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [endTarget, setEndTarget] = useState<Special | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Special | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const salons = useMemo(
    () => s.salons.filter((sl) => sl.name.toLowerCase().includes(search.toLowerCase()) || sl.area.toLowerCase().includes(search.toLowerCase())),
    [s.salons, search],
  );
  const salon = salonId ? getSalon(salonId) ?? null : null;
  const services = useMemo(() => (salonId ? getServicesBySalon(salonId) : []), [salonId, s.services]);

  const numValue = Math.max(0, Number(value) || 0);
  const endsAtMs = new Date(endAt).getTime();
  const validValue = kind === 'percent' ? numValue >= 1 && numValue <= 90 : numValue >= 5 && numValue <= 500;
  const validWindow = !Number.isNaN(endsAtMs) && endsAtMs > Date.now();
  const canActivate = selected.size > 0 && validValue && validWindow;

  const previewPrice = (sv: Service): number => {
    if (!validValue) return sv.price;
    const v = kind === 'percent' ? sv.price * (1 - numValue / 100) : sv.price - numValue;
    return Math.max(0, Math.round(v));
  };
  const previewPct = (sv: Service): number => Math.round((1 - previewPrice(sv) / sv.price) * 100);

  const toggleService = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const pickSalon = (id: string) => {
    setSalonId(id);
    setSelected(new Set());
    setStep(2);
  };

  const resetWizard = () => {
    setStep(1);
    setSalonId(null);
    setSelected(new Set());
    setValue('30');
    setNote('');
  };

  const activate = () => {
    if (!salon) return;
    for (const svcId of selected) {
      createSpecial({
        serviceId: svcId, salonId: salon.id, kind, value: numValue,
        endsAt: endsAtMs, graduation: grad, createdBy: 'admin',
      });
    }
    setConfirmOpen(false);
    confetti({
      particleCount: 55, spread: 65, startVelocity: 32,
      colors: ['#E11D8F', '#8B5CF6', '#D4AF6A', '#FFFFFF'],
      origin: { y: 0.75 },
    });
    toast.success(`Special live on ${selected.size} service${selected.size === 1 ? '' : 's'} at ${salon.name}`, {
      description: 'Every surface — home rail, browse, store, booking — updated instantly.',
    });
    resetWizard();
  };

  const approveOwner = (sp: Special) => {
    approveSpecial(sp.id);
    toast.success('Owner special approved & activated', { description: `${getSalon(sp.salonId)?.name} · ${getService(sp.serviceId)?.name}` });
  };
  const rejectOwner = () => {
    if (!rejectTarget) return;
    rejectSpecial(rejectTarget.id);
    logAudit('admin', 'special-rejected-note', `${getService(rejectTarget.serviceId)?.name ?? rejectTarget.id}: ${rejectNote || 'no note given'}`);
    setRejectTarget(null);
    setRejectNote('');
    toast.error('Owner special rejected', { description: 'Owner notified via Brevo with your note.' });
  };

  const pending = s.specials.filter((sp) => sp.status === 'pending');
  const active = s.specials.filter((sp) => isSpecialLive(sp));
  const selectedServices = services.filter((sv) => selected.has(sv.id));

  return (
    <div>
      {/* ── pending owner requests ── */}
      {pending.length > 0 && (
        <div className="card-surface mb-8 p-5" style={{ borderColor: 'color-mix(in srgb, var(--ysl-amber) 40%, var(--ysl-line))' }}>
          <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-amber)' }}>
            <Timer size={13} /> Pending owner requests ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((sp) => (
              <div key={sp.id} className="flex flex-wrap items-center gap-3 p-3" style={{ background: 'var(--ysl-cream)', borderRadius: 'var(--radius-m)', border: '1px solid var(--ysl-line)' }}>
                <img src={getSalon(sp.salonId)?.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{getSalon(sp.salonId)?.name} · {getService(sp.serviceId)?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                    {discountLabel(sp)} · until {formatDateTime(sp.endsAt)}{sp.graduation ? ' · graduation' : ''}
                  </p>
                </div>
                <button onClick={() => approveOwner(sp)} className="btn btn-gold !px-4 !py-2 text-[10px]">
                  <Check size={13} /> Approve & activate
                </button>
                <button onClick={() => setRejectTarget(sp)} className="btn !border !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)', background: 'transparent' }}>
                  <X size={13} /> Reject with note
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionHeader
        title="Create a special"
        sub="Pick the student store, select its service cards, set the discount — it goes live everywhere instantly."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── wizard column ── */}
        <div>
          {/* progress dots */}
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => { if (n < step || (n === 2 && salonId) || (n === 3 && salonId && selected.size)) setStep(n); }}
                  className="flex items-center gap-2"
                >
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all"
                    style={{
                      background: step === n ? 'var(--ysl-purple)' : step > n ? 'var(--ysl-success)' : 'var(--ysl-lilac)',
                      color: step === n ? '#fff' : step > n ? '#fff' : 'var(--ysl-muted)',
                      boxShadow: step === n ? 'var(--glow-purple)' : 'none',
                    }}
                  >
                    {step > n ? <Check size={14} /> : n}
                  </span>
                  <span className="hidden text-[11px] font-medium uppercase tracking-[.12em] sm:inline" style={{ color: step === n ? 'var(--ysl-ink)' : 'var(--ysl-muted)' }}>
                    {n === 1 ? 'Pick a store' : n === 2 ? 'Select services' : 'Configure'}
                  </span>
                </button>
                {n < 3 && <span className="h-px w-8 sm:w-12" style={{ background: 'var(--ysl-line)' }} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1 — pick a store */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.3 }}>
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ysl-muted)' }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stores or areas…" style={{ ...inputStyle, paddingLeft: 38 }} />
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {salons.map((sl) => (
                    <StorePick key={sl.id} salon={sl} active={salonId === sl.id} onPick={() => pickSalon(sl.id)} />
                  ))}
                  {!salons.length && <p className="col-span-full py-8 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>No stores match that search.</p>}
                </div>
              </motion.div>
            )}

            {/* STEP 2 — select service cards */}
            {step === 2 && salon && (
              <motion.div key="s2" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.3 }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-purple)' }}>
                    <ChevronLeft size={14} /> {salon.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="chip chip-special">{selected.size} selected</span>
                    <button
                      onClick={() => setSelected(selected.size === services.length ? new Set() : new Set(services.map((sv) => sv.id)))}
                      className="chip chip-lilac"
                    >
                      {selected.size === services.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {services.map((sv) => (
                    <SelectableServiceCard key={sv.id} svc={sv} checked={selected.has(sv.id)} onToggle={() => toggleService(sv.id)} />
                  ))}
                  {!services.length && <p className="col-span-full py-8 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>This store has no active services yet.</p>}
                </div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => setStep(3)} disabled={!selected.size} className="btn btn-primary !py-3 text-[11px] disabled:opacity-40">
                    Configure special <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — configure */}
            {step === 3 && salon && (
              <motion.div key="s3" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.3 }}>
                <button onClick={() => setStep(2)} className="mb-4 flex items-center gap-1 text-xs font-medium uppercase tracking-[.12em]" style={{ color: 'var(--ysl-purple)' }}>
                  <ChevronLeft size={14} /> {selected.size} service{selected.size === 1 ? '' : 's'} at {salon.name}
                </button>
                <div className="card-surface space-y-5 p-6">
                  <Field label="Discount type">
                    <div className="flex gap-2">
                      {(['percent', 'amount'] as Kind[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => setKind(k)}
                          className="chip !px-5 !py-2.5 transition-all"
                          style={{
                            background: kind === k ? 'var(--ysl-special)' : 'var(--ysl-special-soft)',
                            color: kind === k ? '#fff' : 'var(--ysl-special)',
                          }}
                        >
                          {k === 'percent' ? '% off' : 'R off'}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={kind === 'percent' ? 'Value (1–90%)' : 'Value (R5–R500)'}>
                      <input
                        type="number" min={kind === 'percent' ? 1 : 5} max={kind === 'percent' ? 90 : 500}
                        value={value} onChange={(e) => setValue(e.target.value)}
                        style={{ ...inputStyle, borderColor: validValue ? 'var(--ysl-line)' : 'var(--ysl-danger)' }}
                      />
                      {!validValue && <span className="mt-1 block text-xs" style={{ color: 'var(--ysl-danger)' }}>
                        {kind === 'percent' ? 'Enter 1–90.' : 'Enter R5–R500.'}
                      </span>}
                    </Field>
                    <Field label="Title / note (optional)">
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Graduation week blowout" style={inputStyle} />
                    </Field>
                    <Field label="Starts">
                      <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={inputStyle} />
                    </Field>
                    <Field label="Ends">
                      <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                        style={{ ...inputStyle, borderColor: validWindow ? 'var(--ysl-line)' : 'var(--ysl-danger)' }} />
                      {!validWindow && <span className="mt-1 block text-xs" style={{ color: 'var(--ysl-danger)' }}>End must be in the future.</span>}
                    </Field>
                  </div>
                  <div className="flex items-center gap-3 p-4" style={{ background: 'var(--ysl-lilac)', borderRadius: 'var(--radius-m)' }}>
                    <GraduationCap size={18} style={{ color: 'var(--ysl-gold)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Graduation special</p>
                      <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>Featured on the graduation page with the gold GRAD SPECIAL badge.</p>
                    </div>
                    <ThemeSwitch gold on={grad} onChange={setGrad} label="Graduation special" />
                  </div>
                  <button onClick={() => setConfirmOpen(true)} disabled={!canActivate} className="btn btn-special w-full !py-4 disabled:opacity-40">
                    <BadgePercent size={16} /> Activate special
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── live preview panel ── */}
        <div className="xl:sticky xl:top-32 xl:self-start">
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-3.5" style={{ background: 'var(--ysl-violet-deep)' }}>
              <p className="text-[11px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-gold-light)' }}>
                As customers will see it
              </p>
            </div>
            <div className="space-y-3 p-5">
              {!selectedServices.length && (
                <p className="py-6 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>
                  Select service cards in step 2 — the preview updates on every keystroke.
                </p>
              )}
              {selectedServices.map((sv) => {
                const pp = previewPrice(sv);
                const pct = previewPct(sv);
                return (
                  <motion.div key={sv.id} layout className="overflow-hidden" style={{ border: '1px dashed var(--ysl-special)', borderRadius: 'var(--radius-m)', background: 'var(--ysl-special-soft)' }}>
                    <div className="flex gap-3 p-3">
                      <img src={sv.image} alt="" className="h-14 w-14 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-[15px] font-semibold" style={{ color: 'var(--ysl-ink)' }}>{sv.name}</p>
                        <p className="mt-1 flex flex-wrap items-baseline gap-2">
                          <span className="text-sm line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZAR(sv.price)}</span>
                          <motion.span
                            key={`${pp}`}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            className="font-serif text-xl font-bold"
                            style={{ color: 'var(--ysl-special)' }}
                          >
                            {formatZAR(pp)}
                          </motion.span>
                          {pct > 0 && <span className="chip chip-special !px-2 !py-0.5 !text-[9px]">-{pct}%</span>}
                          {grad && <span className="chip chip-gold !px-2 !py-0.5 !text-[9px]"><GraduationCap size={10} /> GRAD</span>}
                        </p>
                      </div>
                    </div>
                    {validWindow && (
                      <div className="flex items-center gap-2 px-3 pb-3">
                        <Timer size={12} style={{ color: 'var(--ysl-special)' }} />
                        <CountdownTimer endsAt={endsAtMs} variant="special" compact />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── active specials table ── */}
      <div className="mt-10">
        <SectionHeader title="Active specials" sub={`${active.length} live right now`} />
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ysl-line)' }}>
                {['Salon', 'Service', 'Discount', 'Window', 'Countdown', 'Source', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {active.map((sp) => {
                  const sl = getSalon(sp.salonId);
                  const sv = getService(sp.serviceId);
                  return (
                    <motion.tr
                      key={sp.id}
                      layout="position"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ borderBottom: '1px solid var(--ysl-line)' }}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <img src={sl?.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                          <span className="font-medium">{sl?.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="chip chip-lilac !normal-case !tracking-normal">{sv?.name}</span>
                        {sp.graduation && <span className="chip chip-gold ml-1.5 !text-[9px]"><GraduationCap size={10} /> GRAD</span>}
                      </td>
                      <td className="px-4 py-3 font-serif text-base font-bold" style={{ color: 'var(--ysl-special)' }}>{discountLabel(sp)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                        {formatDateTime(sp.startsAt)} → {formatDateTime(sp.endsAt)}
                      </td>
                      <td className="px-4 py-3"><CountdownTimer endsAt={sp.endsAt} variant="special" compact /></td>
                      <td className="px-4 py-3">
                        <span className="chip !text-[9px]" style={{ background: sp.createdBy === 'admin' ? 'var(--ysl-lilac)' : 'var(--ysl-special-soft)', color: sp.createdBy === 'admin' ? 'var(--ysl-purple)' : 'var(--ysl-special)' }}>
                          {sp.createdBy}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEndTarget(sp)} className="btn !border !px-3 !py-1.5 text-[10px]" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)', background: 'transparent' }}>
                          End early
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!active.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--ysl-muted)' }}>No live specials — create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── confirm activation modal ── */}
      <AdminModal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Activate this special?" wide>
        {salon && (
          <div>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              <strong style={{ color: 'var(--ysl-ink)' }}>{salon.name}</strong> · {kind === 'percent' ? `${numValue}% off` : `${formatZAR(numValue)} off`}
              {grad ? ' · flagged as a graduation special' : ''} · ends {formatDateTime(endsAtMs)}.
              {note && <> Note: “{note}”.</>}
            </p>
            <ul className="mt-4 space-y-2">
              {selectedServices.map((sv) => (
                <li key={sv.id} className="flex items-center justify-between gap-3 p-3 text-sm" style={{ background: 'var(--ysl-cream)', borderRadius: 'var(--radius-s)', border: '1px solid var(--ysl-line)' }}>
                  <span className="truncate">{sv.name}</span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZAR(sv.price)}</span>
                    <span className="font-serif font-bold" style={{ color: 'var(--ysl-special)' }}>{formatZAR(previewPrice(sv))}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Back</button>
              <button onClick={activate} className="btn btn-special flex-1 !py-3 text-[11px]">Go live now</button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* ── end early modal ── */}
      <AdminModal open={!!endTarget} onClose={() => setEndTarget(null)} title="End special early?">
        {endTarget && (
          <div>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              {getService(endTarget.serviceId)?.name} at {getSalon(endTarget.salonId)?.name} ({discountLabel(endTarget)}) will revert to full price everywhere, immediately.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setEndTarget(null)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Keep it live</button>
              <button
                onClick={() => { endSpecial(endTarget.id); setEndTarget(null); toast('Special ended', { description: 'Prices reverted site-wide.' }); }}
                className="btn flex-1 !py-3 text-[11px] text-white"
                style={{ background: 'var(--ysl-danger)' }}
              >
                End special
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* ── reject with note modal ── */}
      <AdminModal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject owner request">
        {rejectTarget && (
          <div>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              {getSalon(rejectTarget.salonId)?.name} · {getService(rejectTarget.serviceId)?.name} · {discountLabel(rejectTarget)}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Why is this being rejected? (sent to the owner via Brevo)"
              className="mt-4 w-full p-3 text-sm outline-none"
              style={{ background: 'var(--ysl-cream)', border: '1px solid var(--ysl-line)', borderRadius: 'var(--radius-s)', color: 'var(--ysl-ink)', resize: 'vertical' }}
            />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Cancel</button>
              <button onClick={rejectOwner} className="btn flex-1 !py-3 text-[11px] text-white" style={{ background: 'var(--ysl-danger)' }}>Reject request</button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

/** Step 1 — selectable salon store card. */
function StorePick({ salon, active, onPick }: { salon: Salon; active: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="card-surface group overflow-hidden text-left transition-all hover:-translate-y-1"
      style={active ? { outline: '2px solid var(--ysl-purple)', outlineOffset: 2, boxShadow: 'var(--glow-purple)' } : undefined}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={salon.cover} alt={salon.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        {!salon.approved && (
          <span className="chip chip-amber absolute left-2 top-2 !text-[8px]">Pending</span>
        )}
      </div>
      <div className="flex items-center gap-2.5 p-3">
        <img src={salon.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate font-serif text-[15px] font-semibold">{salon.name}</p>
          <p className="truncate text-[11px]" style={{ color: 'var(--ysl-muted)' }}>{salon.area}</p>
        </div>
      </div>
    </button>
  );
}

/** Step 2 — ServiceCard in admin-selectable mode (design.md §6.5). */
function SelectableServiceCard({ svc, checked, onToggle }: { svc: Service; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="card-surface flex items-center gap-3 p-3 text-left transition-all hover:-translate-y-0.5"
      style={checked ? { outline: '2px solid var(--ysl-purple)', outlineOffset: 1, boxShadow: 'var(--glow-purple)' } : undefined}
      aria-pressed={checked}
    >
      <img src={svc.image} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] font-semibold">{svc.name}</p>
        <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{svc.durationMin} min</p>
        <p className="font-serif text-lg font-bold">{formatZAR(svc.price)}</p>
      </div>
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all"
        style={{
          border: checked ? 'none' : '2px solid var(--ysl-line)',
          background: checked ? 'var(--ysl-purple)' : 'transparent',
        }}
      >
        <AnimatePresence>
          {checked && (
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
              <Check size={15} color="#fff" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
