import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** GalleryGrid — masonry gallery with hover tags + lightbox (salon.md S5, graduation.md S3). */

export interface GalleryItem {
  src: string;
  tag?: string; // italic serif hover tag, e.g. "Boho bob · R380"
  to?: string; // optional salon link shown in lightbox/hover
}

interface Props {
  items: GalleryItem[];
  reveal?: boolean; // apply .reveal stagger to items
}

export default function GalleryGrid({ items, reveal = false }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) => setLightbox((i) => (i === null ? null : (i + dir + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, close, step]);

  if (!items.length) return null;

  return (
    <>
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {items.map((item, i) => (
          <motion.button
            key={item.src + i}
            type="button"
            onClick={() => setLightbox(i)}
            initial={reveal ? undefined : { opacity: 0, scale: 0.96 }}
            whileInView={reveal ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: (i % 8) * 0.06, duration: 0.5 }}
            className={`group relative block w-full overflow-hidden rounded-ysl-m ${reveal ? `reveal ${['delay-1', 'delay-2', 'delay-3', 'delay-4'][i % 4]}` : ''}`}
            style={{ breakInside: 'avoid' }}
          >
            <img
              src={item.src}
              alt={item.tag ?? 'Salon work'}
              loading="lazy"
              className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <span
              className="absolute inset-0 flex items-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(to top, rgba(36,18,51,.78), transparent 60%)' }}
            >
              {item.tag && (
                <span className="translate-y-3 font-serif text-lg italic text-white transition-transform duration-300 group-hover:translate-y-0">
                  {item.tag}
                </span>
              )}
            </span>
          </motion.button>
        ))}
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: 'rgba(20,8,32,.9)', backdropFilter: 'blur(6px)' }}
            onClick={close}
          >
            <motion.figure
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative max-h-[86dvh] max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={items[lightbox].src}
                alt={items[lightbox].tag ?? 'Salon work'}
                className="max-h-[76dvh] w-auto rounded-ysl-l object-contain"
              />
              <figcaption className="mt-3 flex items-center justify-between text-sm" style={{ color: 'var(--ysl-gold-light)' }}>
                <span className="font-serif text-lg italic">{items[lightbox].tag}</span>
                <span className="inline-flex items-center gap-4">
                  {items[lightbox].to && (
                    <Link to={items[lightbox].to!} className="underline underline-offset-4" style={{ color: '#fff' }}>
                      Visit store →
                    </Link>
                  )}
                  <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,.7)' }}>
                    {lightbox + 1} / {items.length}
                  </span>
                </span>
              </figcaption>

              <button aria-label="Previous" onClick={() => step(-1)}
                className="absolute -left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:-left-14">
                <ChevronLeft size={20} />
              </button>
              <button aria-label="Next" onClick={() => step(1)}
                className="absolute -right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:-right-14">
                <ChevronRight size={20} />
              </button>
              <button aria-label="Close" onClick={close}
                className="absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:rotate-90 hover:bg-white/30">
                <X size={18} />
              </button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
