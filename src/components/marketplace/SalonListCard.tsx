import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { Salon } from '@/lib/store';
import { useStore, getSalonRating, getSpecialsBySalon, isSpecialLive, fromPrice, openCaption, isOpenNow, getServicesBySalon, getDiscountedPrice, getLeaderboard } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import RatingStars from '@/components/RatingStars';

/** SalonListCard — horizontal list-view variant of SalonCard (browse.md S4). */

interface Props {
  salon: Salon;
}

export default function SalonListCard({ salon }: Props) {
  const rating = useStore(() => getSalonRating(salon.id));
  const hasSpecial = useStore(() => getSpecialsBySalon(salon.id).some((sp) => isSpecialLive(sp)));
  const price = useStore(() => fromPrice(salon.id));
  const topServices = useStore(() =>
    getServicesBySalon(salon.id)
      .map((sv) => ({ sv, p: getDiscountedPrice(sv.id) }))
      .sort((a, b) => a.p.price - b.p.price)
      .slice(0, 3),
  );
  const rank = useStore(() => getLeaderboard(5).find((e) => e.salon.id === salon.id)?.rank ?? null);
  const open = isOpenNow(salon);

  return (
    <Link
      to={`/salon/${salon.slug}`}
      className="card-surface group flex flex-col overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-ysl-lg sm:flex-row"
    >
      {/* cover */}
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden sm:aspect-auto sm:w-[280px]">
        <img
          src={salon.cover}
          alt={salon.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="chip chip-lilac">Student business</span>
          {hasSpecial && <span className="chip" style={{ background: 'var(--ysl-special)', color: '#fff' }}>Special</span>}
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[1.5rem] font-semibold leading-tight">{salon.name}</h3>
            <p className="mt-0.5 text-xs uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              {salon.area} · {salon.distanceKm.toFixed(1)} km from campus
            </p>
          </div>
          {rank && (
            <span className="relative grid h-11 w-11 shrink-0 place-items-center" title={`Top 5 · Rank ${rank}`}>
              <img src="/laurel.svg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ transform: 'scale(1.4)' }} />
              <span className="relative font-serif text-lg font-bold" style={{ color: 'var(--ysl-gold)' }}>{rank}</span>
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RatingStars rating={rating.avg} count={rating.count} />
          {price !== null && <span className="font-serif text-lg font-bold">from {formatZARShort(price)}</span>}
        </div>

        <p className="mt-2 line-clamp-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>{salon.blurb}</p>

        {/* top-3 service "from" list */}
        {topServices.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {topServices.map(({ sv, p }) => (
              <li key={sv.id} className="flex items-baseline justify-between gap-4">
                <span className="truncate">{sv.name}</span>
                <span className="shrink-0">
                  {p.special && (
                    <span className="mr-1.5 line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZARShort(p.original)}</span>
                  )}
                  <span className="font-serif font-bold" style={p.special ? { color: 'var(--ysl-special)' } : undefined}>
                    {formatZARShort(p.price)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-3 hairline" style={{ marginTop: 'auto', paddingTop: 12 }}>
          <span className="inline-flex items-center gap-2 text-xs font-medium"
            style={{ color: open ? 'var(--ysl-success)' : 'var(--ysl-muted)' }}>
            {open && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ysl-success)' }} />}
            {openCaption(salon)}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium uppercase tracking-[.14em]" style={{ color: 'var(--ysl-purple)' }}>
            View store <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
