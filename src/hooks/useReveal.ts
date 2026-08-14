import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Global reveal-on-scroll system (design.md §5).
 * Observes every `.reveal` element; adds `.is-visible` at 20% viewport.
 * Re-scans on route change. Pages just add className="reveal delay-N".
 */
export function useRevealOnScroll(): void {
  const location = useLocation();
  useEffect(() => {
    const timer = window.setTimeout(() => scanReveals(), 60);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);
}

let observer: IntersectionObserver | null = null;

export function scanReveals(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
  }
  els.forEach((el) => observer!.observe(el));
}
