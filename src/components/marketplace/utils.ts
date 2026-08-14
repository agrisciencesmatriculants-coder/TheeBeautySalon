import type { Service } from '@/lib/store';
import { CATEGORIES } from '@/lib/store';

/** Small pure helpers shared by marketplace components. */

/** 90 → "1h 30m" · 45 → "45m" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Category line-icon path for a service category. */
export function categoryIcon(key: Service['category']): string {
  return CATEGORIES.find((c) => c.key === key)?.icon ?? '/cat-braids.svg';
}
