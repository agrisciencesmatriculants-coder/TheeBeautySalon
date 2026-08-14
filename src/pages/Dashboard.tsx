import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Store, Scissors, CalendarDays, CalendarCheck,
  Sparkles, Wallet, ExternalLink, LogOut, AlertTriangle,
} from 'lucide-react';
import { useStoreState, logout, getSalon } from '@/lib/store';
import Overview from '@/components/dash/Overview';
import StoreProfile from '@/components/dash/StoreProfile';
import ServicesTab from '@/components/dash/ServicesTab';
import ScheduleTab from '@/components/dash/ScheduleTab';
import BookingsTab from '@/components/dash/BookingsTab';
import SpecialsTab from '@/components/dash/SpecialsTab';
import EarningsTab from '@/components/dash/EarningsTab';

/** Owner console — /dashboard (dashboard.md). 260px deep-violet sidebar +
 *  fluid content; bottom icon bar on mobile. Guard: owners only. */

export type DashTab = 'overview' | 'store' | 'services' | 'schedule' | 'bookings' | 'specials' | 'earnings';

const NAV: { key: DashTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'store', label: 'My store', icon: Store },
  { key: 'services', label: 'Services', icon: Scissors },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { key: 'specials', label: 'Specials', icon: Sparkles },
  { key: 'earnings', label: 'Earnings', icon: Wallet },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = useStoreState();

  const user = state.sessionUserId ? state.users.find((u) => u.id === state.sessionUserId) ?? null : null;
  const salon = user?.salonId ? getSalon(user.salonId) : undefined;

  const tabParam = params.get('tab') as DashTab | null;
  const tab: DashTab = NAV.some((n) => n.key === tabParam) ? (tabParam as DashTab) : 'overview';

  const goTab = (t: DashTab) => {
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  };

  // owner's salon may load after store commits — keep tab param stable
  useEffect(() => {
    if (tabParam && !NAV.some((n) => n.key === tabParam)) goTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  if (!user || user.role !== 'owner' || !salon) {
    return <Navigate to="/login?next=/dashboard" replace />;
  }

  const signOut = () => {
    logout();
    navigate('/');
  };

  const content = (() => {
    switch (tab) {
      case 'overview': return <Overview user={user} salon={salon} goTab={goTab} />;
      case 'store': return <StoreProfile salon={salon} />;
      case 'services': return <ServicesTab salon={salon} />;
      case 'schedule': return <ScheduleTab salon={salon} />;
      case 'bookings': return <BookingsTab salon={salon} />;
      case 'specials': return <SpecialsTab salon={salon} />;
      case 'earnings': return <EarningsTab salon={salon} />;
    }
  })();

  return (
    <div className="flex min-h-[calc(100dvh-140px)] flex-col lg:flex-row">
      {/* ── sidebar (desktop) ── */}
      <aside
        className="sticky top-[73px] hidden h-[calc(100dvh-73px)] w-[260px] shrink-0 flex-col self-start lg:flex"
        style={{ background: 'var(--ysl-violet-deep)' }}
      >
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          <img src="/ysl-logo.svg" alt="YSL" className="h-9 w-9" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-serif text-base font-semibold italic" style={{ color: 'var(--ysl-gold-light)' }}>
              {salon.name}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-[.25em]" style={{ color: 'rgba(242,236,250,.55)' }}>
              Owner console
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Dashboard">
          {NAV.map((n) => {
            const active = tab === n.key;
            const Icon = n.icon;
            return (
              <button
                key={n.key}
                onClick={() => goTab(n.key)}
                className="relative flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[12px] font-medium uppercase tracking-[.14em] transition-colors"
                style={{ color: active ? 'var(--ysl-purple)' : 'rgba(242,236,250,.72)' }}
              >
                {active && (
                  <motion.span
                    layoutId="dash-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--ysl-lilac)' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-1 border-t px-3 py-4" style={{ borderColor: 'rgba(240,230,255,.12)' }}>
          <Link
            to={`/salon/${salon.slug}`}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[12px] font-medium uppercase tracking-[.14em] transition-colors hover:text-white"
            style={{ color: 'rgba(242,236,250,.72)' }}
          >
            <ExternalLink size={15} /> View my store
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[12px] font-medium uppercase tracking-[.14em] transition-colors hover:text-white"
            style={{ color: 'rgba(242,236,250,.72)' }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── content ── */}
      <div className="min-w-0 flex-1">
        {/* pending review banner */}
        {!salon.approved && (
          <div
            className="flex items-center gap-3 px-5 py-3 text-sm font-medium sm:px-8"
            style={{ background: 'rgba(232,161,58,.14)', color: 'var(--ysl-amber)', borderBottom: '1px solid rgba(232,161,58,.3)' }}
          >
            <AlertTriangle size={16} className="shrink-0" />
            Your store is under review — you can set everything up meanwhile.
          </div>
        )}

        <main className="px-5 pb-28 pt-8 sm:px-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto max-w-5xl">
            {content}
          </div>
        </main>
      </div>

      {/* ── mobile bottom icon bar ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[70] flex justify-around border-t px-1 py-1.5 lg:hidden"
        style={{ background: 'var(--ysl-violet-deep)', borderColor: 'rgba(240,230,255,.12)' }}
        aria-label="Dashboard"
      >
        {NAV.map((n) => {
          const active = tab === n.key;
          const Icon = n.icon;
          return (
            <button
              key={n.key}
              onClick={() => goTab(n.key)}
              className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5"
              style={{ color: active ? 'var(--ysl-gold-light)' : 'rgba(242,236,250,.6)' }}
              aria-label={n.label}
            >
              <Icon size={18} />
              <span className="text-[8px] font-medium uppercase tracking-wider">{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
