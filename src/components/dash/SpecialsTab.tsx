import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles, GraduationCap, Check, Plus } from 'lucide-react';
import type { Salon, Special } from '@/lib/store';
import {
  useStoreState, createSpecial, endSpecial, getService, getServicesBySalon,
  isSpecialLive, getNextGraduation, daysUntil,
} from '@/lib/store';
import { formatZAR, formatDateTime } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import { Drawer, Toggle, TabHeader, DashField, dashInputCls, dashInputStyle, EmptyState } from '@/components/dash/ui';

/** T5 · My specials (dashboard.md): request time-limited discounts on own
 *  service cards → pending admin approval. Live ones show countdown. */

function statusOf(sp: Special): { label: string; cls: string } {
  if (sp.status === 'pending') return { label: 'Pending approval', cls: 'chip-amber' };
  if (sp.status === 'rejected') return { label: 'Rejected', cls: 'chip-special' };
  if (sp.status === 'expired') return { label: 'Ended', cls: 'chip' };
  if (isSpecialLive(sp)) return { label: 'Live', cls: 'chip-special' };
  return { label: 'Scheduled', cls: 'chip-lilac' };
}

function previewPrice(price: number, kind: 'percent' | 'amount', value: number): number {
  const v = kind === 'percent' ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(v));
}

export default function SpecialsTab({ salon }: { salon: Salon }) {
  const state = useStoreState();
  const specials = useMemo(
    () => state.specials.filter((sp) => sp.salonId === salon.id).sort((a, b) => b.createdAt - a.createdAt),
    [state, salon.id],
  );
  const services = getServicesBySalon(salon.id);

  const grad = getNextGraduation();
  const gradDays = grad ? daysUntil(grad.date) : null;
  const gradSeason = !!grad && gradDays !== null && gradDays >= 0 && (grad.bellRung || gradDays <= 14);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState(20);
  const [days, setDaysLength] = useState(3);
  const [isGrad, setIsGrad] = useState(false);

  const openDrawer = (gradPreset = false) => {
    setSelected([]);
    setKind('percent');
    setValue(20);
    setDaysLength(3);
    setIsGrad(gradPreset && gradSeason);
    setDrawerOpen(true);
  };

  const toggleService = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    if (!selected.length) { toast.error('Select at least one service card.'); return; }
    if (value <= 0 || (kind === 'percent' && value >= 100)) { toast.error('Enter a sensible discount value.'); return; }
    const endsAt = Date.now() + days * 86400000;
    selected.forEach((serviceId) => {
      createSpecial({ serviceId, salonId: salon.id, kind, value, endsAt, graduation: isGrad, createdBy: 'owner' });
    });
    toast.success(`Special request sent — the YSL admin will review ${selected.length > 1 ? `these ${selected.length} specials` : 'it'} shortly.`);
    setDrawerOpen(false);
  };

  return (
    <div>
      <TabHeader
        title="My specials"
        note="Specials are time-limited discounts you request — the YSL admin approves them, then they appear everywhere with a countdown."
        action={<button onClick={() => openDrawer(false)} className="btn btn-gold !px-5 !py-2.5 text-[11px]"><Plus size={14} /> Request a special</button>}
      />

      {/* graduation prompt */}
      {gradSeason && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface mb-8 flex flex-wrap items-center gap-4 border p-5"
          style={{ borderColor: 'var(--ysl-gold)', background: 'linear-gradient(135deg, var(--ysl-lilac), var(--ysl-surface))' }}
        >
          <img src="/grad-cap.svg" alt="" className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-semibold">
              Graduation is in {gradDays} day{gradDays === 1 ? '' : 's'} — the bell {grad?.bellRung ? 'has rung' : 'season is near'}!
            </p>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              Graduation specials get the gold GRAD SPECIAL badge and a feature on the graduation page.
            </p>
          </div>
          <button onClick={() => openDrawer(true)} className="btn btn-gold !py-2.5 text-[11px]">
            <GraduationCap size={14} /> Create grad special
          </button>
        </motion.div>
      )}

      {/* specials list */}
      {specials.length === 0 ? (
        <div className="card-surface">
          <EmptyState title="No specials yet" note="Request your first special — approved specials appear on your store with a live countdown."
            action={<button onClick={() => openDrawer(false)} className="btn btn-gold !py-2.5 text-[11px]"><Sparkles size={14} /> Request a special</button>} />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {specials.map((sp, i) => {
            const svc = getService(sp.serviceId);
            const st = statusOf(sp);
            const live = isSpecialLive(sp);
            return (
              <motion.div
                key={sp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="card-surface p-5"
                style={live ? { borderTop: '2px dashed var(--ysl-special)', background: 'linear-gradient(180deg, var(--ysl-special-soft), var(--ysl-surface) 45%)' } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-xl font-semibold">{svc?.name ?? 'Service'}</p>
                    <p className="mt-0.5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                      {sp.kind === 'percent' ? `${sp.value}% off` : `${formatZAR(sp.value)} off`}
                      {sp.graduation && <span className="chip chip-gold ml-2 !py-0.5 !text-[9px]"><GraduationCap size={11} /> Grad</span>}
                    </p>
                  </div>
                  <span className={`chip ${st.cls}`}>{st.label}</span>
                </div>

                {svc && (
                  <p className="mt-3 font-serif text-lg">
                    <span className="line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZAR(svc.price)}</span>
                    <span className="ml-2 font-bold" style={{ color: 'var(--ysl-special)' }}>
                      {formatZAR(previewPrice(svc.price, sp.kind, sp.value))}
                    </span>
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                  <span>Ends {formatDateTime(sp.endsAt)}</span>
                  {live && <CountdownTimer endsAt={sp.endsAt} variant="special" label="Ends in" compact />}
                  {sp.status === 'pending' && (
                    <button
                      onClick={() => { endSpecial(sp.id); toast.success('Request withdrawn.'); }}
                      className="font-medium underline"
                      style={{ color: 'var(--ysl-danger)' }}
                    >
                      Withdraw request
                    </button>
                  )}
                </div>
                {live && <p className="mt-2 text-[11px] uppercase tracking-[.14em]" style={{ color: 'var(--ysl-success)' }}>✓ As seen on your store</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* request drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Request a special" width={520}>
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              1 · Select service cards
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className="relative rounded-[var(--radius-m)] border p-4 text-left transition-all"
                    style={on
                      ? { borderColor: 'var(--ysl-purple)', boxShadow: '0 0 0 2px var(--ysl-purple)', background: 'var(--ysl-lilac)' }
                      : { borderColor: 'var(--ysl-line)', background: 'var(--ysl-surface)' }}
                  >
                    {on && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full"
                        style={{ background: 'var(--ysl-purple)', color: '#fff' }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </motion.span>
                    )}
                    <p className="pr-7 font-serif text-base font-semibold leading-tight">{s.name}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                      {s.durationMin} min · {formatZAR(s.price)}
                    </p>
                    {on && value > 0 && (
                      <p className="mt-2 font-serif text-sm">
                        <span className="line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZAR(s.price)}</span>
                        <span className="ml-1.5 font-bold" style={{ color: 'var(--ysl-special)' }}>
                          {formatZAR(previewPrice(s.price, kind, value))}
                        </span>
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              2 · Discount
            </p>
            <div className="flex gap-2">
              {(['percent', 'amount'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className="chip transition-all"
                  style={kind === k
                    ? { background: 'var(--ysl-special)', color: '#fff' }
                    : { background: 'var(--ysl-special-soft)', color: 'var(--ysl-special)' }}>
                  {k === 'percent' ? '% off' : 'R off'}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <DashField label={kind === 'percent' ? 'Percent off (%)' : 'Rand off (R)'}>
                <input
                  type="number" min={1} max={kind === 'percent' ? 90 : undefined}
                  value={value || ''}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className={dashInputCls} style={dashInputStyle}
                />
              </DashField>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              3 · How long should it run?
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 5, 7].map((d) => (
                <button key={d} type="button" onClick={() => setDaysLength(d)}
                  className="chip transition-all"
                  style={days === d
                    ? { background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }
                    : { background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)' }}>
                  {d} day{d === 1 ? '' : 's'}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-between rounded-[var(--radius-s)] border px-4 py-3"
            style={{ borderColor: gradSeason ? 'var(--ysl-gold)' : 'var(--ysl-line)', opacity: gradSeason ? 1 : 0.55 }}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap size={16} style={{ color: 'var(--ysl-gold)' }} />
              Graduation special
              {!gradSeason && <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>(only during grad season)</span>}
            </span>
            <Toggle on={isGrad && gradSeason} onChange={(v) => gradSeason && setIsGrad(v)} label="Graduation special" />
          </div>

          <button onClick={submit} className="btn btn-special w-full">
            <Sparkles size={15} /> Submit for approval
          </button>
          <p className="text-center text-xs" style={{ color: 'var(--ysl-muted)' }}>
            Requests go to the YSL admin as <span className="chip chip-amber !py-0.5 !text-[9px]">Pending approval</span> — usually reviewed same day.
          </p>
        </div>
      </Drawer>
    </div>
  );
}
