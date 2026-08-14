/** ZAR currency + date/countdown formatting helpers for YSL. */

/** 250 → "R250.00" · 1234.5 → "R1,234.50" */
export function formatZAR(amount: number): string {
  return 'R' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 250 → "R250" (compact, no decimals — used for "from R180" lines). */
export function formatZARShort(amount: number): string {
  return 'R' + Math.round(amount).toLocaleString('en-US');
}

/** "2026-04-27" → "Mon, 27 Apr 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2026-04-27" → "27 Apr" */
export function formatDateShort(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

/** "14:30" stays "14:30"; epoch → "14:30" */
export function formatTime(t: string | number): string {
  if (typeof t === 'string') return t;
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** epoch → "27 Apr 2026, 14:30" */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatDateShort(ts.toString().length === 10 ? String(ts) : isoOf(d))}, ${formatTime(ts)}`;
}

function isoOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface CountdownParts {
  total: number; days: number; hours: number; minutes: number; seconds: number;
  d: string; h: string; m: string; s: string;
}

/** ms remaining → zero-padded parts (clamped at 0). */
export function countdownParts(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return { total, days, hours, minutes, seconds, d: p(days), h: p(hours), m: p(minutes), s: p(seconds) };
}

/** ms remaining → "2d 04:12:33", "09:41" (< 1h), or "Ended". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Ended';
  const c = countdownParts(ms);
  if (c.days > 0) return `${c.days}d ${c.h}:${c.m}:${c.s}`;
  if (c.hours > 0) return `${c.h}:${c.m}:${c.s}`;
  return `${c.m}:${c.s}`;
}

/** epoch → "3 days ago" / "in 2 days" / "just now" */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  const min = Math.floor(abs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ${suffix}`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h ${suffix}`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ${suffix}`;
  return formatDate(isoOf(new Date(ts)));
}
