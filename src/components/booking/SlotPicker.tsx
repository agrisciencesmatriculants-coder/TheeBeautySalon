/** SlotPicker — 14-day date strip + 30-min slot grid from the salon's weekly
 *  schedule (booking.md Stage 1). Slots are fitted to service duration. */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Salon, Service } from '@/lib/store';
import { dayKeyOf, isSlotAvailable, todayIso, DAY_SHORT } from '@/lib/store';

export interface SlotSelection {
  date: string;
  time: string;
}

interface DayInfo {
  iso: string;
  dow: string;
  num: number;
  isToday: boolean;
  closed: boolean;
  full: boolean;
}

interface SlotInfo {
  time: string;
  taken: boolean;
  past: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function isoOfOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slotsFor(salon: Salon, service: Service, iso: string): SlotInfo[] {
  const day = salon.schedule[dayKeyOf(iso)];
  if (!day.open) return [];
  const [sh, sm] = day.start.split(':').map(Number);
  const [eh, em] = day.end.split(':').map(Number);
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  const isToday = iso === todayIso();
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes() + 15; // 15-min lead time
  const out: SlotInfo[] = [];
  for (let t = startM; t + service.durationMin <= endM; t += 30) {
    const time = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    out.push({
      time,
      past: isToday && t <= nowM,
      taken: !isSlotAvailable(salon.id, iso, time),
    });
  }
  return out;
}

interface Props {
  salon: Salon;
  service: Service;
  selected: SlotSelection | null;
  onSelect: (sel: SlotSelection) => void;
}

export default function SlotPicker({ salon, service, selected, onSelect }: Props) {
  const days = useMemo<DayInfo[]>(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const iso = isoOfOffset(i);
      const d = new Date(iso + 'T12:00:00');
      const sched = salon.schedule[dayKeyOf(iso)];
      const slots = slotsFor(salon, service, iso);
      const free = slots.filter((s) => !s.taken && !s.past).length;
      return {
        iso,
        dow: DAY_SHORT[dayKeyOf(iso)],
        num: d.getDate(),
        isToday: i === 0,
        closed: !sched.open,
        full: sched.open && free === 0,
      };
    });
  }, [salon, service]);

  const activeDate = selected?.date ?? days.find((d) => !d.closed && !d.full)?.iso ?? days[0].iso;
  const slots = useMemo(() => slotsFor(salon, service, activeDate), [salon, service, activeDate]);

  return (
    <div>
      {/* date strip */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Pick a date">
        {days.map((d, i) => {
          const active = d.iso === activeDate;
          const disabled = d.closed || d.full;
          return (
            <motion.button
              key={d.iso}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
              disabled={disabled}
              onClick={() => onSelect({ date: d.iso, time: '' })}
              className="flex w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-ysl-m px-2 py-3 transition-all"
              style={{
                border: active ? '1px solid var(--ysl-purple)' : '1px solid var(--ysl-line)',
                background: active ? 'var(--ysl-lilac)' : 'var(--ysl-surface)',
                boxShadow: active ? 'var(--glow-purple)' : 'none',
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              aria-selected={active}
            >
              <span className="text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: active ? 'var(--ysl-purple)' : 'var(--ysl-muted)' }}>
                {d.isToday ? 'Today' : d.dow}
              </span>
              <span className="font-serif text-xl font-semibold leading-none">{d.num}</span>
              <span className="text-[9px] uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>
                {d.closed ? 'Closed' : d.full ? 'Full' : ''}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* slot grid */}
      <div key={activeDate} className="mt-5">
        {slots.length === 0 ? (
          <p className="rounded-ysl-m p-5 text-center text-sm" style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-muted)' }}>
            {salon.schedule[dayKeyOf(activeDate)].open ? 'No slots left this day — try another date.' : 'The salon is closed on this day.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s, i) => {
              const taken = s.taken || s.past;
              const active = selected?.date === activeDate && selected.time === s.time;
              return (
                <motion.button
                  key={s.time}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, scale: active ? 1.08 : 1 }}
                  transition={{ delay: i * 0.03, duration: 0.35, type: 'spring', stiffness: 300, damping: 22 }}
                  disabled={taken}
                  onClick={() => onSelect({ date: activeDate, time: s.time })}
                  className="rounded-ysl-s px-2 py-2.5 font-mono text-sm font-medium transition-colors"
                  style={{
                    border: active ? '1px solid var(--ysl-purple)' : '1px solid var(--ysl-line)',
                    background: active ? 'var(--ysl-purple)' : 'var(--ysl-surface)',
                    color: active ? '#fff' : taken ? 'var(--ysl-muted)' : 'var(--ysl-ink)',
                    boxShadow: active ? 'var(--glow-purple)' : 'none',
                    textDecoration: taken ? 'line-through' : 'none',
                    opacity: taken ? 0.5 : 1,
                    cursor: taken ? 'not-allowed' : 'pointer',
                  }}
                  aria-pressed={active}
                >
                  {s.time}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] uppercase tracking-[.12em]" style={{ color: 'var(--ysl-muted)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ border: '1px solid var(--ysl-line)', background: 'var(--ysl-surface)' }} /> available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--ysl-purple)' }} /> selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--ysl-line)' }} /> taken
        </span>
      </div>
    </div>
  );
}
