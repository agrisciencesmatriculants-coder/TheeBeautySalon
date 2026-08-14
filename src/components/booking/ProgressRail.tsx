/** ProgressRail — 4-step booking flow rail (booking.md: global chrome). */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const STEPS = ['Slot', 'Details', 'Payment code', 'Confirmed'];

export default function ProgressRail({ current, className = '' }: { current: number; className?: string }) {
  return (
    <div className={`flex items-start justify-center ${className}`} aria-label={`Booking progress: step ${current} of 4`}>
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-start">
            {i > 0 && (
              <div className="relative mx-2 mt-[17px] h-px w-8 overflow-hidden sm:mx-3 sm:w-14" style={{ background: 'var(--ysl-line)' }}>
                <motion.div
                  className="absolute inset-0 origin-left"
                  style={{ background: 'var(--ysl-purple)' }}
                  initial={false}
                  animate={{ scaleX: current >= step ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
            <div className="flex w-14 flex-col items-center gap-2 sm:w-20">
              <motion.div
                initial={false}
                animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-medium tracking-wide"
                style={{
                  background: done ? 'var(--ysl-success)' : active ? 'var(--ysl-purple)' : 'transparent',
                  color: done || active ? '#fff' : 'var(--ysl-muted)',
                  border: done || active ? 'none' : '1px solid var(--ysl-line)',
                  boxShadow: active ? 'var(--glow-purple)' : 'none',
                }}
              >
                {done ? <Check size={15} strokeWidth={3} /> : step}
              </motion.div>
              <span
                className="text-center text-[10px] font-medium uppercase tracking-[.14em] sm:text-[11px]"
                style={{ color: active ? 'var(--ysl-purple)' : done ? 'var(--ysl-success)' : 'var(--ysl-muted)' }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
