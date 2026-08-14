/** T4 · Top 5 curation — live Bayesian leaderboard, recompute resort
 *  animation, gold pin (featured → EDITOR'S PICK), exclude-from-ranking. */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ExternalLink, EyeOff, Pin, RefreshCw, Undo2 } from 'lucide-react';
import { getLeaderboard, logAudit, setSalonApproved, updateSalon, useStoreState } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import { AdminModal, SectionHeader } from './shared';
import type { Salon } from '@/lib/store';

const RANK_COLORS = ['var(--ysl-gold)', 'var(--ysl-purple)', 'var(--ysl-purple)', 'var(--ysl-muted)', 'var(--ysl-muted)'];

export default function Top5Section() {
  const s = useStoreState();
  const [nonce, setNonce] = useState(0);
  const [excludeTarget, setExcludeTarget] = useState<Salon | null>(null);

  const board = useMemo(() => getLeaderboard(8), [s, nonce]);
  const featured = s.salons.filter((x) => x.featured);

  const recompute = () => {
    setNonce((n) => n + 1);
    toast.success('Rankings recomputed', { description: 'Bayesian scores recalculated from live reviews.' });
  };

  const togglePin = (sl: Salon) => {
    updateSalon(sl.id, { featured: !sl.featured });
    logAudit('admin', sl.featured ? 'top5-unpinned' : 'top5-pinned', sl.name);
    toast(sl.featured ? `${sl.name} unpinned` : `${sl.name} pinned as EDITOR'S PICK`, {
      description: sl.featured ? 'Feature-week chip removed.' : 'Gold chip appears on their card site-wide for the feature week.',
    });
  };

  const exclude = () => {
    if (!excludeTarget) return;
    setSalonApproved(excludeTarget.id, false);
    logAudit('admin', 'top5-excluded', `${excludeTarget.name} excluded from ranking (store suspended).`);
    toast.error(`${excludeTarget.name} excluded from the Top 5`, {
      description: 'Suspending a store also hides it from browse. Reinstate it from the Salons tab.',
    });
    setExcludeTarget(null);
  };

  return (
    <div>
      <SectionHeader
        title="Live leaderboard"
        sub="Bayesian score = avg × reviews/(reviews+10) + prior — the same ranking customers see on the home page."
        right={
          <button onClick={recompute} className="btn btn-ghost !px-5 !py-2.5 text-[11px]">
            <RefreshCw size={14} /> Recompute
          </button>
        }
      />

      {featured.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {featured.map((sl) => (
            <motion.span
              key={sl.id}
              initial={{ backgroundPosition: '200% 0' }}
              animate={{ backgroundPosition: '-20% 0' }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="chip !py-1.5"
              style={{
                background: 'linear-gradient(100deg, var(--ysl-gold) 30%, var(--ysl-gold-light) 50%, var(--ysl-gold) 70%)',
                backgroundSize: '220% 100%',
                color: 'var(--ysl-violet-deep)',
              }}
            >
              <Pin size={11} /> EDITOR'S PICK · {sl.name}
            </motion.span>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {board.map((e, i) => {
          const rankColor = RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)];
          const inTop5 = i < 5;
          return (
            <motion.div
              key={e.salon.id}
              layout
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              className="card-surface flex flex-wrap items-center gap-4 p-4"
              style={!inTop5 ? { opacity: 0.72 } : e.salon.featured ? { borderColor: 'var(--ysl-gold)' } : undefined}
            >
              {/* rank numeral */}
              <div className="relative grid w-16 shrink-0 place-items-center">
                {i < 3 && (
                  <img src="/laurel.svg" alt="" aria-hidden className="absolute inset-x-0 -top-1 w-16 opacity-70" />
                )}
                <motion.span
                  className="font-serif text-4xl font-bold leading-none"
                  style={{ color: rankColor }}
                  whileHover={{ scale: 1.05 }}
                >
                  {e.rank}
                </motion.span>
              </div>

              <img src={e.salon.avatar} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: '2px solid var(--ysl-lilac)' }} />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-lg font-semibold">{e.salon.name}</span>
                  {e.salon.featured && <span className="chip chip-gold !text-[8px]">EDITOR'S PICK</span>}
                  {i === 0 && <span className="chip chip-gold !text-[8px]">TOP 5 · #1</span>}
                </p>
                <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                  {e.salon.area} · score {e.score.toFixed(2)} · {e.count} reviews · Wilson-adjusted
                </p>
                {/* score bar */}
                <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full" style={{ background: 'var(--ysl-lilac)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--ysl-gold), var(--ysl-gold-light))' }}
                    initial={false}
                    animate={{ width: `${e.scorePct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-1 hidden font-serif text-sm font-bold sm:inline">
                  {(() => {
                    const prices = s.services.filter((sv) => sv.salonId === e.salon.id && sv.active).map((sv) => sv.price);
                    return prices.length ? `from ${formatZARShort(Math.min(...prices))}` : '—';
                  })()}
                </span>
                <button
                  onClick={() => togglePin(e.salon)}
                  aria-label={e.salon.featured ? 'Unpin salon' : 'Pin salon as editor pick'}
                  className="grid h-9 w-9 place-items-center rounded-full transition-all"
                  style={{
                    background: e.salon.featured ? 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))' : 'var(--ysl-lilac)',
                    color: e.salon.featured ? 'var(--ysl-violet-deep)' : 'var(--ysl-muted)',
                  }}
                >
                  <Pin size={15} />
                </button>
                <button
                  onClick={() => setExcludeTarget(e.salon)}
                  aria-label="Exclude from ranking"
                  className="grid h-9 w-9 place-items-center rounded-full transition-colors"
                  style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-danger)' }}
                >
                  <EyeOff size={15} />
                </button>
                <Link to={`/salon/${e.salon.slug}`} className="btn btn-ghost hidden !px-4 !py-2 text-[10px] md:inline-flex">
                  View store <ExternalLink size={12} />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        <Undo2 size={13} /> Hidden reviews and new customer reviews re-sort this board live — changes reflect on the home leaderboard immediately.
      </p>

      <AdminModal open={!!excludeTarget} onClose={() => setExcludeTarget(null)} title="Exclude from ranking?">
        {excludeTarget && (
          <div>
            <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
              <strong style={{ color: 'var(--ysl-ink)' }}>{excludeTarget.name}</strong> will be suspended — this removes it from the leaderboard,
              browse and search site-wide. You can reinstate it from the Salons tab.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setExcludeTarget(null)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Cancel</button>
              <button onClick={exclude} className="btn flex-1 !py-3 text-[11px] text-white" style={{ background: 'var(--ysl-danger)' }}>
                Exclude & suspend
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
