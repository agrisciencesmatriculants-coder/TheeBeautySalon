import { useEffect, useMemo, useState, memo } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, GraduationCap, Mail, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  useStoreState, getNextGraduation, daysUntil, getActiveSpecials, getService, getSalon, getDiscountedPrice,
  CATEGORIES,
} from '@/lib/store';
import type { CategoryKey } from '@/lib/store';
import { formatDate } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import GiantCountdown from '@/components/marketplace/GiantCountdown';
import GradSpecialCard from '@/components/marketplace/GradSpecialCard';
import GalleryGrid from '@/components/marketplace/GalleryGrid';
import type { GalleryItem } from '@/components/marketplace/GalleryGrid';
import { scanReveals } from '@/hooks/useReveal';

/** Graduation — /graduation (graduation.md). Seasonal showpiece: countdown, grad specials, owner prompt. */

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── mortarboard with toss-in + swaying tassel (isolated perpetual anim) ── */
const GradCap = memo(function GradCap() {
  return (
    <motion.div
      initial={{ y: -80, rotate: -12, opacity: 0 }}
      animate={{ y: 0, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.2 }}
      className="relative mx-auto w-fit"
    >
      <img src="/grad-cap.svg" alt="Mortarboard" className="h-24 w-24 sm:h-28 sm:w-28" />
      <motion.span
        className="absolute -right-1 top-1/2 block h-10 w-[3px] origin-top rounded"
        style={{ background: 'var(--grad-gold)' }}
        animate={REDUCED ? {} : { rotate: [0, 6, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
});

/* ── confetti loop while the graduation theme is on (header region) ── */
function HeroConfetti({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active || REDUCED) return;
    const root = document.documentElement;
    const css = (name: string, fallback: string) => getComputedStyle(root).getPropertyValue(name).trim() || fallback;
    const colors = [css('--grad-gold', '#F2C94C'), '#ffffff', css('--ysl-purple', '#8B5CF6')];
    fire(); // opening burst
    const t = window.setInterval(fire, 2600);
    function fire() {
      confetti({
        particleCount: 50,
        spread: 75,
        startVelocity: 32,
        gravity: 0.65,
        ticks: 200,
        scalar: 0.9,
        origin: { x: 0.2 + Math.random() * 0.6, y: -0.04 },
        colors,
      });
    }
    return () => window.clearInterval(t);
  }, [active]);
  return null;
}

/* grad-ready looks (static editorial set per graduation.md S3) */
const LOOKS: GalleryItem[] = [
  { src: '/work-makeup.png', tag: 'Graduation glam · Makeup by Mila', to: '/salon/makeup-by-mila' },
  { src: '/work-braids.png', tag: 'Ceremony knotless · Braids by Naledi', to: '/salon/braids-by-naledi' },
  { src: '/work-nails.png', tag: 'Purple-and-gold set · Nails by Thandi', to: '/salon/nails-by-thandi' },
  { src: '/work-fade.png', tag: 'Sharp for the stage · The Gentleman’s Chair', to: '/salon/the-gentleman-s-chair' },
  { src: '/work-gel.png', tag: 'Chrome moment · Nails by Thandi', to: '/salon/nails-by-thandi' },
  { src: '/work-lashes.png', tag: 'Photo-proof lashes · Lash Loft', to: '/salon/lash-loft' },
  { src: '/work-curls.png', tag: 'Defined for the day · Campus Curls Co.', to: '/salon/campus-curls-co' },
  { src: '/work-wig.png', tag: 'Wig install · Braids by Naledi', to: '/salon/braids-by-naledi' },
];

const STEPS = [
  { n: '1', title: 'The bell rings', body: 'Our admin rings the Graduation Bell and every salon owner gets the call.' },
  { n: '2', title: 'Specials go live', body: 'Time-limited graduation deals appear across Grahamstown — with countdowns.' },
  { n: '3', title: 'The site dresses up', body: 'On ceremony day the whole marketplace turns gold. Book early — slots vanish.' },
];

export default function Graduation() {
  const state = useStoreState();
  const gradTheme = state.settings.gradTheme;
  const grad = useMemo(() => getNextGraduation(), [state]);

  const [cat, setCat] = useState<'all' | CategoryKey>('all');
  const [notifyOpen, setNotifyOpen] = useState(false);

  const endsAt = grad ? new Date(`${grad.date}T09:00:00`).getTime() : Date.now();
  const year = grad ? grad.date.slice(0, 4) : String(new Date().getFullYear() + 1);
  const days = grad ? daysUntil(grad.date) : null;

  const gradSpecials = useMemo(
    () =>
      getActiveSpecials()
        .filter((sp) => sp.graduation)
        .map((sp) => {
          const service = getService(sp.serviceId);
          const salon = getSalon(sp.salonId);
          if (!service || !salon || !salon.approved) return null;
          const p = getDiscountedPrice(sp.serviceId);
          return { special: sp, service, salon, price: p.price, original: p.original, percentOff: p.percentOff };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const presentCats = [...new Set(gradSpecials.map((g) => g.service.category))];
  const filtered = cat === 'all' ? gradSpecials : gradSpecials.filter((g) => g.service.category === cat);

  useEffect(() => { scanReveals(); }, [cat]);

  const scrollToSpecials = () => document.getElementById('grad-specials')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div>
      {/* ── S1 · ceremony hero ── */}
      <section
        className="relative flex min-h-[60dvh] items-center overflow-hidden"
        style={gradTheme ? { boxShadow: 'inset 0 0 0 2px rgba(242,201,76,.4)' } : undefined}
      >
        <HeroConfetti active={gradTheme} />
        <div className="absolute inset-0">
          <img src="/grad-banner-bg.png" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,18,51,.92) 0%, rgba(36,18,51,.55) 55%, rgba(36,18,51,.45) 100%)' }} />
        </div>

        <div className="container-ysl relative z-10 py-20 text-center">
          <GradCap />
          <p className="eyebrow eyebrow-gold center reveal mt-6" style={{ color: 'var(--grad-gold)' }}>
            Rhodes University · Grahamstown
          </p>
          <h1 className="display-1 reveal delay-1 mt-4 text-white">
            Graduation <em style={{ color: 'var(--grad-gold)' }}>{year}</em>
          </h1>
          {grad ? (
            <>
              <p className="reveal delay-2 mt-3 font-serif text-xl italic" style={{ color: 'var(--ysl-gold-light)' }}>
                {grad.title} · {formatDate(grad.date)}
              </p>
              <div className="reveal delay-3 mt-8">
                <GiantCountdown endsAt={endsAt} />
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[.3em]" style={{ color: 'rgba(255,255,255,.75)' }}>
                  until the caps fly
                </p>
              </div>
            </>
          ) : (
            <p className="reveal delay-2 lead mx-auto mt-4 text-center" style={{ color: 'var(--ysl-gold-light)' }}>
              The next ceremony date is being confirmed — check back soon.
            </p>
          )}
          <button onClick={scrollToSpecials} className="btn btn-gold reveal delay-4 mt-10">
            Browse graduation specials
          </button>
          {gradTheme && days !== null && days >= 0 && (
            <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--grad-gold)' }}>
              <Sparkles size={15} /> Graduation week is live — the whole marketplace is dressed in gold
            </p>
          )}
        </div>
      </section>

      {/* mortarboard divider */}
      <div className="flex items-center justify-center gap-6 border-b py-5 hairline" aria-hidden>
        <span className="h-px w-24" style={{ background: 'var(--ysl-gold)' }} />
        {[0, 1, 2].map((i) => (
          <motion.img
            key={i}
            src="/grad-cap.svg"
            alt=""
            className="h-8 w-8"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
          />
        ))}
        <span className="h-px w-24" style={{ background: 'var(--ysl-gold)' }} />
      </div>

      {/* ── S2 · graduation specials gallery ── */}
      <section id="grad-specials" className="container-ysl py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow reveal" style={{ color: 'var(--ysl-special)' }}>Look the part</p>
            <h2 className="display-2 reveal delay-1 mt-4">
              Graduation <em style={{ color: 'var(--ysl-purple)' }}>specials</em>
            </h2>
          </div>
          {presentCats.length > 0 && (
            <div className="reveal delay-2 flex flex-wrap gap-1 rounded-pill border p-1 hairline" style={{ background: 'var(--ysl-surface)' }}>
              <GradChip active={cat === 'all'} onClick={() => setCat('all')}>All</GradChip>
              {presentCats.map((c) => (
                <GradChip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {CATEGORIES.find((x) => x.key === c)?.label ?? c}
                </GradChip>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          /* editorial empty state */
          <div className="reveal mx-auto mt-12 max-w-lg text-center">
            <img src="/grad-cap.svg" alt="" className="mx-auto h-20 w-20 opacity-70" />
            <h3 className="mt-5 font-serif text-3xl font-semibold">
              Specials drop when the bell rings <Bell size={22} className="inline -translate-y-0.5" style={{ color: 'var(--ysl-gold)' }} />
            </h3>
            <p className="mt-3" style={{ color: 'var(--ysl-muted)' }}>
              Salon owners are crafting their graduation deals right now. Leave your Gmail and we'll let you know
              the moment they go live.
            </p>
            <button onClick={() => setNotifyOpen(true)} className="btn btn-gold mt-7">
              <Mail size={15} /> Notify me
            </button>
          </div>
        ) : (
          <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((g, i) => (
                <GradSpecialCard
                  key={g.special.id}
                  special={g.special}
                  service={g.service}
                  salon={g.salon}
                  price={g.price}
                  original={g.original}
                  percentOff={g.percentOff}
                  gradTheme={gradTheme}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── S3 · graduation looks ── */}
      <section className="border-t hairline" style={{ background: 'var(--ysl-lilac)' }}>
        <div className="container-ysl py-16 lg:py-20">
          <p className="eyebrow reveal">Inspiration</p>
          <h2 className="display-2 reveal delay-1 mt-4">
            Graduation <em style={{ color: 'var(--ysl-purple)' }}>looks</em>
          </h2>
          <p className="lead reveal delay-2 mt-3">
            Real work by Grahamstown's student salons — every look bookable with a student budget.
          </p>
          <div className="mt-10">
            <GalleryGrid items={LOOKS} reveal />
          </div>
        </div>
      </section>

      {/* ── S4 · for salon owners banner ── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--grad-banner-bg)' }}>
        <div className="container-ysl relative z-10 flex flex-col items-center gap-6 py-16 text-center lg:py-20">
          <div className="reveal flex items-center gap-4" aria-hidden>
            {[0, 1, 2].map((i) => <img key={i} src="/grad-cap.svg" alt="" className="h-9 w-9" />)}
          </div>
          <h2 className="display-2 reveal delay-1 max-w-3xl text-white">
            Own a salon?{' '}
            <em className={gradTheme ? 'shimmer-text' : ''} style={gradTheme ? undefined : { color: 'var(--grad-gold)' }}>
              Ring-ready specials win graduation week.
            </em>
          </h2>
          <p className="reveal delay-2 max-w-xl" style={{ color: 'rgba(255,255,255,.85)' }}>
            Create a graduation special from your dashboard — the admin approves it and you're featured here and
            on the homepage.
          </p>
          <div className="reveal delay-3 flex flex-wrap justify-center gap-4">
            <Link to="/dashboard" className="btn !py-3.5 text-[12px]" style={{ background: '#fff', color: 'var(--grad-cap)' }}>
              Open your dashboard
            </Link>
            <Link to="/signup?role=owner" className="btn btn-light !py-3.5 text-[12px]">
              Open a salon
            </Link>
          </div>
        </div>
      </section>

      {/* ── S5 · how graduation week works ── */}
      <section className="container-ysl py-16 lg:py-20">
        <p className="eyebrow center reveal mx-auto w-fit">The ritual</p>
        <h2 className="display-2 reveal delay-1 mt-4 text-center">
          How graduation <em style={{ color: 'var(--ysl-purple)' }}>week</em> works
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="card-surface p-7 text-center"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 200, damping: 14 }}
                className="font-serif text-[4rem] font-bold leading-none"
                style={{ background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
              >
                {s.n}
              </motion.span>
              <h3 className="mt-4 font-serif text-2xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>{s.body}</p>
            </motion.div>
          ))}
        </div>

        {/* countdown teaser to next ceremony */}
        {grad && (
          <div className="reveal mt-14 flex flex-col items-center gap-3 text-center">
            <p className="text-[12px] font-medium uppercase tracking-[.25em]" style={{ color: 'var(--ysl-muted)' }}>
              Next ceremony · {formatDate(grad.date)}
            </p>
            <CountdownTimer endsAt={endsAt} variant="grad" label="Caps fly in" />
          </div>
        )}
      </section>

      {/* ── notify-me modal (Brevo-styled email preview) ── */}
      <NotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </div>
  );
}

/* ── filter chip ── */
function GradChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

/* ── notify modal with Brevo-styled preview ── */
function NotifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
      toast.error('Please use your personal Gmail (e.g. example@gmail.com).');
      return;
    }
    setSent(true);
    toast.success('Email sent via Brevo');
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
            className="card-surface w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brevo header strip */}
            <div className="flex items-center justify-between px-6 py-3" style={{ background: 'var(--ysl-violet-deep)' }}>
              <p className="text-[11px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-gold-light)' }}>
                Email sent via Brevo
              </p>
              <button aria-label="Close" onClick={onClose} className="text-white/70 transition hover:rotate-90 hover:text-white">
                <X size={17} />
              </button>
            </div>

            <div className="p-6">
              {!sent ? (
                <>
                  <h3 className="font-serif text-2xl font-semibold">Get the drop first</h3>
                  <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                    We'll email you the moment graduation specials go live across Grahamstown salons.
                  </p>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    type="email"
                    className="mt-5 w-full rounded-ysl-s border px-4 py-3 text-sm outline-none hairline focus:border-ysl-purple"
                    style={{ background: 'var(--ysl-cream)', color: 'var(--ysl-ink)' }}
                  />
                  <p className="mt-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                    Use your personal Gmail, e.g. example@gmail.com
                  </p>
                  <button onClick={submit} className="btn btn-gold mt-5 w-full">
                    <GraduationCap size={16} /> Notify me
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--ysl-lilac)' }}>
                    <Mail size={24} style={{ color: 'var(--ysl-purple)' }} />
                  </span>
                  <h3 className="mt-4 font-serif text-2xl font-semibold">You're on the list</h3>
                  {/* rendered email preview */}
                  <div className="mt-5 rounded-ysl-s border p-4 text-left hairline" style={{ background: 'var(--ysl-cream)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-muted)' }}>
                      Preview · From Young Space Lighty
                    </p>
                    <p className="mt-2 font-serif text-lg font-semibold">The Graduation Bell is about to ring 🎓</p>
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                      Hi there — graduation specials are being crafted by Grahamstown's student salons. We'll ping
                      this address ({email.trim()}) the moment they go live. Get ready to look the part.
                    </p>
                  </div>
                  <button onClick={onClose} className="btn btn-primary mt-5 w-full">Done</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
