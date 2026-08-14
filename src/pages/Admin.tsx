/** Admin — /admin (outside Layout). Password-gated operations console with
 *  deep-violet sidebar + tabbed sections (admin.md). */
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import {
  BadgePercent, Bell, LayoutDashboard, LogOut, Moon, ScrollText, Star,
  Store, Ticket, Trophy, Users as UsersIcon, GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logout, useStore, useThemeSync, setTheme, setGradTheme } from '@/lib/store';
import { ThemeSwitch } from '@/components/admin/shared';
import OverviewSection from '@/components/admin/OverviewSection';
import SalonsSection from '@/components/admin/SalonsSection';
import SpecialsSection from '@/components/admin/SpecialsSection';
import Top5Section from '@/components/admin/Top5Section';
import GraduationSection from '@/components/admin/GraduationSection';
import PaymentsSection from '@/components/admin/PaymentsSection';
import UsersSection from '@/components/admin/UsersSection';
import ReviewsSection from '@/components/admin/ReviewsSection';
import AuditSection from '@/components/admin/AuditSection';

export type AdminTab =
  | 'overview' | 'salons' | 'specials' | 'top5' | 'graduation'
  | 'payments' | 'users' | 'reviews' | 'audit';

const NAV: { key: AdminTab; label: string; icon: LucideIcon; grad?: boolean }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'salons', label: 'Salons', icon: Store },
  { key: 'specials', label: 'Specials', icon: BadgePercent },
  { key: 'top5', label: 'Top 5', icon: Trophy },
  { key: 'graduation', label: 'Graduation Bell', icon: Bell, grad: true },
  { key: 'payments', label: 'Payment codes', icon: Ticket },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'audit', label: 'Audit log', icon: ScrollText },
];

const TITLES: Record<AdminTab, string> = {
  overview: 'Overview',
  salons: 'Salon vetting',
  specials: 'Specials console',
  top5: 'Top 5 curation',
  graduation: 'Graduation Bell',
  payments: 'Payment codes',
  users: 'Users',
  reviews: 'Reviews moderation',
  audit: 'Audit log',
};

function isTab(v: string | null): v is AdminTab {
  return !!v && (NAV as { key: string }[]).some((n) => n.key === v);
}

export default function Admin() {
  useThemeSync(); // keeps <html data-theme data-grad> in sync outside Layout
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = useStore((s) =>
    s.sessionUserId ? (s.users.find((u) => u.id === s.sessionUserId) ?? null) : null,
  );
  const theme = useStore((s) => s.settings.theme);
  const gradTheme = useStore((s) => s.settings.gradTheme);
  const pendingSalons = useStore((s) => s.salons.filter((x) => !x.approved).length);
  const pendingSpecials = useStore((s) => s.specials.filter((x) => x.status === 'pending').length);
  const pendingCodes = useStore((s) => s.paymentCodes.filter((c) => c.status === 'issued' || c.status === 'paid').length);

  const tab: AdminTab = isTab(params.get('tab')) ? (params.get('tab') as AdminTab) : 'overview';
  const goTab = (t: AdminTab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  const badgeFor = (key: AdminTab): number =>
    key === 'salons' ? pendingSalons : key === 'specials' ? pendingSpecials : key === 'payments' ? pendingCodes : 0;

  const onSignOut = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh]" style={{ background: 'var(--ysl-cream)' }}>
      <Toaster position="bottom-center" toastOptions={{ style: { background: 'var(--ysl-violet-deep)', color: '#F2ECFA', border: '1px solid var(--ysl-violet-soft)' } }} />

      {/* ── sidebar (desktop) ── */}
      <aside
        className="sticky top-0 hidden h-[100dvh] w-[260px] shrink-0 flex-col overflow-y-auto lg:flex"
        style={{ background: 'var(--ysl-violet-deep)', borderRight: '1px solid var(--ysl-violet-soft)' }}
      >
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          <img src="/ysl-logo.svg" alt="YSL" className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-serif text-lg font-semibold italic text-white">YSL Console</p>
            <p className="text-[9px] font-medium uppercase tracking-[.3em]" style={{ color: 'var(--ysl-gold-light)' }}>
              Admin · Grahamstown
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin sections">
          {NAV.map((n) => {
            const active = tab === n.key;
            const badge = badgeFor(n.key);
            return (
              <button
                key={n.key}
                onClick={() => goTab(n.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium uppercase tracking-[.12em] transition-all"
                style={{
                  borderRadius: 'var(--radius-m)',
                  background: active ? 'var(--ysl-violet-soft)' : 'transparent',
                  color: active ? 'var(--ysl-gold-light)' : 'rgba(242,236,250,.68)',
                  boxShadow: active ? 'inset 3px 0 0 var(--ysl-purple)' : 'none',
                }}
              >
                <n.icon size={16} style={n.grad ? { color: 'var(--grad-gold)' } : undefined} />
                <span className="flex-1">{n.label}</span>
                {badge > 0 && (
                  <span
                    className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold"
                    style={{ background: 'var(--ysl-amber)', color: 'var(--ysl-violet-deep)' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pb-6 pt-4" style={{ borderTop: '1px solid var(--ysl-violet-soft)' }}>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-medium uppercase tracking-[.12em] transition-colors hover:text-white"
            style={{ color: 'rgba(242,236,250,.6)', borderRadius: 'var(--radius-m)' }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* content header */}
        <header
          className="sticky top-0 z-40 px-5 py-4 sm:px-8"
          style={{
            background: 'color-mix(in srgb, var(--ysl-cream) 92%, transparent)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--ysl-line)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/ysl-logo.svg" alt="" className="h-9 w-9 lg:hidden" />
              <h1 className="font-serif text-2xl font-semibold sm:text-3xl" style={{ color: 'var(--ysl-ink)' }}>
                {TITLES[tab]}
              </h1>
              <span className="chip chip-lilac hidden sm:inline-flex" title="Signed in as admin">
                {user.email}
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-2.5">
                <Moon size={14} style={{ color: 'var(--ysl-muted)' }} />
                <span className="hidden text-[11px] font-medium uppercase tracking-[.15em] sm:inline" style={{ color: 'var(--ysl-muted)' }}>
                  Dark mode
                </span>
                <ThemeSwitch on={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} label="Dark mode" />
              </span>
              <span className="flex items-center gap-2.5">
                <GraduationCap size={15} style={{ color: 'var(--ysl-gold)' }} />
                <span className="hidden text-[11px] font-medium uppercase tracking-[.15em] sm:inline" style={{ color: 'var(--ysl-muted)' }}>
                  Graduation theme
                </span>
                <ThemeSwitch gold on={gradTheme} onChange={(v) => setGradTheme(v)} label="Graduation theme" />
              </span>
            </div>
          </div>
          {/* mobile tab scroller */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => goTab(n.key)}
                className="chip shrink-0"
                style={{
                  background: tab === n.key ? 'var(--ysl-violet-deep)' : 'var(--ysl-lilac)',
                  color: tab === n.key ? 'var(--ysl-gold-light)' : 'var(--ysl-purple)',
                  padding: '7px 13px',
                }}
              >
                <n.icon size={12} /> {n.label}
              </button>
            ))}
            <button onClick={onSignOut} className="chip shrink-0" style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-danger)', padding: '7px 13px' }}>
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </header>

        {/* section body */}
        <main className="flex-1 px-5 py-8 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {tab === 'overview' && <OverviewSection goTab={goTab} />}
              {tab === 'salons' && <SalonsSection />}
              {tab === 'specials' && <SpecialsSection />}
              {tab === 'top5' && <Top5Section />}
              {tab === 'graduation' && <GraduationSection />}
              {tab === 'payments' && <PaymentsSection />}
              {tab === 'users' && <UsersSection />}
              {tab === 'reviews' && <ReviewsSection />}
              {tab === 'audit' && <AuditSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
