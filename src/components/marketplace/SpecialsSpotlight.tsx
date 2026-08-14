import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Salon, Service, Special } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import CountdownTimer from '@/components/CountdownTimer';

/** SpecialsSpotlight — mid-grid magenta band with up to 3 mini special cards (browse.md S5). */

export interface SpotlightItem {
  special: Special;
  service: Service;
  salon: Salon;
  price: number;
  original: number;
}

interface Props {
  items: SpotlightItem[];
}

export default function SpecialsSpotlight({ items }: Props) {
  if (!items.length) return null;
  return (
    <motion.div
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="col-span-full overflow-hidden rounded-ysl-l border p-6 sm:p-8"
      style={{ background: 'var(--ysl-special-soft)', borderColor: 'color-mix(in srgb, var(--ysl-special) 35%, transparent)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="eyebrow" style={{ color: 'var(--ysl-special)' }}>Don't miss</p>
        <Link
          to="/salons?specials=1"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[.15em]"
          style={{ color: 'var(--ysl-special)' }}
        >
          See all specials <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map(({ special, service, salon, price, original }, i) => (
          <motion.div
            key={special.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <Link
              to={`/salon/${salon.slug}#svc-${service.id}`}
              className="card-surface block p-4 transition-transform hover:-translate-y-1 hover:shadow-ysl-md"
              style={{ borderTop: '2px dashed var(--ysl-special)' }}
            >
              <p className="text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                {salon.name}
              </p>
              <h4 className="mt-1 font-serif text-lg font-semibold leading-tight">{service.name}</h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm line-through" style={{ color: 'var(--ysl-muted)' }}>{formatZARShort(original)}</span>
                <span className="font-serif text-xl font-bold" style={{ color: 'var(--ysl-special)' }}>{formatZARShort(price)}</span>
              </div>
              <div className="mt-2">
                <CountdownTimer endsAt={special.endsAt} variant="special" label="Ends in" compact />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
