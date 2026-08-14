/** Celebration confetti — gold/purple/white, ≤60 pieces (design.md §5). */
import confetti from 'canvas-confetti';

function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function fireCelebration(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = [
    token('--ysl-gold', '#D4AF6A'),
    token('--ysl-purple', '#8B5CF6'),
    '#ffffff',
  ];
  const opts = { colors, zIndex: 120, ticks: 220, scalar: 0.95, disableForReducedMotion: true };
  confetti({ ...opts, particleCount: 40, spread: 75, origin: { y: 0.32 } });
  window.setTimeout(() => {
    confetti({ ...opts, particleCount: 20, spread: 110, startVelocity: 32, origin: { y: 0.4 } });
  }, 220);
}
