import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Clock, Flame, Heart, MapPin, Quote, Share2, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useStoreState, getSalonBySlug, getServicesBySalon, getDiscountedPrice, getSpecialsBySalon,
  isSpecialLive, getLeaderboard, isOpenNow, openCaption, getReviewsBySalon, getSalonRating,
  toggleFavourite, getCurrentUser, addReview, getBookingsByUser,
  CATEGORIES, DAY_KEYS, DAY_LABELS,
} from '@/lib/store';
import type { CategoryKey, Review, Salon } from '@/lib/store';
import { formatZARShort, formatDateShort, timeAgo } from '@/lib/format';
import SalonCard from '@/components/SalonCard';
import RatingStars from '@/components/RatingStars';
import CountdownTimer from '@/components/CountdownTimer';
import ServiceCard from '@/components/marketplace/ServiceCard';
import type { ServicePricing } from '@/components/marketplace/ServiceCard';
import GalleryGrid from '@/components/marketplace/GalleryGrid';
import type { GalleryItem } from '@/components/marketplace/GalleryGrid';
import { scanReveals } from '@/hooks/useReveal';

/** Salon Store — /salon/:slug (salon.md). */

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** ~ walking minutes from campus at a student pace. */
function walkMinutes(km: number): number {
  return Math.max(2, Math.round(km * 12));
}

/** Deterministic demo owner replies (store has no reply field — derived, pure). */
const REPLY_POOL = [
  'Thank you so much — clients like you make the long hours worth it. See you at your next appointment!',
  'This made my whole week. Thank you for trusting a student business with your look!',
  'So glad you loved it! Tell your res friends — word of mouth keeps this little salon going.',
  'Thank you! I pour my heart into every appointment. Cannot wait to have you back in the chair.',
];
function ownerReplyFor(review: Review): string | null {
  if (review.rating < 4) return null;
  let h = 0;
  for (let i = 0; i < review.id.length; i++) h = (h * 31 + review.id.charCodeAt(i)) >>> 0;
  if (h % 5 >= 3) return null; // ~60% of positive reviews get a reply
  return REPLY_POOL[h % REPLY_POOL.length];
}

function nextOpeningCaption(salon: Salon): string {
  const cap = openCaption(salon);
  if (cap.startsWith('Open now')) return 'right now';
  if (cap.startsWith('Opens today ')) return `today ${cap.slice('Opens today '.length)}`;
  if (cap.startsWith('Opens ')) return cap.slice('Opens '.length);
  return 'soon';
}

export default function SalonDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const state = useStoreState();

  const salon = useMemo(() => (slug ? getSalonBySlug(slug) : undefined), [state, slug]);
  const services = useMemo(() => (salon ? getServicesBySalon(salon.id) : []), [state, salon]);
  const reviews = useMemo(() => (salon ? getReviewsBySalon(salon.id) : []), [state, salon]);
  const rating = useMemo(() => (salon ? getSalonRating(salon.id) : { avg: 0, count: 0, bayes: 0 }), [state, salon]);
  const rank = useMemo(
    () => (salon ? getLeaderboard(5).find((e) => e.salon.id === salon.id)?.rank ?? null : null),
    [state, salon],
  );
  const liveSpecials = useMemo(
    () => (salon ? getSpecialsBySalon(salon.id).filter((sp) => isSpecialLive(sp)).sort((a, b) => a.endsAt - b.endsAt) : []),
    [state, salon],
  );
  const pricing = useMemo(() => {
    const map = new Map<string, ServicePricing>();
    for (const sv of services) map.set(sv.id, getDiscountedPrice(sv.id));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, services]);

  const user = useMemo(() => getCurrentUser(), [state]);
  const isFav = useMemo(() => (user && salon ? user.favourites.includes(salon.id) : false), [user, salon]);
  const ownsStore = Boolean(user && salon && user.salonId === salon.id);

  const [flashId, setFlashId] = useState<string | null>(null);
  const [heartPop, setHeartPop] = useState(false);
  const [tab, setTab] = useState<'all' | CategoryKey>('all');
  const [visibleReviews, setVisibleReviews] = useState(6);
  const [reviewOpen, setReviewOpen] = useState(false);

  // deep-link: /salon/:slug#svc-<id> scrolls to + flashes a service card
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#svc-')) {
      const id = hash.slice(5);
      window.setTimeout(() => {
        document.getElementById(`svc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashId(id);
        window.setTimeout(() => setFlashId(null), 1800);
      }, 400);
    }
    scanReveals();
  }, [slug]);

  useEffect(() => { scanReveals(); }, [tab, visibleReviews]);

  if (!salon) {
    return (
      <div className="container-ysl py-24 text-center">
        <img src="/empty-bookings.svg" alt="" className="mx-auto w-64" />
        <h1 className="mt-6 font-serif text-3xl font-semibold">We couldn't find that salon</h1>
        <p className="mt-2" style={{ color: 'var(--ysl-muted)' }}>It may have been renamed or is awaiting approval.</p>
        <Link to="/salons" className="btn btn-primary mt-8">Browse all salons</Link>
      </div>
    );
  }

  const open = isOpenNow(salon);
  const serviceCategories = [...new Set(services.map((s) => s.category))];
  const filteredServices = tab === 'all' ? services : services.filter((s) => s.category === tab);

  const gallery: GalleryItem[] = (() => {
    const seen = new Set<string>();
    const items: GalleryItem[] = [];
    const push = (src: string, tag?: string) => {
      if (seen.has(src)) return;
      seen.add(src);
      items.push({ src, tag });
    };
    for (const src of salon.gallery) {
      const sv = services.find((s) => s.image === src);
      push(src, sv ? `${sv.name} · ${formatZARShort((pricing.get(sv.id)?.price ?? sv.price))}` : undefined);
    }
    for (const sv of services) push(sv.image, `${sv.name} · ${formatZARShort(pricing.get(sv.id)?.price ?? sv.price)}`);
    return items;
  })();

  // related salons: same category first, then top-rated
  const related = state.salons
    .filter((s) => s.approved && s.id !== salon.id)
    .sort((a, b) => {
      const aShared = a.categories.some((c) => salon.categories.includes(c)) ? 1 : 0;
      const bShared = b.categories.some((c) => salon.categories.includes(c)) ? 1 : 0;
      if (aShared !== bShared) return bShared - aShared;
      return getSalonRating(b.id).bayes - getSalonRating(a.id).bayes;
    })
    .slice(0, 3);

  // review eligibility: signed-in customer with a completed, unreviewed booking here
  const canReview = Boolean(
    user &&
      getBookingsByUser(user.id).some((b) => b.salonId === salon.id && b.status === 'completed') &&
      !reviews.some((r) => r.userId === user.id),
  );

  // rating distribution from display reviews
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));
  const distMax = Math.max(1, ...dist.map((d) => d.n));

  const onSave = () => {
    if (!getCurrentUser()) {
      navigate(`/login?next=/salon/${salon.slug}`);
      return;
    }
    const added = toggleFavourite(salon.id);
    setHeartPop(true);
    window.setTimeout(() => setHeartPop(false), 400);
    toast.success(added ? 'Saved to your favourites' : 'Removed from favourites');
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied — share the store!');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const scrollToServices = () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });

  const earliestSpecialEnd = liveSpecials[0]?.endsAt;

  return (
    <div>
      {/* ── owner banner ── */}
      {ownsStore && (
        <div className="border-b" style={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', borderColor: 'var(--ysl-gold)' }}>
          <div className="container-ysl flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm font-medium" style={{ color: 'var(--ysl-violet-deep)' }}>
              You own this store — customers see it exactly like this.
            </p>
            <Link to="/dashboard" className="btn !py-2 !px-5 text-[11px]" style={{ background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }}>
              Edit in dashboard
            </Link>
          </div>
        </div>
      )}

      {/* ── S1 · cover hero ── */}
      <section className="relative">
        <div className="relative aspect-[16/9] max-h-[560px] w-full overflow-hidden">
          <img src={salon.cover} alt={salon.name} className={`h-full w-full object-cover ${REDUCED ? '' : 'kenburns'}`} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,18,51,.72) 0%, rgba(36,18,51,.15) 60%, transparent)' }} />
        </div>

        {/* identity card */}
        <div className="container-ysl relative z-10">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.15 }}
            className="card-surface -mt-24 p-6 shadow-ysl-lg sm:-mt-28 sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              {/* logo disc */}
              <div className="relative shrink-0">
                <img
                  src={salon.avatar}
                  alt={`${salon.ownerName}, owner`}
                  className="h-[88px] w-[88px] rounded-full object-cover"
                  style={rank ? { boxShadow: '0 0 0 3px var(--ysl-gold), 0 0 0 6px var(--ysl-surface)' } : { boxShadow: '0 0 0 3px var(--ysl-lilac)' }}
                />
                {rank && (
                  <span
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em]"
                    style={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', color: 'var(--ysl-violet-deep)' }}
                  >
                    Top 5 · #{rank}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <motion.div
                  initial="hidden" animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <motion.span variants={{ hidden: { scale: 0.7, opacity: 0 }, show: { scale: 1, opacity: 1 } }} className="chip chip-lilac">
                    Student business
                  </motion.span>
                  <motion.span variants={{ hidden: { scale: 0.7, opacity: 0 }, show: { scale: 1, opacity: 1 } }} className="chip chip-success">
                    <BadgeCheck size={12} /> Verified
                  </motion.span>
                  {liveSpecials.length > 0 && (
                    <motion.span variants={{ hidden: { scale: 0.7, opacity: 0 }, show: { scale: 1, opacity: 1 } }} className="chip"
                      style={{ background: 'var(--ysl-special)', color: '#fff' }}>
                      {liveSpecials.length} special{liveSpecials.length === 1 ? '' : 's'} live
                    </motion.span>
                  )}
                </motion.div>

                <h1 className="mt-2 font-serif text-[2.2rem] font-semibold leading-tight">{salon.name}</h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                  {salon.blurb.split('.')[0]} — {salon.area}, {walkMinutes(salon.distanceKm)} min from campus
                </p>
                <div className="mt-2.5">
                  <RatingStars rating={rating.avg} size={17} />
                  <span className="ml-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                    {rating.avg.toFixed(1)} · {rating.count} review{rating.count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={onSave} className="btn btn-ghost !px-5 !py-3 text-[11px]">
                  <motion.span animate={heartPop ? { scale: [1, 1.45, 1] } : {}} transition={{ duration: 0.4 }} className="grid place-items-center">
                    <Heart size={16} fill={isFav ? 'var(--ysl-purple)' : 'none'} color={isFav ? 'var(--ysl-purple)' : 'currentColor'} />
                  </motion.span>
                  {isFav ? 'Saved' : 'Save'}
                </button>
                <button onClick={onShare} className="btn btn-ghost !px-5 !py-3 text-[11px]">
                  <Share2 size={15} /> Share
                </button>
                <button onClick={scrollToServices} className="btn btn-primary !px-6 !py-3 text-[11px]">Book now</button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── S2 · specials banner ── */}
      <AnimatePresence>
        {liveSpecials.length > 0 && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="container-ysl pt-6">
              <div
                className="overflow-hidden rounded-ysl-m border p-4 sm:p-5"
                style={{ background: 'var(--ysl-special-soft)', borderColor: 'color-mix(in srgb, var(--ysl-special) 40%, transparent)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ysl-special)' }}>
                    <Flame size={16} />
                    {liveSpecials.length} special{liveSpecials.length === 1 ? '' : 's'} live — ends {earliestSpecialEnd ? formatDateShort(new Date(earliestSpecialEnd).toISOString().slice(0, 10)) : 'soon'}
                  </p>
                  {earliestSpecialEnd && <CountdownTimer endsAt={earliestSpecialEnd} variant="special" label="Earliest ends in" />}
                </div>
                {/* marquee of affected services */}
                <div className="marquee mt-3 overflow-hidden">
                  <div className="marquee-track" style={{ animationDuration: '20s' }}>
                    {[0, 1].map((dup) => (
                      <div key={dup} className="flex items-center gap-8" aria-hidden={dup === 1}>
                        {liveSpecials.map((sp) => {
                          const sv = services.find((s) => s.id === sp.serviceId);
                          if (!sv) return null;
                          const p = pricing.get(sv.id);
                          return (
                            <button
                              key={`${dup}-${sp.id}`}
                              onClick={() => {
                                document.getElementById(`svc-${sv.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setFlashId(sv.id);
                                window.setTimeout(() => setFlashId(null), 1800);
                              }}
                              className="whitespace-nowrap text-sm font-medium"
                            >
                              {sv.name}{' '}
                              <span className="line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZARShort(p?.original ?? sv.price)}</span>{' '}
                              <span className="font-serif text-base font-bold" style={{ color: 'var(--ysl-special)' }}>
                                {formatZARShort(p?.price ?? sv.price)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── S3 · about + quick facts ── */}
      <section className="container-ysl grid gap-10 py-16 lg:grid-cols-5 lg:py-20">
        {/* left: about */}
        <div className="lg:col-span-3">
          <p className="eyebrow reveal">The store</p>
          <div className="reveal delay-1 relative mt-6">
            <Quote size={44} className="absolute -left-2 -top-3 opacity-20" style={{ color: 'var(--ysl-gold)' }} fill="var(--ysl-gold)" />
            <p className="pl-10 font-serif text-[1.6rem] font-medium italic leading-snug">
              {salon.blurb.split('.')[0]}.
            </p>
          </div>
          <div className="reveal delay-2 mt-6 space-y-4 text-[15px] leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
            <p>{salon.blurb}</p>
            <p>
              Every booking is held for you the moment you reserve a slot — pay with a single-use code at the
              Youna Venture Vault and your ticket is confirmed instantly. No cash, no queues, no surprises.
            </p>
          </div>
          {/* meet the owner */}
          <div className="reveal delay-3 mt-8 flex items-center gap-4 border-t pt-6 hairline">
            <img src={salon.avatar} alt={salon.ownerName} className="h-14 w-14 rounded-full object-cover" />
            <div>
              <p className="flex items-center gap-2 font-medium">
                {salon.ownerName}
                <BadgeCheck size={15} style={{ color: 'var(--ysl-success)' }} />
              </p>
              <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
                Student owner · on Young Space Lighty since 2026
              </p>
            </div>
          </div>
        </div>

        {/* right: facts stack */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* weekly schedule */}
          <div className="card-surface reveal p-5 transition-transform hover:-translate-y-1 hover:shadow-ysl-md">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: open ? 'var(--ysl-success)' : 'var(--ysl-muted)' }} />
              <span style={{ color: open ? 'var(--ysl-success)' : 'var(--ysl-muted)' }}>{openCaption(salon)}</span>
            </p>
            <div className="mt-4 overflow-hidden rounded-ysl-s border hairline">
              {DAY_KEYS.map((key, i) => {
                const d = salon.schedule[key];
                const today = (new Date().getDay() + 6) % 7 === i;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-ysl-lilac"
                    style={
                      today
                        ? { background: 'var(--ysl-lilac)', boxShadow: 'inset 3px 0 0 var(--ysl-purple)', color: 'var(--ysl-purple)', fontWeight: 600 }
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      {DAY_LABELS[key]}
                      {today && <span className="chip chip-lilac !px-2 !py-0.5 !text-[9px]">Today</span>}
                    </span>
                    {d.open ? (
                      <span>{d.start} – {d.end}</span>
                    ) : (
                      <span className="italic" style={{ color: 'var(--ysl-muted)' }}>Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* location */}
          <div className="card-surface reveal delay-1 p-5 transition-transform hover:-translate-y-1 hover:shadow-ysl-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[.18em]" style={{ color: 'var(--ysl-muted)' }}>Location</p>
                <p className="mt-1 font-serif text-xl font-semibold">{salon.area}, Grahamstown</p>
                <span className="chip chip-lilac mt-2">{walkMinutes(salon.distanceKm)} min walk from campus</span>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--ysl-lilac)' }}>
                <MapPin size={20} style={{ color: 'var(--ysl-purple)' }} />
              </span>
            </div>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(`${salon.area}, Makhanda, Grahamstown`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[.14em]"
              style={{ color: 'var(--ysl-purple)' }}
            >
              Get directions →
            </a>
          </div>

          {/* good to know */}
          <div className="card-surface reveal delay-2 p-5 transition-transform hover:-translate-y-1 hover:shadow-ysl-md">
            <p className="text-[11px] font-medium uppercase tracking-[.18em]" style={{ color: 'var(--ysl-muted)' }}>Good to know</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex gap-2.5"><BadgeCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-success)' }} /> 25% deposit secures your slot via payment code</li>
              <li className="flex gap-2.5"><BadgeCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-success)' }} /> Free cancellation up to 24 hours before</li>
              <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-amber)' }} /> Slots held for 10 minutes while you pay</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── S4 · services menu ── */}
      <section id="services" className="border-t hairline" style={{ background: 'var(--ysl-lilac)' }}>
        <div className="container-ysl py-16 lg:py-20">
          <p className="eyebrow reveal">The menu</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <h2 className="display-2 reveal delay-1">
              Services &amp; <em style={{ color: 'var(--ysl-purple)' }}>prices</em>
            </h2>
            {/* category tab pills */}
            <div className="reveal delay-2 flex flex-wrap gap-1 rounded-pill border p-1 hairline" style={{ background: 'color-mix(in srgb, var(--ysl-surface) 70%, transparent)', backdropFilter: 'blur(8px)' }}>
              <TabPill active={tab === 'all'} onClick={() => setTab('all')}>All</TabPill>
              {serviceCategories.map((c) => (
                <TabPill key={c} active={tab === c} onClick={() => setTab(c)}>
                  {CATEGORIES.find((x) => x.key === c)?.label ?? c}
                </TabPill>
              ))}
            </div>
          </div>

          <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((sv, i) => (
                <motion.div
                  key={sv.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                >
                  <ServiceCard service={sv} pricing={pricing.get(sv.id)!} flash={flashId === sv.id} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          {filteredServices.length === 0 && (
            <p className="mt-10 text-center" style={{ color: 'var(--ysl-muted)' }}>No services in this category yet.</p>
          )}
        </div>
      </section>

      {/* ── S5 · gallery ── */}
      {gallery.length > 0 && (
        <section className="container-ysl py-16 lg:py-20">
          <p className="eyebrow reveal">The work</p>
          <h2 className="display-2 reveal delay-1 mt-4">
            Fresh from the <em style={{ color: 'var(--ysl-purple)' }}>chair</em>
          </h2>
          <div className="mt-10">
            <GalleryGrid items={gallery} reveal />
          </div>
        </section>
      )}

      {/* ── S6 · reviews ── */}
      <section className="border-t hairline" style={{ background: 'var(--ysl-lilac)' }}>
        <div className="container-ysl py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow reveal">Word on the street</p>
              <h2 className="display-2 reveal delay-1 mt-4">
                Verified <em style={{ color: 'var(--ysl-purple)' }}>reviews</em>
              </h2>
            </div>
            {canReview && (
              <button onClick={() => setReviewOpen(true)} className="btn btn-primary reveal delay-2">Write a review</button>
            )}
          </div>

          {/* summary */}
          <div className="reveal mt-10 grid gap-8 lg:grid-cols-3">
            <div className="card-surface flex items-center gap-6 p-6">
              <span className="font-serif text-[4.2rem] font-bold leading-none">{rating.avg ? rating.avg.toFixed(1) : '—'}</span>
              <div>
                <RatingStars rating={rating.avg} showScore={false} size={18} />
                <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>{rating.count} verified visit{rating.count === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="card-surface p-6 lg:col-span-2">
              <div className="flex flex-col gap-2.5">
                {dist.map(({ star, n }, i) => (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex w-8 items-center gap-1 font-medium">
                      {star} <Star size={12} fill="var(--ysl-gold)" color="var(--ysl-gold)" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-pill" style={{ background: 'var(--ysl-line)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(n / distMax) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="h-full rounded-pill"
                        style={{ background: 'linear-gradient(90deg, var(--ysl-gold), var(--ysl-gold-light))' }}
                      />
                    </div>
                    <span className="w-8 text-right" style={{ color: 'var(--ysl-muted)' }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* review cards */}
          {reviews.length === 0 ? (
            <p className="mt-10 text-center" style={{ color: 'var(--ysl-muted)' }}>
              No reviews yet — be the first after your visit.
            </p>
          ) : (
            <>
              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {reviews.slice(0, visibleReviews).map((r, i) => {
                  const reply = ownerReplyFor(r);
                  return (
                    <motion.article
                      key={r.id}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
                      className="card-surface p-5"
                    >
                      <div className="flex items-center gap-3">
                        <img src="/review-avatars.png" alt="" className="h-10 w-10 rounded-full object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            {r.userName}
                            {r.verified && (
                              <span className="chip chip-success !px-2 !py-0.5 !text-[9px]">
                                <BadgeCheck size={10} /> Verified visit
                              </span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{timeAgo(r.createdAt)}</p>
                        </div>
                        <RatingStars rating={r.rating} showScore={false} size={13} />
                      </div>
                      <p className="mt-3 font-serif text-[1.15rem] leading-relaxed">{r.text}</p>
                      {r.serviceName && <span className="chip chip-lilac mt-3">{r.serviceName}</span>}
                      {reply && (
                        <div className="mt-4 rounded-ysl-s p-4" style={{ background: 'var(--ysl-lilac)' }}>
                          <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-purple)' }}>
                            Reply from {salon.ownerName.split(' ')[0]}
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>{reply}</p>
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </div>
              {visibleReviews < reviews.length && (
                <div className="mt-8 text-center">
                  <button onClick={() => setVisibleReviews((v) => v + 6)} className="btn btn-ghost">
                    Load more reviews
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── S7 · booking CTA strip ── */}
      <section className="deep-section">
        <div className="container-ysl relative z-10 flex flex-col items-center gap-6 py-16 text-center lg:py-20">
          <h2 className="display-2 reveal max-w-2xl text-white">
            Ready when you are — next opening{' '}
            <em style={{ color: 'var(--ysl-gold-light)' }}>{nextOpeningCaption(salon)}</em>.
          </h2>
          {services.length > 0 && (
            <motion.div
              animate={REDUCED ? {} : { scale: [1, 1.03, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3.8 }}
            >
              <Link to={`/book/${salon.id}/${services[0].id}`} className="btn btn-gold reveal delay-1">
                See available slots
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── S8 · more salons ── */}
      <section className="container-ysl py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display-2 reveal !text-[clamp(1.8rem,3.4vw,2.6rem)]">
            More student <em style={{ color: 'var(--ysl-purple)' }}>salons</em>
          </h2>
          <Link to="/salons" className="text-[12px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-purple)' }}>
            View all salons →
          </Link>
        </div>
        <div className="mt-8 grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
          {related.map((s, i) => (
            <div key={s.id} className={`reveal ${['delay-1', 'delay-2', 'delay-3'][i]}`}>
              <SalonCard salon={s} className="h-full" />
            </div>
          ))}
        </div>
      </section>

      {/* ── review modal ── */}
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        salon={salon}
        services={services.map((s) => s.name)}
      />
    </div>
  );
}

/* ── tab pill ── */
function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-pill px-4 py-2 text-[13px] font-medium transition-all"
      style={active ? { background: 'var(--ysl-purple)', color: '#fff' } : { color: 'var(--ysl-ink)' }}
    >
      {children}
    </button>
  );
}

/* ── review modal ── */
function ReviewModal({ open, onClose, salon, services }: { open: boolean; onClose: () => void; salon: Salon; services: string[] }) {
  const [rating, setRating] = useState(5);
  const [hoverStar, setHoverStar] = useState(0);
  const [text, setText] = useState('');
  const [serviceName, setServiceName] = useState('');

  const submit = () => {
    const user = getCurrentUser();
    if (!user) return;
    if (text.trim().length < 8) {
      toast.error('Tell us a little more — at least a sentence.');
      return;
    }
    addReview({ salonId: salon.id, userId: user.id, rating, text, serviceName: serviceName || undefined });
    toast.success('Review posted — thank you!');
    setText('');
    setRating(5);
    setServiceName('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(20,8,32,.55)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="card-surface w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-semibold">Review {salon.name}</h3>
              <button aria-label="Close" onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full transition hover:rotate-90 hover:bg-ysl-lilac">
                <X size={17} />
              </button>
            </div>

            {/* star picker */}
            <div className="mt-5 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setRating(n)}
                >
                  <Star
                    size={28}
                    fill={(hoverStar || rating) >= n ? 'var(--ysl-gold)' : 'none'}
                    color={(hoverStar || rating) >= n ? 'var(--ysl-gold)' : 'var(--ysl-line)'}
                  />
                </button>
              ))}
            </div>

            <select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="mt-5 w-full rounded-ysl-s border px-4 py-3 text-sm outline-none hairline focus:border-ysl-purple"
              style={{ background: 'var(--ysl-cream)', color: 'var(--ysl-ink)' }}
              aria-label="Service booked"
            >
              <option value="">Which service did you book? (optional)</option>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="How was the appointment? The salon, the vibe, the result…"
              className="mt-4 w-full rounded-ysl-s border px-4 py-3 text-sm outline-none hairline focus:border-ysl-purple"
              style={{ background: 'var(--ysl-cream)', color: 'var(--ysl-ink)' }}
            />

            <button onClick={submit} className="btn btn-primary mt-5 w-full">Post review</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
