/** RatingStars — 5 gold stars with fractional fill + serif score (design.md §6.8). */

interface Props {
  rating: number; // 0..5
  count?: number;
  size?: number; // px
  showScore?: boolean;
  className?: string;
}

export default function RatingStars({ rating, count, size = 15, showScore = true, className = '' }: Props) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex" style={{ height: size }}>
        <StarsRow size={size} color="var(--ysl-line)" />
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
          <StarsRow size={size} color="var(--ysl-gold)" />
        </span>
      </span>
      {showScore && (
        <span className="font-serif font-semibold leading-none" style={{ fontSize: size + 2 }}>
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs" style={{ color: 'var(--ysl-muted)' }}>({count})</span>
      )}
    </span>
  );
}

function StarsRow({ size, color }: { size: number; color: string }) {
  return (
    <span className="flex gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className="shrink-0">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}
