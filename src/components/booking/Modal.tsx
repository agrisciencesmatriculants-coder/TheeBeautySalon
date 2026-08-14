/** Modal — scrim + spring panel (design.md §6.11), owned by the booking pages. */
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
  /** When true, clicking the scrim / X will not close (destructive confirmations). */
  locked?: boolean;
}

export default function Modal({ open, onClose, title, children, wide = false, locked = false }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4">
          <motion.div
            className="fixed inset-0"
            style={{ background: 'rgba(20,8,32,.55)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={locked ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`card-surface relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-ysl-l p-7 shadow-ysl-lg`}
            initial={{ opacity: 0, y: 44, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            {(title || !locked) && (
              <div className="mb-4 flex items-start justify-between gap-4">
                {title ? <h3 className="font-serif text-2xl font-semibold leading-tight">{title}</h3> : <span />}
                {!locked && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all hover:rotate-90"
                    style={{ border: '1px solid var(--ysl-line)', color: 'var(--ysl-muted)' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
