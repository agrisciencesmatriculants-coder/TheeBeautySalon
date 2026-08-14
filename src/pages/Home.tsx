import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Search, ArrowRight, BadgeCheck, X, Quote, Sparkles } from 'lucide-react';
import {
  useStore, getLeaderboard, getActiveSpecials, getService, getSalon, getDiscountedPrice,
  getNextGraduation, daysUntil, getSalonRating, fromPrice, CATEGORIES, AREAS,
} from '@/lib/store';
import { formatZAR, formatZARShort } from '@/lib/format';
import SalonCard from '@/components/SalonCard';
import RatingStars from '@/components/RatingStars';
import CountdownTimer from '@/components/CountdownTimer';
import type { Salon, Service, Special } from '@/lib/store';

gsap.registerPlugin(ScrollTrigger);

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────── S0 · Graduation banner ──── */

function GraduationBanner() {
  const gradTheme = useStore((s) => s.settings.gradTheme);
  const grad = useStore(() => getNextGraduation());
  const gradSpecials = useStore(() => getActiveSpecials().filter((sp) => sp.graduation).length);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('ysl-grad-banner-dismissed') === '1');
  if (dismissed || !grad) return null;

  const days = daysUntil(grad.date);
  const live = gradTheme;
  const approaching = !live && days >= 0 && days <= 14;
  if (!live && !approaching) return null;

  return (
    <div
      className={`relative z-40 overflow-hidden ${live ? 'grad-banner' : ''}`}
      style={live ? undefined : { background: 'var(--ysl-violet)', color: 'var(--ysl-gold-light)' }}
    >
      <div className="container-ysl flex items-center justify-center gap-4 py-2.5 text-center text-[13px] tracking-[.06em]">
        <Sparkles size={14} className="shrink-0" />
        {live ? (
          <p className="shimmer-text font-medium">
            Graduation week is here — {gradSpecials} graduation special{gradSpecials === 1 ? '' : 's'} live across Grahamstown salons
            <Link to="/graduation" className="ml-2 underline underline-offset-4">View them →</Link>
          </p>
        ) : (
          <p className="font-medium">
            Graduation in {days} day{days === 1 ? '' : 's'} — specials loading…
            <Link to="/graduation" className="ml-2 underline underline-offset-4">Peek →</Link>
          </p>
        )}
        <button
          aria-label="Dismiss"
          className="absolute right-3 opacity-70 transition-opacity hover:opacity-100"
          onClick={() => { sessionStorage.setItem('ysl-grad-banner-dismissed', '1'); setDismissed(true); }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────── S2 · Hero ──── */

const HERO_WORDS: { w: string; accent?: boolean }[] = [
  { w: 'Where' }, { w: 'Grahamstown' }, { w: 'gets' }, { w: 'gorgeous', accent: true },
  { w: '—' }, { w: 'by' }, { w: 'students,' }, { w: 'for' }, { w: 'students.' },
];

function Hero({ stats }: { stats: { salons: number; services: number; avg: number; min: number } }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [area, setArea] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (cat) params.set('category', cat);
    if (area) params.set('area', area);
    navigate(`/salons${params.size ? `?${params}` : ''}`);
  };

  const statItems = [
    { label: 'Student salons', target: stats.salons, suffix: '+', format: 'int' },
    { label: 'Services listed', target: stats.services, suffix: '+', format: 'int' },
    { label: 'Average rating', target: stats.avg, suffix: '★', format: 'float' },
    { label: 'From-price', target: stats.min, prefix: 'R', format: 'int' },
  ];

  return (
    <section className="hero relative flex min-h-[100dvh] items-center overflow-hidden" style={{ background: 'var(--ysl-violet-deep)' }}>
      {/* bg + scrim */}
      <div className="absolute inset-0 overflow-hidden">
        <img src="/hero-bg.png" alt="" className={`h-full w-full object-cover ${REDUCED ? '' : 'kenburns'}`} />
      </div>
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(110deg, rgba(36,18,51,.88) 0%, rgba(36,18,51,.55) 45%, rgba(36,18,51,.28) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(45% 45% at 80% 20%, rgba(139,92,246,.28), transparent 70%)',
      }} />

      <div className="container-ysl relative z-10 pb-24 pt-[140px]">
        <p className="hero-eyebrow eyebrow eyebrow-gold">Grahamstown · Rhodes University · Est. 2026</p>
        <h1 className="display-1 mt-6 max-w-4xl text-white" style={{ perspective: '800px' }}>
          {HERO_WORDS.map((word, i) => (
            <span key={i} className="hero-word inline-block overflow-hidden pb-1 align-top">
              <span
                className="inline-block"
                style={word.accent ? { fontStyle: 'italic', color: 'var(--ysl-gold-light)' } : undefined}
              >
                {word.w}{'\u00A0'}
              </span>
            </span>
          ))}
        </h1>
        <p className="hero-lead lead mt-6 !text-[rgba(242,236,250,.78)]">
          Book braids, nails, lashes, cuts and graduation glam at student-run salons across Makhanda.
          Real schedules. Honest ZAR prices. Pay securely with a payment code via Youna Venture Vault.
        </p>

        <div className="hero-ctas mt-9 flex flex-wrap gap-4">
          <Link to="/salons" className="btn btn-gold">Find a salon</Link>
          <Link to="/signup?role=owner" className="btn btn-light">Open your salon — it's free</Link>
        </div>

        {/* search pill */}
        <form
          onSubmit={submit}
          className="hero-search mt-9 flex max-w-3xl flex-col gap-2 rounded-2xl p-2 transition-shadow focus-within:shadow-glow-purple sm:flex-row sm:items-center sm:rounded-full"
          style={{ background: 'rgba(250,248,253,.96)' }}
        >
          <div className="flex flex-1 items-center gap-2 px-4">
            <Search size={17} style={{ color: 'var(--ysl-purple)' }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search braids, nails, barber…"
              aria-label="Search services"
              className="w-full bg-transparent py-3 text-sm focus:outline-none"
              style={{ color: 'var(--ysl-ink)' }}
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Category"
            className="cursor-pointer bg-transparent px-3 py-3 text-sm focus:outline-none sm:border-l hairline"
            style={{ color: 'var(--ysl-muted)' }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Area"
            className="cursor-pointer bg-transparent px-3 py-3 text-sm focus:outline-none sm:border-l hairline"
            style={{ color: 'var(--ysl-muted)' }}
          >
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="submit" className="btn !py-3 text-[12px]" style={{ background: 'var(--ysl-violet)', color: '#fff' }}>
            Search
          </button>
        </form>

        {/* stats */}
        <div className="mt-14 grid grid-cols-2 gap-6 border-t border-white/15 pt-8 md:grid-cols-4">
          {statItems.map((s) => (
            <div key={s.label} className="stat group">
              <p
                className="stat-num font-serif text-4xl font-semibold text-white transition-colors group-hover:text-[var(--ysl-gold-light)] md:text-5xl"
                data-target={s.target}
                data-format={s.format}
                data-prefix={s.prefix ?? ''}
                data-suffix={s.suffix}
              >
                {s.prefix ?? ''}0{s.suffix}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[.25em]" style={{ color: 'rgba(242,236,250,.6)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="scroll-line" />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────── S3 · Marquee strip ──── */

const MARQUEE_ITEMS = ['Knotless Braids', 'Gel Nails', 'Lash Extensions', 'Skin Fades', 'Wig Installs', 'Graduation Glam', 'Brow Shaping', 'Acrylic Sets'];

function Marquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="marquee overflow-hidden py-5" style={{ background: 'var(--ysl-violet-deep)' }}>
      <div className="marquee-track">
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-11 font-serif text-xl italic" style={{ color: 'var(--ysl-gold-light)' }}>
            {item}
            <img src="/marquee-icon.svg" alt="" className="h-4 w-4" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── S4 · Specials rail ──── */

interface SpecialCardData {
  special: Special;
  service: Service;
  salon: Salon;
  price: number;
  original: number;
  percentOff: number | null;
}

function SpecialCard({ data }: { data: SpecialCardData }) {
  const navigate = useNavigate();
  const { special, service, salon, price, original, percentOff } = data;
  return (
    <article
      onClick={() => navigate(`/salon/${salon.slug}#${service.id}`)}
      className="card-surface group w-[300px] shrink-0 cursor-pointer snap-start overflow-hidden hover:-translate-y-2 hover:shadow-glow-special md:w-[340px]"
      style={{ borderTop: '2px dashed var(--ysl-special)' }}
    >
      <div className="relative h-44 overflow-hidden">
        <img src={service.image} alt={service.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" loading="lazy" />
        <span className="chip absolute left-3 top-3" style={{ background: 'var(--ysl-special)', color: '#fff' }}>
          -{percentOff}% OFF
        </span>
        {special.graduation && (
          <span className="chip chip-gold absolute right-3 top-3">
            <img src="/grad-cap.svg" alt="" className="h-3.5 w-3.5" /> Grad special
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
          {salon.name} · {salon.area}
        </p>
        <h3 className="mt-1 font-serif text-[1.5rem] font-semibold leading-tight">{service.name}</h3>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-[1.05rem] line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZAR(original)}</span>
          <span className="font-serif text-[1.8rem] font-bold" style={{ color: 'var(--ysl-special)' }}>{formatZAR(price)}</span>
        </div>
        <div className="mt-3">
          <CountdownTimer endsAt={special.endsAt} variant="special" label="Ends in" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/book/${salon.id}/${service.id}`); }}
          className="btn btn-gold mt-4 w-full !py-3 text-[11px]"
        >
          Book at this price
        </button>
      </div>
    </article>
  );
}

function SpecialsRail({ cards }: { cards: SpecialCardData[] }) {
  return (
    <section className="specials-section section-pad overflow-hidden">
      <div className="container-ysl">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Limited-time</p>
            <h2 className="display-2 mt-3">
              Specials <em style={{ color: 'var(--ysl-special)', fontStyle: 'italic' }}>ending soon</em>
            </h2>
          </div>
          <Link to="/salons?specials=1" className="group inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[.15em]"
            style={{ color: 'var(--ysl-purple)' }}>
            View all specials
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
      <div className="container-ysl mt-10">
        {cards.length === 0 ? (
          <div className="card-surface reveal grid place-items-center p-16 text-center">
            <p className="font-serif text-2xl italic" style={{ color: 'var(--ysl-muted)' }}>
              No active specials — check back soon ✨
            </p>
          </div>
        ) : (
          <div className="specials-rail flex gap-6 overflow-x-auto pb-4 pr-6 lg:overflow-visible" style={{ scrollSnapType: 'x mandatory' }}>
            {cards.map((c) => <SpecialCard key={c.special.id} data={c} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────── S5 · Top 5 leaderboard ──── */

function LeaderboardRowItem({ entry }: { entry: ReturnType<typeof getLeaderboard>[number] }) {
  const navigate = useNavigate();
  const { salon, rank, avg, count, scorePct } = entry;
  const price = fromPrice(salon.id);
  const numeralColor = rank === 1 ? 'var(--ysl-gold)' : rank <= 3 ? 'var(--ysl-purple)' : 'var(--ysl-muted)';
  return (
    <div
      onClick={() => navigate(`/salon/${salon.slug}`)}
      className="lb-row group relative flex cursor-pointer flex-wrap items-center gap-5 rounded-ysl-l border border-white/10 p-5 transition-all hover:bg-[rgba(139,92,246,.12)] md:flex-nowrap md:p-6"
      style={{ background: 'rgba(255,255,255,.03)' }}
    >
      {/* rank */}
      <div className="relative grid h-16 w-16 shrink-0 place-items-center">
        {rank <= 3 && (
          <img src="/laurel.svg" alt="" className="lb-laurel absolute inset-0 h-full w-full object-cover opacity-90"
            style={{ transform: 'scale(1.55)' }} />
        )}
        <span className="lb-numeral relative font-serif text-5xl font-bold transition-transform group-hover:scale-105"
          style={{ color: numeralColor }}>
          {rank}
        </span>
      </div>
      {rank === 1 && <span className="chip chip-gold absolute -top-2.5 left-14">Top rated</span>}
      {/* salon */}
      <img src={salon.avatar} alt={salon.ownerName} className="h-14 w-14 shrink-0 rounded-full border-2 object-cover"
        style={{ borderColor: 'var(--ysl-gold)' }} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-serif text-2xl font-semibold text-white">{salon.name}</h3>
        <p className="text-[11px] uppercase tracking-[.18em]" style={{ color: 'rgba(242,236,250,.55)' }}>
          {salon.area} · by {salon.ownerName}
        </p>
      </div>
      {/* score */}
      <div className="w-full md:w-64">
        <div className="flex items-center justify-between text-sm">
          <RatingStars rating={avg} showScore={false} size={13} />
          <span className="font-serif text-xl font-bold" style={{ color: 'var(--ysl-gold-light)' }}>{avg.toFixed(1)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="lb-score-fill h-full rounded-full"
            style={{ width: `${scorePct}%`, background: 'linear-gradient(90deg, var(--ysl-gold), var(--ysl-gold-light))' }} />
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'rgba(242,236,250,.5)' }}>{count} verified reviews</p>
      </div>
      {price !== null && (
        <p className="hidden font-serif text-xl font-semibold text-white lg:block">from {formatZARShort(price)}</p>
      )}
      <Link to={`/salon/${salon.slug}`} onClick={(e) => e.stopPropagation()}
        className="btn btn-ghost-gold !px-5 !py-2.5 text-[11px]">
        View store
      </Link>
    </div>
  );
}

function Leaderboard({ entries }: { entries: ReturnType<typeof getLeaderboard> }) {
  return (
    <section id="leaderboard" className="lb-pin deep-section section-pad overflow-hidden">
      <div className="container-ysl relative z-10">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow eyebrow-gold center justify-center">The leaderboard</p>
          <h2 className="display-2 mt-3 text-white">
            Grahamstown's <em className="italic" style={{ color: 'var(--ysl-gold-light)' }}>Top 5</em> salons
          </h2>
          <p className="lead mx-auto mt-4 !text-[rgba(242,236,250,.65)]">
            Ranked live from verified reviews — the best-rated student salons rise to the top.
          </p>
        </div>
        <div className="mt-12 space-y-4">
          {entries.map((e) => <LeaderboardRowItem key={e.salon.id} entry={e} />)}
        </div>
        <p className="reveal mt-8 text-center text-xs" style={{ color: 'rgba(242,236,250,.45)' }}>
          Scores use a Bayesian average of rating × review count — updated after every verified review.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────── S6 · How it works ──── */

const HOW_STEPS = [
  {
    img: '/how-book.png', title: 'Browse & book',
    text: 'Pick a student salon, choose a service and a slot from their real weekly schedule. Your slot is held for 10 minutes.',
  },
  {
    img: '/how-pay.png', title: 'Pay with a code',
    text: "We give you a payment code. Pay 'Young Space Lighty' at Youna Venture Vault and your booking confirms the moment payment lands.",
  },
  {
    img: '/how-glow.png', title: 'Glow & review',
    text: 'Show your ticket at the salon. After your visit, leave a verified review — the best salons climb the Top 5.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="section-pad">
      <div className="container-ysl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow center justify-center">How it works</p>
          <h2 className="display-2 mt-3">
            Booked in <em className="italic" style={{ color: 'var(--ysl-purple)' }}>three steps</em>
          </h2>
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {HOW_STEPS.map((step, i) => (
            <div key={step.title} className={`reveal delay-${i + 1} group`}>
              <div className="relative overflow-hidden rounded-ysl-l shadow-ysl-md">
                <img src={step.img} alt={step.title}
                  className="how-img aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <span className="absolute left-4 top-4 font-serif text-[4rem] font-semibold leading-none"
                  style={{ color: 'rgba(241,234,252,.9)', textShadow: '0 4px 24px rgba(36,18,51,.5)' }}>
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 font-serif text-[1.6rem] font-semibold">{step.title}</h3>
              <p className="mt-2 text-[15px] font-light leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────── S7 · Browse by category ──── */

function Categories({ counts }: { counts: Record<string, number> }) {
  const navigate = useNavigate();
  return (
    <section className="section-pad" style={{ background: 'var(--ysl-lilac)' }}>
      <div className="container-ysl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow center justify-center">Categories</p>
          <h2 className="display-2 mt-3">
            What are you booking <em className="italic" style={{ color: 'var(--ysl-purple)' }}>today</em>?
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.key}
              onClick={() => navigate(`/salons?category=${c.key}`)}
              className={`card-surface reveal delay-${(i % 3) + 1} group flex items-center gap-5 p-6 text-left hover:-translate-y-1.5 hover:border-[var(--ysl-purple)]`}
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-[8deg]"
                style={{ background: 'linear-gradient(135deg, var(--ysl-violet), var(--ysl-purple))' }}>
                <img src={c.icon} alt="" className="h-9 w-9 brightness-0 invert" />
              </span>
              <span>
                <span className="block font-serif text-[1.45rem] font-semibold">{c.label}</span>
                <span className="mt-0.5 block text-xs uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                  from {formatZARShort(c.from)} · {counts[c.key] ?? 0} services
                </span>
              </span>
              <ArrowRight size={17} className="ml-auto transition-all group-hover:translate-x-1" style={{ color: 'var(--ysl-purple)' }} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── S8 · Featured salons ──── */

function Featured({ salons }: { salons: Salon[] }) {
  return (
    <section className="section-pad">
      <div className="container-ysl">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Fresh stores</p>
            <h2 className="display-2 mt-3">
              Fresh on <em className="italic" style={{ color: 'var(--ysl-purple)' }}>Young Space Lighty</em>
            </h2>
          </div>
          <Link to="/salons" className="group inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[.15em]"
            style={{ color: 'var(--ysl-purple)' }}>
            View all salons
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-12 grid gap-[26px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {salons.map((s, i) => (
            <div key={s.id} className={`reveal delay-${(i % 4) + 1}`}>
              <SalonCard salon={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── S9 · Student stories ──── */

const STORIES = [
  {
    quote: 'Booked knotless braids at 8am from my res bed, paid with the Vault code, and by lunch I was the best-looking person in the library queue.',
    name: 'Anelisa K.', meta: '2nd-year BCom · Knotless Braids at Braids by Naledi', sprite: 0,
  },
  {
    quote: 'The 10-minute hold is genius — my slot was locked while I walked to the Vault. My grad-glam makeup survived tears, hugs and three hours of photos.',
    name: 'Emma V.', meta: '4th-year BSc · Graduation Glam at Makeup by Mila', sprite: 1,
  },
  {
    quote: 'Sharpest fade in Makhanda and I paid less than my Uber to town. The leaderboard doesn\'t lie — Sipho earned that laurel.',
    name: 'Siya M.', meta: '3rd-year LLB · Skin Fade at The Gentleman\'s Chair', sprite: 2,
  },
];

function Stories() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setIdx((v) => (v + 1) % STORIES.length), 6000);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <section className="deep-section section-pad overflow-hidden">
      <div className="container-ysl relative z-10"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow eyebrow-gold center justify-center">Student stories</p>
          <h2 className="display-2 mt-3 text-white">
            Word around <em className="italic" style={{ color: 'var(--ysl-gold-light)' }}>campus</em>
          </h2>
        </div>
        <div className="relative mx-auto mt-12 max-w-3xl">
          <Quote size={52} className="absolute -top-7 left-0" style={{ color: 'var(--ysl-gold)' }} fill="var(--ysl-gold)" />
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
              {STORIES.map((s, i) => (
                <figure key={i} className="w-full shrink-0 px-2 text-center">
                  <blockquote className="font-serif text-2xl font-medium italic leading-relaxed text-white md:text-[1.7rem]">
                    “{s.quote}”
                  </blockquote>
                  <div className="mt-5 flex justify-center">
                    <RatingStars rating={5} showScore={false} size={14} />
                  </div>
                  <figcaption className="mt-5 flex items-center justify-center gap-3">
                    <span
                      className="h-12 w-12 rounded-full border-2 bg-cover"
                      style={{
                        borderColor: 'var(--ysl-gold)',
                        backgroundImage: 'url(/review-avatars.png)',
                        backgroundSize: '300% 200%',
                        backgroundPosition: `${(s.sprite % 3) * 50}% ${Math.floor(s.sprite / 3) * 100}%`,
                      }}
                    />
                    <span className="text-left">
                      <span className="block text-sm font-medium text-white">{s.name}</span>
                      <span className="block text-xs" style={{ color: 'rgba(242,236,250,.55)' }}>{s.meta}</span>
                    </span>
                    <span className="chip chip-success ml-2"><BadgeCheck size={12} /> Verified visit</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-2">
            {STORIES.map((_, i) => (
              <button key={i} aria-label={`Story ${i + 1}`} onClick={() => setIdx(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: i === idx ? 22 : 8, background: i === idx ? 'var(--ysl-gold)' : 'rgba(255,255,255,.25)' }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── S10 · Owner CTA ──── */

function OwnerCta() {
  return (
    <section className="gradient-pan relative overflow-hidden">
      {[14, 42, 70, 88].map((left, i) => (
        <img key={i} src="/marquee-icon.svg" alt="" className="sparkle-drift absolute h-6 w-6 opacity-60"
          style={{ left: `${left}%`, top: `${18 + (i * 19) % 55}%`, animationDelay: `${i * 1.4}s` }} />
      ))}
      <div className="container-ysl relative z-10 py-24 text-center">
        <p className="eyebrow center justify-center" style={{ color: 'rgba(255,255,255,.8)' }}>For student entrepreneurs</p>
        <h2 className="display-2 mx-auto mt-4 max-w-3xl text-white">
          Run your salon. <em className="italic" style={{ color: 'var(--ysl-gold-light)' }}>We'll bring the campus.</em>
        </h2>
        <p className="lead mx-auto mt-5 !text-[rgba(255,255,255,.75)]">
          Create your store in 10 minutes — services, ZAR prices, your weekly schedule. We handle discovery,
          bookings, payment codes and reviews. Free to join while we launch at Rhodes.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link to="/signup?role=owner" className="btn btn-gold">Open your salon</Link>
          <Link to="/dashboard" className="btn btn-light">See the owner dashboard</Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────── Home page assembly ──── */

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const leaderboard = useStore(() => getLeaderboard(5));
  const salons = useStore((s) => s.salons.filter((x) => x.approved));
  const services = useStore((s) => s.services.filter((x) => x.active));
  const gradTheme = useStore((s) => s.settings.gradTheme);
  const specialCards = useStore((): SpecialCardData[] =>
    getActiveSpecials()
      .map((sp) => {
        const service = getService(sp.serviceId);
        const salon = service ? getSalon(service.salonId) : undefined;
        if (!service || !salon || !salon.approved) return null;
        const { price, original, percentOff } = getDiscountedPrice(service.id);
        return { special: sp, service, salon, price, original, percentOff };
      })
      .filter((x): x is SpecialCardData => x !== null)
      .sort((a, b) => a.special.endsAt - b.special.endsAt)
      .slice(0, 6),
  );

  const stats = useMemo(() => {
    const rated = salons.filter((s) => s.ratingCount > 0);
    const avg = rated.length
      ? rated.reduce((acc, s) => acc + s.ratingSum / s.ratingCount, 0) / rated.length
      : 0;
    const min = services.length ? Math.min(...services.map((s) => s.price)) : 0;
    return { salons: salons.length, services: 120, avg: Math.round(avg * 10) / 10, min };
  }, [salons, services]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sv of services) counts[sv.category] = (counts[sv.category] ?? 0) + 1;
    return counts;
  }, [services]);

  const featured = useMemo(() => {
    const topIds = new Set(leaderboard.map((e) => e.salon.id));
    const rest = salons
      .filter((s) => !topIds.has(s.id))
      .sort((a, b) => getSalonRating(b.id).bayes - getSalonRating(a.id).bayes);
    const fill = leaderboard.map((e) => e.salon).filter((s) => !rest.includes(s));
    return [...rest, ...fill].slice(0, 4);
  }, [salons, leaderboard]);

  // hash scroll (/#how-it-works, /#leaderboard)
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120);
    }
  }, [location.hash]);

  useGSAP(
    () => {
      if (REDUCED) return;
      const mm = gsap.matchMedia();

      // hero intro (all viewports)
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { opacity: 0, duration: 0.6 })
        .from('.hero-word > span', { y: 60, rotateX: 40, opacity: 0, stagger: 0.05, duration: 1 }, '-=0.2')
        .from('.hero-lead', { y: 30, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('.hero-ctas', { y: 30, opacity: 0, duration: 0.7 }, '-=0.55')
        .from('.hero-search', { y: 30, opacity: 0, duration: 0.7 }, '-=0.55');

      // stats count-up on first reveal
      gsap.utils.toArray<HTMLElement>('.stat-num').forEach((el) => {
        const target = parseFloat(el.dataset.target || '0');
        const fmt = el.dataset.format;
        const prefix = el.dataset.prefix ?? '';
        const suffix = el.dataset.suffix ?? '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => {
            el.textContent = `${prefix}${fmt === 'float' ? obj.v.toFixed(1) : Math.round(obj.v)}${suffix}`;
          },
        });
      });

      mm.add('(min-width: 1024px)', () => {
        // S5 leaderboard pinned showcase: rows 5→1 cascade
        const rows = gsap.utils.toArray<HTMLElement>('.lb-row');
        if (rows.length) {
          const lbTl = gsap.timeline({
            scrollTrigger: {
              trigger: '.lb-pin',
              start: 'top top',
              end: '+=150%',
              pin: true,
              scrub: 0.8,
            },
          });
          lbTl.from([...rows].reverse(), { y: 80, opacity: 0, stagger: 0.22, duration: 0.5, ease: 'power2.out' })
            .from('.lb-laurel', { opacity: 0, scale: 0.7, stagger: 0.22, duration: 0.4 }, '<0.1')
            .from('.lb-score-fill', { width: 0, stagger: 0.22, duration: 0.45, ease: 'power1.out' }, '<0.08');
        }

        // S4 specials rail scroll-jack
        const rail = document.querySelector<HTMLElement>('.specials-rail');
        const section = document.querySelector<HTMLElement>('.specials-section');
        if (rail && section) {
          const dist = rail.scrollWidth - (rail.parentElement?.clientWidth ?? 0);
          if (dist > 40) {
            gsap.to(rail, {
              x: -dist,
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top top', end: '+=120%', pin: true, scrub: 0.8 },
            });
          }
        }

        // S6 how-it-works image parallax
        gsap.utils.toArray<HTMLElement>('.how-img').forEach((img, i) => {
          gsap.fromTo(img, { y: 24 }, {
            y: -24,
            ease: 'none',
            scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: 0.6 + i * 0.1 },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <GraduationBanner />
      <Hero stats={stats} />
      {gradTheme && (
        <div className="flex justify-center py-4" style={{ background: 'var(--ysl-violet-deep)' }}>
          <img src="/grad-cap.svg" alt="Graduation season" className="h-14 w-14" />
        </div>
      )}
      <Marquee />
      <SpecialsRail cards={specialCards} />
      <Leaderboard entries={leaderboard} />
      <HowItWorks />
      <Categories counts={categoryCounts} />
      <Featured salons={featured} />
      <Stories />
      <OwnerCta />
    </div>
  );
}
