import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import Topbar from '@/components/Topbar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useThemeSync, sweep } from '@/lib/store';
import { useRevealOnScroll, scanReveals } from '@/hooks/useReveal';

/**
 * Layout — shared chrome for public pages (nested-route pattern: renders
 * <Outlet/>, so App.tsx MUST nest public routes inside
 * `<Route element={<Layout/>}>`).
 *
 * Navbar positioning contract: Navbar is `sticky top-0 z-50` in normal
 * document flow — pages start below the nav automatically. Do NOT add
 * nav-height padding in pages.
 */
export default function Layout() {
  const location = useLocation();
  useThemeSync();
  useRevealOnScroll();

  // Lenis smooth scrolling (skipped for reduced-motion users)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  // scroll to top + expire stale holds/specials on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    sweep();
    const t = window.setInterval(() => {
      sweep();
      scanReveals();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Topbar />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="bottom-center" richColors={false}
        toastOptions={{
          style: {
            background: 'var(--ysl-violet-deep)', color: '#F2ECFA',
            border: '1px solid var(--ysl-violet-soft)', borderRadius: '999px',
          },
        }} />
    </div>
  );
}
