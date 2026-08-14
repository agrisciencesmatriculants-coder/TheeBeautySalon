import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import type { Salon, DayKey, DaySchedule } from '@/lib/store';
import { updateSalon, DAY_KEYS, DAY_LABELS } from '@/lib/store';
import { Toggle, TabHeader } from '@/components/dash/ui';

/** T3 · Weekly schedule (dashboard.md): 7 day-rows with open/closed toggle +
 *  open–close time pickers, copy-Monday quick action. Changes save instantly
 *  (the public slot picker reads the same schedule). */

export default function ScheduleTab({ salon }: { salon: Salon }) {
  const setDay = (key: DayKey, patch: Partial<DaySchedule>) => {
    updateSalon(salon.id, { schedule: { ...salon.schedule, [key]: { ...salon.schedule[key], ...patch } } });
  };

  const copyMonday = () => {
    const mon = salon.schedule.mon;
    const next = { ...salon.schedule };
    DAY_KEYS.forEach((k) => { if (k !== 'mon') next[k] = { ...mon }; });
    updateSalon(salon.id, { schedule: next });
    toast.success("Monday's hours copied to every day ✓");
  };

  return (
    <div>
      <TabHeader
        title="Weekly schedule"
        note="Customers book slots inside these hours, fitted to each service's duration."
        action={<button onClick={copyMonday} className="btn btn-ghost !px-5 !py-2.5 text-[11px]"><Copy size={13} /> Copy Monday to all</button>}
      />

      <div className="card-surface overflow-hidden">
        {DAY_KEYS.map((key, i) => {
          const day = salon.schedule[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b px-5 py-4 last:border-0 hairline"
            >
              <span className="w-28 font-serif text-lg font-semibold">{DAY_LABELS[key]}</span>

              <div className="flex items-center gap-2.5">
                <Toggle on={day.open} onChange={(v) => { setDay(key, { open: v }); toast.success(v ? `${DAY_LABELS[key]} opened — live ✓` : `${DAY_LABELS[key]} marked closed.`); }}
                  label={`${DAY_LABELS[key]} open`} />
                <span className="text-xs font-medium uppercase tracking-[.12em]"
                  style={{ color: day.open ? 'var(--ysl-success)' : 'var(--ysl-muted)' }}>
                  {day.open ? 'Open' : 'Closed'}
                </span>
              </div>

              <motion.div
                initial={false}
                animate={{ height: day.open ? 'auto' : 0, opacity: day.open ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="overflow-hidden"
              >
                {day.open && (
                  <div className="flex items-center gap-2 pl-1">
                    <input
                      type="time"
                      value={day.start}
                      onChange={(e) => setDay(key, { start: e.target.value })}
                      className="rounded-[var(--radius-s)] border px-3 py-1.5 text-sm outline-none focus:border-ysl-purple"
                      style={{ background: 'var(--ysl-cream)', borderColor: 'var(--ysl-line)', color: 'var(--ysl-ink)' }}
                      aria-label={`${DAY_LABELS[key]} opens`}
                    />
                    <span className="text-sm" style={{ color: 'var(--ysl-muted)' }}>–</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={(e) => setDay(key, { end: e.target.value })}
                      className="rounded-[var(--radius-s)] border px-3 py-1.5 text-sm outline-none focus:border-ysl-purple"
                      style={{ background: 'var(--ysl-cream)', borderColor: 'var(--ysl-line)', color: 'var(--ysl-ink)' }}
                      aria-label={`${DAY_LABELS[key]} closes`}
                    />
                  </div>
                )}
              </motion.div>

              <span className="ml-auto hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[.14em] sm:flex"
                style={{ color: 'var(--ysl-success)' }}>
                <Check size={13} /> Live on your store
              </span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
        Tip: students book most on Thursday–Saturday. Blackout dates (exam weeks, res closing)
        arrive with the real backend — for now, just toggle a day closed ahead of time.
      </p>
    </div>
  );
}
