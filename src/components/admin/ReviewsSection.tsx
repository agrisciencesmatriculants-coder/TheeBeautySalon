/** T8 · Reviews moderation — hide / delete / restore with strikethrough wash.
 *  NOTE: the frozen store has no review-moderation API, so moderation is a
 *  demo-local flag + audit entries; aggregates stay as the store computes them. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, EyeOff, RotateCcw, Trash2 } from 'lucide-react';
import { getSalon, logAudit, useStoreState } from '@/lib/store';
import { timeAgo } from '@/lib/format';
import RatingStars from '@/components/RatingStars';
import { FilterPills } from './shared';

type Filter = 'all' | 'visible' | 'hidden';

export default function ReviewsSection() {
  const s = useStoreState();
  const [filter, setFilter] = useState<Filter>('all');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const reviews = s.reviews.filter((r) => !deleted.has(r.id));
  const filtered = reviews.filter((r) =>
    filter === 'all' ? true : filter === 'visible' ? !hidden.has(r.id) : hidden.has(r.id),
  );

  const hide = (id: string, salonName: string) => {
    setHidden((p) => new Set(p).add(id));
    logAudit('admin', 'review-hidden', `${salonName} review ${id}`);
    toast('Review hidden — Top 5 updated', { description: 'Excluded from the public salon page (demo-local flag).' });
  };
  const restore = (id: string) => {
    setHidden((p) => { const n = new Set(p); n.delete(id); return n; });
    setDeleted((p) => { const n = new Set(p); n.delete(id); return n; });
    logAudit('admin', 'review-restored', id);
    toast.success('Review restored');
  };
  const del = (id: string, salonName: string) => {
    setDeleted((p) => new Set(p).add(id));
    logAudit('admin', 'review-deleted', `${salonName} review ${id}`);
    toast.error('Review deleted', {
      description: 'Removed from every surface.',
      action: { label: 'Undo', onClick: () => restore(id) },
    });
  };

  return (
    <div>
      <FilterPills<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'All', count: reviews.length },
          { key: 'visible', label: 'Visible', count: reviews.filter((r) => !hidden.has(r.id)).length },
          { key: 'hidden', label: 'Hidden', count: hidden.size },
        ]}
      />

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {filtered.map((r, i) => {
            const isHidden = hidden.has(r.id);
            const salon = getSalon(r.salonId);
            const open = expanded === r.id;
            return (
              <motion.div
                key={r.id}
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="card-surface p-4"
                style={isHidden ? { opacity: 0.62, background: 'var(--ysl-lilac)' } : undefined}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{r.userName}</span>
                      <span style={{ color: 'var(--ysl-muted)' }}>→</span>
                      <span className="font-medium" style={{ color: 'var(--ysl-purple-deep)' }}>{salon?.name}</span>
                      <RatingStars rating={r.rating} size={12} showScore={false} />
                      <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(r.createdAt)}</span>
                      {r.verified && <span className="chip chip-success !px-2 !py-0.5 !text-[8px]">verified</span>}
                      {isHidden && <span className="chip chip-amber !px-2 !py-0.5 !text-[8px]">hidden</span>}
                    </p>
                    <p
                      className={`mt-1.5 text-sm leading-relaxed ${open ? '' : 'line-clamp-2'}`}
                      style={{ color: 'var(--ysl-ink)', textDecoration: isHidden ? 'line-through' : 'none', textDecorationColor: 'var(--ysl-amber)' }}
                    >
                      “{r.text}”
                    </p>
                    {r.serviceName && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--ysl-muted)' }}>Service: {r.serviceName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      aria-label="Expand review"
                      className="grid h-9 w-9 place-items-center rounded-full transition-transform"
                      style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)', transform: open ? 'rotate(180deg)' : 'none' }}
                    >
                      <ChevronDown size={15} />
                    </button>
                    {isHidden ? (
                      <button onClick={() => restore(r.id)} className="btn !border !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-success)', color: 'var(--ysl-success)', background: 'transparent' }}>
                        <RotateCcw size={12} /> Restore
                      </button>
                    ) : (
                      <button onClick={() => hide(r.id, salon?.name ?? '')} className="btn !px-4 !py-2 text-[10px]" style={{ background: 'var(--ysl-amber)', color: 'var(--ysl-violet-deep)' }}>
                        <EyeOff size={12} /> Hide
                      </button>
                    )}
                    <button onClick={() => del(r.id, salon?.name ?? '')} className="btn !border !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)', background: 'transparent' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!filtered.length && (
          <div className="card-surface p-10 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>No reviews in this view.</div>
        )}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        Hidden reviews are washed out and excluded from the leaderboard note; every moderation action lands in the audit log.
      </p>
    </div>
  );
}
