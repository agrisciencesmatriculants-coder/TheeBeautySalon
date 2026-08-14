import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import type { Service, Special } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';
import { categoryIcon, formatDuration } from '@/components/marketplace/utils';

/** ServiceCard — service with special-aware pricing (design.md §6.5, salon.md S4). */

export interface ServicePricing {
  price: number;
  original: number;
  special: Special | null;
  percentOff: number | null;
}

interface Props {
  service: Service;
  pricing: ServicePricing;
  flash?: boolean; // purple outline pulse (specials banner click)
  bookLabel?: string; // override CTA label
}

export default function ServiceCard({ service, pricing, flash = false, bookLabel }: Props) {
  const { price, original, special, percentOff } = pricing;
  const onSpecial = special !== null;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      animate={
        flash
          ? { boxShadow: ['0 0 0 0 rgba(139,92,246,0)', '0 0 0 4px rgba(139,92,246,.55)', '0 0 0 0 rgba(139,92,246,0)', '0 0 0 4px rgba(139,92,246,.55)', '0 0 0 0 rgba(139,92,246,0)'] }
          : { boxShadow: '0 0 0 0 rgba(139,92,246,0)' }
      }
      transition={flash ? { duration: 1.6 } : { duration: 0.3 }}
      id={`svc-${service.id}`}
      className="card-surface group relative flex flex-col overflow-hidden p-5"
      style={
        onSpecial
          ? {
              background: 'color-mix(in srgb, var(--ysl-special-soft) 32%, var(--ysl-surface))',
              borderTop: '2px dashed var(--ysl-special)',
            }
          : undefined
      }
    >
      {/* hover gradient rule */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: 'linear-gradient(90deg, var(--ysl-purple), var(--ysl-gold))' }}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{ background: 'linear-gradient(135deg, var(--ysl-violet), var(--ysl-purple))' }}
        >
          <img src={categoryIcon(service.category)} alt="" className="h-6 w-6 invert" />
        </span>
        {onSpecial && percentOff !== null && (
          <motion.span
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="chip"
            style={{ background: 'var(--ysl-special)', color: '#fff' }}
          >
            -{percentOff}%
          </motion.span>
        )}
      </div>

      <h3 className="mt-4 font-serif text-[1.45rem] font-semibold leading-tight">{service.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
        {service.blurb}
      </p>

      <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        <Clock size={13} /> {formatDuration(service.durationMin)}
      </span>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-4 hairline">
        <div>
          {onSpecial ? (
            <>
              <span className="mr-2 align-middle text-[1.05rem] line-through" style={{ color: 'var(--ysl-muted)' }}>
                {formatZARShort(original)}
              </span>
              <span className="font-serif text-[1.7rem] font-bold leading-none" style={{ color: 'var(--ysl-special)' }}>
                {formatZARShort(price)}
              </span>
              {special && (
                <div className="mt-1.5">
                  <CountdownTimer endsAt={special.endsAt} variant="special" label="Ends in" compact />
                </div>
              )}
            </>
          ) : (
            <span className="font-serif text-[1.7rem] font-bold leading-none">{formatZARShort(price)}</span>
          )}
        </div>

        {onSpecial ? (
          <Link to={`/book/${service.salonId}/${service.id}`} className="btn btn-gold !px-5 !py-2.5 text-[11px]">
            {bookLabel ?? `Book at ${formatZARShort(price)}`}
          </Link>
        ) : (
          <Link
            to={`/book/${service.salonId}/${service.id}`}
            className="group/link inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[.15em]"
            style={{ color: 'var(--ysl-purple)' }}
          >
            {bookLabel ?? 'Book'}
            <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-1" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
