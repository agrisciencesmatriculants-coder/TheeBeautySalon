import { Link, useNavigate } from 'react-router';
import { ArrowRight, Heart } from 'lucide-react';
import { useState } from 'react';
import type { Salon } from '@/lib/store';
import {
  useStore, getSalonRating, getSpecialsBySalon, isSpecialLive, fromPrice,
  openCaption, isOpenNow, getLeaderboard, getCurrentUser, toggleFavourite,
} from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import RatingStars from '@/components/RatingStars';

/** SalonCard — marketplace salon card (design.md §6.4). */

interface Props {
  salon: Salon;
  className?: string;
}

export default function SalonCard({ salon, className = '' }: Props) {
  const navigate = useNavigate();
  const rating = useStore(() => getSalonRating(salon.id));
  const hasSpecial = useStore(() => getSpecialsBySalon(salon.id).some((sp) => isSpecialLive(sp)));
  const price = useStore(() => fromPrice(salon.id));
  const rank = useStore(() => getLeaderboard(5).find((e) => e.salon.id === salon.id)?.rank ?? null);
  const isFav = useStore((s) => {
    const uid = s.sessionUserId;
    return uid ? (s.users.find((u) => u.id === uid)?.favourites.includes(salon.id) ?? false) : false;
  });
  const [heartPop, setHeartPop] = useState(false);
  const open = isOpenNow(salon);

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getCurrentUser()) {
      navigate(`/login?next=/salon/${salon.slug}`);
      return;
    }
    toggleFavourite(salon.id);
    setHeartPop(true);
    window.setTimeout(() => setHeartPop(false), 400);
  };

  return (
    <Link
      to={`/salon/${salon.slug}`}
      className={`card-surface group relative block overflow-hidden hover:-translate-y-2 hover:shadow-ysl-lg ${className}`}
    >
      {/* cover */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={salon.cover}
          alt={salon.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-[rgba(36,18,51,.65)] via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[.15em] text-white">
            View store <ArrowRight size={15} />
          </span>
        </div>
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="chip chip-lilac">Student business</span>
          {hasSpecial && <span className="chip" style={{ background: 'var(--ysl-special)', color: '#fff' }}>-30% Special</span>}
        </div>
        <button
          onClick={onHeart}
          aria-label="Favourite"
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 backdrop-blur transition-transform ${heartPop ? 'scale-125' : ''}`}
        >
          <Heart size={17} fill={isFav ? 'var(--ysl-purple)' : 'none'} color={isFav ? 'var(--ysl-purple)' : 'var(--ysl-violet-deep)'} />
        </button>
      </div>

      {/* body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[1.4rem] font-semibold leading-tight">{salon.name}</h3>
            <p className="mt-0.5 text-xs uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              {salon.area} · {salon.distanceKm.toFixed(1)} km
            </p>
          </div>
          {rank && (
            <span className="relative grid h-11 w-11 shrink-0 place-items-center" title={`Top 5 · Rank ${rank}`}>
              <img src="/laurel.svg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ transform: 'scale(1.4)' }} />
              <span className="relative font-serif text-lg font-bold" style={{ color: 'var(--ysl-gold)' }}>{rank}</span>
            </span>
          )}
        </div>
        <div className="mt-2">
          <RatingStars rating={rating.avg} count={rating.count} />
        </div>
        {price !== null && (
          <p className="mt-2 font-serif text-lg font-bold">
            from {formatZARShort(price)}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t pt-3 hairline">
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
