/** T9 · Audit log — mono-flavored append-only table with action chips and
 *  type filter; new entries prepend with a lilac flash. */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useStoreState } from '@/lib/store';
import { formatDateTime, timeAgo } from '@/lib/format';
import { FilterPills } from './shared';

function chipStyle(action: string): { bg: string; fg: string } {
  if (action.startsWith('special-created')) return { bg: 'var(--ysl-special-soft)', fg: 'var(--ysl-special)' };
  if (action.startsWith('special-approved')) return { bg: 'rgba(30,158,106,.12)', fg: 'var(--ysl-success)' };
  if (action.startsWith('special-rejected') || action.startsWith('salon-suspended') || action.startsWith('user-suspended') || action.startsWith('review-deleted'))
    return { bg: 'rgba(214,69,69,.1)', fg: 'var(--ysl-danger)' };
  if (action.startsWith('salon-approved') || action.startsWith('user-reinstated') || action.startsWith('review-restored'))
    return { bg: 'rgba(30,158,106,.12)', fg: 'var(--ysl-success)' };
  if (action.startsWith('bell-rung') || action.startsWith('grad-') || action.startsWith('top5-pinned') || action.startsWith('event-created'))
    return { bg: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', fg: 'var(--ysl-violet-deep)' };
  if (action.startsWith('payment-confirmed')) return { bg: 'var(--ysl-lilac)', fg: 'var(--ysl-purple-deep)' };
  if (action.startsWith('review-hidden') || action.startsWith('salon-changes-requested'))
    return { bg: 'rgba(232,161,58,.14)', fg: 'var(--ysl-amber)' };
  if (action.startsWith('admin-login') || action.startsWith('signup')) return { bg: 'var(--ysl-lilac)', fg: 'var(--ysl-purple)' };
  return { bg: 'var(--ysl-lilac)', fg: 'var(--ysl-muted)' };
}

export default function AuditSection() {
  const s = useStoreState();
  const [filter, setFilter] = useState<string>('all');

  const types = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of s.audit) {
      const key = a.action.split('-')[0] ?? a.action;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [s.audit]);

  const entries = s.audit.filter((a) => filter === 'all' || (a.action.split('-')[0] ?? a.action) === filter);

  return (
    <div>
      <FilterPills<string>
        value={filter}
        onChange={setFilter}
        options={[{ key: 'all', label: 'All', count: s.audit.length }, ...types.map(([k, n]) => ({ key: k, label: k, count: n }))]}
      />

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[760px] font-mono text-[12.5px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ysl-line)' }}>
              {['Timestamp', 'Actor', 'Action', 'Detail'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-sans text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map((a, i) => {
                const cs = chipStyle(a.action);
                return (
                  <motion.tr
                    key={a.id}
                    layout="position"
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.015, 0.2) }}
                    style={{ borderBottom: '1px solid var(--ysl-line)', background: i === 0 ? 'color-mix(in srgb, var(--ysl-lilac) 45%, var(--ysl-surface))' : undefined }}
                  >
                    <td className="whitespace-nowrap px-4 py-3" title={formatDateTime(a.createdAt)} style={{ color: 'var(--ysl-muted)' }}>
                      {formatDateTime(a.createdAt)}
                      <span className="ml-2 font-sans text-[10px] uppercase" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(a.createdAt)}</span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3">{a.actor}</td>
                    <td className="px-4 py-3">
                      <span className="chip !font-sans !text-[9px]" style={{ background: cs.bg, color: cs.fg }}>{a.action}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-[13px]" style={{ color: 'var(--ysl-ink)' }}>{a.detail}</td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!entries.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center font-sans" style={{ color: 'var(--ysl-muted)' }}>No entries of this type yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        <Lock size={12} /> Append-only — audit entries cannot be edited or deleted.
      </p>
    </div>
  );
}
