import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/** BrevoModal — Brevo-branded transactional email preview (auth.md §Shared).
 *  Used by signup welcome, reset link, etc. Demo only — no real email sent. */

interface Props {
  open: boolean;
  onClose: () => void;
  /** recipient shown in the "to" line */
  to?: string;
  headline: string;
  children: ReactNode; // email body copy
  ctaLabel?: string;
  ctaHref?: string; // demo convenience link inside the rendered email
}

export default function BrevoModal({ open, onClose, to, headline, children, ctaLabel, ctaHref }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] backdrop-blur-sm"
            style={{ background: 'rgba(20,8,32,.55)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed left-1/2 top-1/2 z-[95] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2"
            role="dialog"
            aria-modal="true"
            aria-label="Email preview"
          >
            <div className="card-surface overflow-hidden" style={{ borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-lg)' }}>
              {/* modal header */}
              <div className="flex items-center justify-between border-b px-6 py-4 hairline">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[.2em]" style={{ color: 'var(--ysl-muted)' }}>
                    Email sent via Brevo{to ? ` · to ${to}` : ''}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close preview"
                  className="grid h-9 w-9 place-items-center rounded-full transition-all hover:rotate-90 hover:bg-ysl-lilac"
                  style={{ color: 'var(--ysl-ink)' }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* rendered email */}
              <div className="max-h-[70vh] overflow-y-auto p-5" style={{ background: 'var(--ysl-lilac)' }}>
                <div className="overflow-hidden rounded-lg bg-white shadow-sm" style={{ color: '#221327' }}>
                  {/* YSL header bar */}
                  <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'var(--ysl-violet-deep)' }}>
                    <img src="/ysl-logo.svg" alt="YSL" className="h-8 w-8" />
                    <span className="font-serif text-lg font-semibold italic" style={{ color: 'var(--ysl-gold-light)' }}>
                      Young Space Lighty
                    </span>
                  </div>
                  <div className="px-7 py-7">
                    <h3 className="font-serif text-2xl font-semibold leading-tight">{headline}</h3>
                    <div className="mt-3 text-[15px] leading-relaxed" style={{ color: '#4a3d55' }}>
                      {children}
                    </div>
                    {ctaLabel && ctaHref && (
                      <Link
                        to={ctaHref}
                        onClick={onClose}
                        className="mt-6 inline-flex items-center justify-center rounded-full px-7 py-3 text-[13px] font-medium uppercase tracking-[.15em] text-white"
                        style={{ background: 'var(--ysl-purple)' }}
                      >
                        {ctaLabel}
                      </Link>
                    )}
                    {ctaLabel && ctaHref && (
                      <p className="mt-4 text-xs" style={{ color: '#8a7d95' }}>
                        Demo: <Link to={ctaHref} onClick={onClose} className="underline" style={{ color: 'var(--ysl-purple)' }}>open the reset link →</Link>
                      </p>
                    )}
                  </div>
                  <div className="border-t px-7 py-4 text-center text-[11px]" style={{ borderColor: '#eee', color: '#8a7d95' }}>
                    Sent with Brevo · Young Space Lighty (YSL) Mega Beauty Salon, Grahamstown
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
