import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Moon, Sun, X, GraduationCap } from 'lucide-react';
import { useStore, setTheme, getNextGraduation, daysUntil } from '@/lib/store';
import { formatDate } from '@/lib/format';

/** Navbar — sticky glass nav (design.md §6.2).
 *  POSITIONING CONTRACT: sticky top-0 z-50, in normal document flow.
 *  Pages must NOT add nav-height padding. */

const SEASON_DAYS = 14;

export default function Navbar() {
  const location = useLocation();
  const theme = useStore((s) => s.settings.theme);
  const gradTheme = useStore((s) => s.settings.gradTheme);
  const user = useStore((s) => (s.sessionUserId ? (s.users.find((u) => u.id === s.sessionUserId) ?? null) : null));
  const grad = useStore(() => getNextGraduation());
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const gradDays = grad ? daysUntil(grad.date) : null;
  const season = gradTheme || (gradDays !== null && gradDays >= 0 && gradDays <= SEASON_DAYS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setDrawerOpen(false); setBellOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const links: { label: string; to: string; active: boolean; grad?: boolean }[] = [
    { label: 'Home', to: '/', active: location.pathname === '/' },
    { label: 'Salons', to: '/salons', active: location.pathname.startsWith('/salon') },
    { label: 'Specials', to: '/salons?specials=1', active: location.search.includes('specials=1') },
    ...(season ? [{ label: 'Graduation', to: '/graduation', active: location.pathname === '/graduation', grad: true }] : []),
    { label: 'How it works', to: '/#how-it-works', active: false },
  ];

  const accountTo = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/dashboard' : '/account';

  return (
    <header className="nav-glass sticky top-0 z-50 transition-all" style={scrolled ? { boxShadow: 'var(--shadow-sm)' } : undefined}>
      <div
        className="container-ysl flex items-center justify-between gap-4 transition-all duration-300"
        style={{ paddingBlock: scrolled ? 12 : 18 }}
      >
        {/* logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/ysl-logo.svg" alt="YSL seal" className="h-10 w-10" />
          <span className="leading-tight">
            <span className="block font-serif text-lg font-semibold italic">Young Space Lighty</span>
            <span className="block text-[9px] font-medium uppercase tracking-[.3em]" style={{ color: 'var(--ysl-muted)' }}>
              Mega Beauty Salon · Grahamstown
            </span>
          </span>
        </Link>

        {/* desktop menu */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="relative text-[13px] font-medium uppercase tracking-[.15em] transition-colors"
              style={{ color: l.grad ? 'var(--grad-gold, var(--ysl-gold))' : l.active ? 'var(--ysl-purple)' : 'var(--ysl-ink)' }}
            >
              {l.grad && <GraduationCap size={13} className="mr-1 inline -translate-y-[1px]" />}
              {l.label}
              {l.active && (
                <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded" style={{ background: 'var(--ysl-purple)' }} />
              )}
            </Link>
          ))}
        </nav>

        {/* right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark mode"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ysl-lilac"
            style={{ color: 'var(--ysl-ink)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid place-items-center"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>

          {/* graduation bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen((v) => !v)}
              aria-label="Graduation Bell"
              className="relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ysl-lilac"
              style={{ color: gradTheme ? 'var(--ysl-gold)' : 'var(--ysl-ink)' }}
            >
              <span className={gradTheme ? 'bell-ring inline-block' : 'inline-block'}>
                <Bell size={18} />
              </span>
              {season && (
                <span className="pulse-dot absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: 'var(--grad-gold)' }} />
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="card-surface absolute right-0 top-12 w-72 p-5"
                  style={{ zIndex: 60 }}
                >
                  <p className="eyebrow" style={{ color: 'var(--ysl-gold)' }}>Graduation Bell</p>
                  {grad ? (
                    <>
                      <p className="mt-3 font-serif text-lg font-semibold leading-snug">{grad.title}</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                        {formatDate(grad.date)}
                        {gradDays !== null && gradDays >= 0 && ` · in ${gradDays} day${gradDays === 1 ? '' : 's'}`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm" style={{ color: 'var(--ysl-muted)' }}>No ceremony scheduled yet.</p>
                  )}
                  <Link to="/graduation" className="btn btn-gold mt-4 w-full !py-2.5 text-[11px]">
                    View graduation specials
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* auth */}
          {user ? (
            <Link to={accountTo} className="btn btn-ghost hidden !px-5 !py-2.5 text-[11px] sm:inline-flex">
              Hi, {user.name.split(' ')[0]}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-ghost hidden !px-5 !py-2.5 text-[11px] sm:inline-flex">
              Sign in
            </Link>
          )}
          {(!user || user.role !== 'owner') && (
            <Link to="/signup?role=owner" className="btn btn-primary hidden !px-5 !py-2.5 text-[11px] md:inline-flex">
              Open your salon
            </Link>
          )}

          {/* burger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-ysl-lilac lg:hidden"
            style={{ color: 'var(--ysl-ink)' }}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-[rgba(20,8,32,.55)] backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="fixed right-0 top-0 z-[80] flex h-full w-[82%] max-w-sm flex-col p-7 lg:hidden"
              style={{ background: 'var(--ysl-surface)' }}
            >
              <div className="flex items-center justify-between">
                <img src="/ysl-logo.svg" alt="YSL" className="h-10 w-10" />
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-ysl-lilac">
                  <X size={20} />
                </button>
              </div>
              <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
                {[...links,
                  { label: user ? 'My account' : 'Sign in', to: user ? accountTo : '/login', active: false },
                  { label: 'Open your salon', to: '/signup?role=owner', active: false },
                ].map((l, i) => (
                  <motion.div
                    key={l.label}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.35 }}
                  >
                    <Link
                      to={l.to}
                      onClick={() => setDrawerOpen(false)}
                      className="block border-b py-4 font-serif text-2xl font-semibold hairline"
                      style={{ color: l.active ? 'var(--ysl-purple)' : 'var(--ysl-ink)' }}
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <p className="mt-auto text-xs" style={{ color: 'var(--ysl-muted)' }}>
                Grahamstown's student salon marketplace · ZAR only · Payments via Youna Venture Vault
              </p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
