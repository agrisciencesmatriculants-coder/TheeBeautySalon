import { Link } from 'react-router';
import { motion } from 'framer-motion';
import type { Salon, Service, Special } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';

/** GradSpecialCard — large graduation special card (graduation.md S2). */

interface Props {
  special: Special;
  service: Service;
  salon: Salon;
  price: number;
  original: number;
  percentOff: number | null;
  gradTheme: boolean;
  index?: number;
}

export default function GradSpecialCard({ special, service, salon, price, original, percentOff, gradTheme, index = 0 }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24, delay: index * 0.06 }}
      className="card-surface group overflow-hidden hover:shadow-ysl-lg"
    >
      {/* image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={service.image}
          alt={service.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span
            className={`chip ${gradTheme ? 'shimmer-text font-bold' : ''}`}
            style={
              gradTheme
                ? { background: 'var(--ysl-violet-deep)', border: '1px solid var(--grad-gold)' }
                : { background: 'transparent', border: '1px solid var(--ysl-gold)', color: 'var(--ysl-violet-deep)', backdropFilter: 'blur(6px)' }
            }
          >
            Grad special
          </span>
          {percentOff !== null && (
            <span className="chip" style={{ background: 'var(--ysl-special)', color: '#fff' }}>
              −{percentOff}%
            </span>
          )}
        </div>
      </div>

      {/* body */}
      <div className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
          <Link to={`/salon/${salon.slug}`} className="transition-colors hover:text-ysl-purple">
            {salon.name}
          </Link>{' '}
          · {salon.area}
        </p>
        <h3 className="mt-1 font-serif text-[1.5rem] font-semibold leading-tight">{service.name}</h3>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-[1.05rem] line-through" style={{ color: 'var(--ysl-muted)' }}>
            {formatZARShort(original)}
          </span>
          <span className="font-serif text-[1.8rem] font-bold leading-none" style={{ color: 'var(--ysl-special)' }}>
            {formatZARShort(price)}
          </span>
        </div>

        <div className="mt-2">
          <CountdownTimer endsAt={special.endsAt} variant="special" label="Ends ceremony week ·" compact />
        </div>

        <Link to={`/book/${salon.id}/${service.id}`} className="btn btn-gold mt-4 w-full !py-3 text-[11px]">
          Book the look
        </Link>
      </div>
    </motion.article>
  );
}
