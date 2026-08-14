import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';

/** AuthShell — split-screen luxury auth layout (auth.md).
 *  Left: form panel. Right (desktop): /auth-side.png with violet scrim,
 *  gold serif quote + YSL seal. Mobile: image collapses to a slim banner. */

interface Props {
  eyebrow: string;
  title: ReactNode; // H1 — include <em> for italic accent
  lead?: string;
  children: ReactNode;
  wide?: boolean;
}

export default function AuthShell({ eyebrow, title, lead, children, wide = false }: Props) {
  return (
    <div className="grid lg:min-h-[calc(100dvh-120px)] lg:grid-cols-2">
      {/* form panel */}
      <div className="flex flex-col">
        {/* mobile banner strip */}
        <div className="relative h-36 overflow-hidden lg:hidden">
          <img src="/auth-side.png" alt="" className="h-full w-full object-cover object-top" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(36,18,51,.25), rgba(36,18,51,.72))' }} />
          <img src="/ysl-logo.svg" alt="YSL" className="absolute bottom-3 left-5 h-10 w-10" />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}
          >
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display-2 mt-4 text-balance [&_em]:italic [&_em]:text-ysl-purple">{title}</h1>
            {lead && <p className="lead mt-4">{lead}</p>}
            <div className="mt-9">{children}</div>
          </motion.div>
        </div>
      </div>

      {/* image panel */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src="/auth-side.png" alt="Student getting braids done at a YSL salon" className="kenburns absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(200deg, rgba(36,18,51,.15) 0%, rgba(36,18,51,.55) 55%, rgba(36,18,51,.88) 100%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <Link to="/" className="inline-block">
            <img src="/ysl-logo.svg" alt="YSL seal" className="h-14 w-14" />
          </Link>
          <blockquote className="mt-6 max-w-md font-serif text-3xl font-medium italic leading-snug text-ysl-gold-light">
            “Booked my grad glam between lectures.”
          </blockquote>
          <p className="mt-3 text-[12px] font-medium uppercase tracking-[.3em]" style={{ color: 'rgba(242,236,250,.75)' }}>
            Anelisa · 3rd year, Rhodes University
          </p>
        </div>
      </div>
    </div>
  );
}
