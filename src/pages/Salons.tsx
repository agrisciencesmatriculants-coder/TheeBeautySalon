import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDot, LayoutGrid, Rows3, Search, SlidersHorizontal, Tag, Award, X } from 'lucide-react';
import {
  useStoreState, CATEGORIES, AREAS, getSalonRating, getLeaderboard, isOpenNow, fromPrice,
  getServicesBySalon, getSpecialsBySalon, isSpecialLive, getActiveSpecials, getService, getSalon, getDiscountedPrice,
} from '@/lib/store';
import type { CategoryKey, Salon } from '@/lib/store';
import SalonCard from '@/components/SalonCard';
import SalonListCard from '@/components/marketplace/SalonListCard';
import SpecialsSpotlight from '@/components/marketplace/SpecialsSpotlight';
import type { SpotlightItem } from '@/components/marketplace/SpecialsSpotlight';
import MapLite from '@/components/marketplace/MapLite';
import { scanReveals } from '@/hooks/useReveal';

/** Browse Salons — /salons (browse.md). Search/filter/sort directory with URL-param state. */

type SortKey = 'top' | 'nearest' | 'price' | 'reviews';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'top', label: 'Top rated' },
  { key: 'nearest', label: 'Nearest' },
  { key: 'price', label: 'Price: low → high' },
  { key: 'reviews', label: 'Most reviewed' },
];

export default function Salons() {
  const state = useStoreState();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const q = params.get('q') ?? '';
  const category = (params.get('category') ?? '') as '' | CategoryKey;
  const area = params.get('area') ?? '';
  const specialsOnly = params.get('specials') === '1';
  const openOnly = params.get('open') === '1';
  const top5Only = params.get('top5') === '1';
  const sort = (params.get('sort') as SortKey) || 'top';
  const view = params.get('view') === 'list' ? 'list' : 'grid';

  // debounced search input (300ms) synced into the URL
  const [qInput, setQInput] = useState(q);
  const debounceRef = useRef<number | null>(null);
  useEffect(() => setQInput(q), [q]);
  const onSearch = (v: string) => {
    setQInput(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => patchParams({ q: v || null }), 300);
  };

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  }

  const leaderboard = useMemo(() => getLeaderboard(5), [state]);
  const top5Ids = useMemo(() => new Set(leaderboard.map((e) => e.salon.id)), [leaderboard]);

  const hasLiveSpecial = (salonId: string) => getSpecialsBySalon(salonId).some((sp) => isSpecialLive(sp));

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = state.salons.filter((s) => s.approved);

    if (query) {
      list = list.filter((s) => {
        const inSalon =
          s.name.toLowerCase().includes(query) ||
          s.area.toLowerCase().includes(query) ||
          s.blurb.toLowerCase().includes(query);
        const inServices = getServicesBySalon(s.id).some((sv) => sv.name.toLowerCase().includes(query));
        return inSalon || inServices;
      });
    }
    if (category) list = list.filter((s) => s.categories.includes(category));
    if (area) list = list.filter((s) => s.area === area);
    if (specialsOnly) list = list.filter((s) => hasLiveSpecial(s.id));
    if (openOnly) list = list.filter((s) => isOpenNow(s));
    if (top5Only) list = list.filter((s) => top5Ids.has(s.id));

    const priceOf = (s: Salon) => fromPrice(s.id) ?? Number.MAX_SAFE_INTEGER;
    switch (sort) {
      case 'nearest':
        list = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
        break;
      case 'price':
        list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'reviews':
        list = [...list].sort((a, b) => getSalonRating(b.id).count - getSalonRating(a.id).count);
        break;
      default:
        list = [...list].sort((a, b) => getSalonRating(b.id).bayes - getSalonRating(a.id).bayes);
    }
    return list;
  }, [state, q, category, area, specialsOnly, openOnly, top5Only, sort, top5Ids]);

  // specials spotlight items (up to 3, shown mid-grid when not already filtering specials)
  const spotlight: SpotlightItem[] = useMemo(() => {
    if (specialsOnly) return [];
    return getActiveSpecials()
      .sort((a, b) => a.endsAt - b.endsAt)
      .map((sp) => {
        const service = getService(sp.serviceId);
        const salon = getSalon(sp.salonId);
        if (!service || !salon || !salon.approved) return null;
        const p = getDiscountedPrice(sp.serviceId);
        return { special: sp, service, salon, price: p.price, original: p.original };
      })
      .filter((x): x is SpotlightItem => x !== null)
      .slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, specialsOnly]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (q) activeFilters.push({ key: 'q', label: `“${q}”`, clear: () => patchParams({ q: null }) });
  if (category) {
    const c = CATEGORIES.find((x) => x.key === category);
    activeFilters.push({ key: 'cat', label: c?.label ?? category, clear: () => patchParams({ category: null }) });
  }
  if (area) activeFilters.push({ key: 'area', label: area, clear: () => patchParams({ area: null }) });
  if (specialsOnly) activeFilters.push({ key: 'specials', label: 'Specials only', clear: () => patchParams({ specials: null }) });
  if (openOnly) activeFilters.push({ key: 'open', label: 'Open now', clear: () => patchParams({ open: null }) });
  if (top5Only) activeFilters.push({ key: 'top5', label: 'Top 5', clear: () => patchParams({ top5: null }) });

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  useEffect(() => { scanReveals(); }, [results.length]);

  /* ── shared filter controls (desktop bar + mobile drawer) ── */
  const filterControls = (
    <>
      {/* category chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!category} onClick={() => patchParams({ category: null })}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} active={category === c.key} onClick={() => patchParams({ category: category === c.key ? null : c.key })}>
            <img src={c.icon} alt="" className="h-4 w-4" style={category === c.key ? { filter: 'invert(1)' } : undefined} />
            {c.label}
          </Chip>
        ))}
      </div>
      {/* toggle chips + area */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={openOnly} onClick={() => patchParams({ open: openOnly ? null : '1' })}
          activeStyle={{ background: 'var(--ysl-success)', color: '#fff' }}>
          <CircleDot size={14} /> Open now
        </Chip>
        <Chip active={specialsOnly} onClick={() => patchParams({ specials: specialsOnly ? null : '1' })}
          activeStyle={{ background: 'var(--ysl-special)', color: '#fff' }}>
          <Tag size={14} /> Specials only
        </Chip>
        <Chip active={top5Only} onClick={() => patchParams({ top5: top5Only ? null : '1' })}
          activeStyle={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', color: 'var(--ysl-violet-deep)' }}>
          <Award size={14} /> Top 5
        </Chip>
        <select
          value={area}
          onChange={(e) => patchParams({ area: e.target.value || null })}
          className="rounded-pill border px-4 py-2 text-[13px] font-medium outline-none hairline"
          style={{ background: 'var(--ysl-surface)', color: 'var(--ysl-ink)' }}
          aria-label="Filter by area"
        >
          <option value="">All areas</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </>
  );

  return (
    <div>
      {/* ── S1 · page header ── */}
      <section className="container-ysl py-16 sm:py-20">
        <p className="eyebrow reveal">The directory</p>
        <h1 className="display-2 reveal delay-1 mt-5">
          Every student salon in <em style={{ color: 'var(--ysl-purple)' }}>Grahamstown</em>
        </h1>
        <p className="lead reveal delay-2 mt-4">
          Approved student businesses only. Real schedules, honest ZAR prices, verified reviews.
        </p>
      </section>

      {/* ── S2 · sticky search & filter bar ── */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-16 z-40 border-b hairline"
        style={{ background: 'color-mix(in srgb, var(--ysl-cream) 88%, transparent)', backdropFilter: 'blur(14px)' }}
      >
        <div className="container-ysl py-3">
          {/* row 1: search + sort + mobile filters button */}
          <div className="flex items-center gap-3">
            <label
              className="flex flex-1 items-center gap-2.5 rounded-pill border px-4 py-2.5 transition-shadow focus-within:border-ysl-purple hairline"
              style={{ background: 'var(--ysl-surface)', maxWidth: 460 }}
            >
              <Search size={16} style={{ color: 'var(--ysl-muted)' }} />
              <input
                value={qInput}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search salons or services…"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--ysl-ink)' }}
              />
              {qInput && (
                <button aria-label="Clear search" onClick={() => onSearch('')}>
                  <X size={14} style={{ color: 'var(--ysl-muted)' }} />
                </button>
              )}
            </label>

            <select
              value={sort}
              onChange={(e) => patchParams({ sort: e.target.value === 'top' ? null : e.target.value })}
              className="hidden rounded-pill border px-4 py-2.5 text-[13px] font-medium outline-none hairline sm:block"
              style={{ background: 'var(--ysl-surface)', color: 'var(--ysl-ink)' }}
              aria-label="Sort salons"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <button
              onClick={() => setDrawerOpen(true)}
              className="btn btn-ghost relative !px-4 !py-2.5 text-[11px] lg:hidden"
            >
              <SlidersHorizontal size={15} /> Filters
              {activeFilters.length > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'var(--ysl-purple)' }}
                >
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* row 2 (desktop) */}
          <div className="mt-3 hidden flex-col gap-2.5 lg:flex">{filterControls}</div>
        </div>
      </motion.div>

      {/* mobile filters drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] lg:hidden"
              style={{ background: 'rgba(20,8,32,.55)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed left-0 top-0 z-[80] h-full w-[85%] max-w-sm overflow-y-auto p-6 lg:hidden"
              style={{ background: 'var(--ysl-surface)' }}
            >
              <div className="flex items-center justify-between">
                <p className="eyebrow">Filters</p>
                <button aria-label="Close filters" onClick={() => setDrawerOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-ysl-lilac">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-6 flex flex-col gap-5">
                <select
                  value={sort}
                  onChange={(e) => patchParams({ sort: e.target.value === 'top' ? null : e.target.value })}
                  className="rounded-pill border px-4 py-2.5 text-[13px] font-medium outline-none hairline"
                  style={{ background: 'var(--ysl-surface)', color: 'var(--ysl-ink)' }}
                  aria-label="Sort salons"
                >
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                {filterControls}
                {activeFilters.length > 0 && (
                  <button onClick={() => { clearAll(); setDrawerOpen(false); }} className="btn btn-ghost w-full">
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── S3 · results meta row ── */}
      <section className="container-ysl flex flex-wrap items-center justify-between gap-4 pb-6 pt-10">
        <div className="flex flex-wrap items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.h2
              key={results.length}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="font-serif text-2xl font-semibold"
            >
              {results.length} salon{results.length === 1 ? '' : 's'}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence>
            {activeFilters.map((f) => (
              <motion.button
                key={f.key}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={f.clear}
                className="chip chip-lilac gap-1.5"
                style={{ padding: '6px 12px' }}
              >
                {f.label} <X size={12} />
              </motion.button>
            ))}
          </AnimatePresence>
          {activeFilters.length > 1 && (
            <button onClick={clearAll} className="text-[12px] font-medium uppercase tracking-[.14em] underline underline-offset-4"
              style={{ color: 'var(--ysl-purple)' }}>
              Clear all
            </button>
          )}
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-1 rounded-pill border p-1 hairline" style={{ background: 'var(--ysl-surface)' }}>
          {([
            { v: 'grid' as const, icon: <LayoutGrid size={15} /> },
            { v: 'list' as const, icon: <Rows3 size={15} /> },
          ]).map(({ v, icon }) => (
            <button
              key={v}
              aria-label={`${v} view`}
              onClick={() => patchParams({ view: v === 'grid' ? null : 'list' })}
              className="grid h-8 w-9 place-items-center rounded-pill transition-colors"
              style={view === v ? { background: 'var(--ysl-purple)', color: '#fff' } : { color: 'var(--ysl-muted)' }}
            >
              {icon}
            </button>
          ))}
        </div>
      </section>

      {/* ── S4 · salon grid / list ── */}
      <section className="container-ysl pb-16">
        {results.length === 0 ? (
          <div className="card-surface mx-auto max-w-md p-10 text-center">
            <img src="/empty-bookings.svg" alt="" className="mx-auto w-56" />
            <h3 className="mt-4 font-serif text-2xl font-semibold">No salons match</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>Try clearing a filter or two.</p>
            <button onClick={clearAll} className="btn btn-ghost mt-6">Clear filters</button>
          </div>
        ) : view === 'grid' ? (
          <motion.div layout className="grid gap-[26px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            <AnimatePresence mode="popLayout">
              {results.slice(0, 4).map((salon, i) => (
                <GridItem key={salon.id} salon={salon} index={i} sort={sort} />
              ))}
              {spotlight.length > 0 && results.length > 4 && (
                <SpecialsSpotlight key="spotlight" items={spotlight} />
              )}
              {results.slice(4).map((salon, i) => (
                <GridItem key={salon.id} salon={salon} index={i + 4} sort={sort} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div layout className="flex flex-col gap-5">
            <AnimatePresence mode="popLayout">
              {results.map((salon, i) => (
                <motion.div
                  key={salon.id}
                  layout
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.05 }}
                >
                  <SalonListCard salon={salon} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── S6 · map-lite strip ── */}
      <section className="container-ysl pb-24">
        <div className="reveal">
          <p className="eyebrow">Around town</p>
          <h2 className="display-2 mt-4 !text-[clamp(1.8rem,3.4vw,2.6rem)]">
            Find them on the <em style={{ color: 'var(--ysl-purple)' }}>map</em>
          </h2>
        </div>
        <div className="mt-8">
          <MapLite salons={results} activeArea={area} onArea={(a) => patchParams({ area: a || null })} />
        </div>
      </section>
    </div>
  );
}

/* ── grid item wrapper with layout animation ── */
function GridItem({ salon, index, sort }: { salon: Salon; index: number; sort: SortKey }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.06 }}
      className="relative"
    >
      {sort === 'nearest' && (
        <span className="chip chip-lilac absolute -top-2.5 right-3 z-10 shadow-ysl-sm">
          {salon.distanceKm.toFixed(1)} km from campus
        </span>
      )}
      <SalonCard salon={salon} className="h-full" />
    </motion.div>
  );
}

/* ── toggle chip ── */
function Chip({
  active, onClick, children, activeStyle,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeStyle?: React.CSSProperties;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[13px] font-medium transition-colors hairline"
      style={
        active
          ? { border: '1px solid transparent', background: 'var(--ysl-purple)', color: '#fff', ...activeStyle }
          : { background: 'var(--ysl-surface)', color: 'var(--ysl-ink)' }
      }
    >
      {children}
    </motion.button>
  );
}
