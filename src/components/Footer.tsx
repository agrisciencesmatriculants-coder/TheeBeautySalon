import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Instagram, Facebook, Twitter, Mail, X, Lock } from 'lucide-react';
import { toast } from 'sonner';

/** Footer — deep violet, 4 columns + newsletter + bottom bar (design.md §6.14). */
export default function Footer() {
  const [email, setEmail] = useState('');
  const [brevoOpen, setBrevoOpen] = useState(false);

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    toast.success("You're on the list — sent via Brevo.");
    setBrevoOpen(true);
    setEmail('');
  };

  const cols: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: 'Explore',
      links: [
        { label: 'Salons', to: '/salons' },
        { label: 'Specials', to: '/salons?specials=1' },
        { label: 'Top 5 leaderboard', to: '/#leaderboard' },
        { label: 'Graduation', to: '/graduation' },
      ],
    },
    {
      title: 'For students',
      links: [
        { label: 'Sign up', to: '/signup' },
        { label: 'How booking works', to: '/#how-it-works' },
        { label: 'Payment help', to: '/#how-it-works' },
        { label: 'My reviews', to: '/account' },
      ],
    },
    {
      title: 'For salon owners',
      links: [
        { label: 'Open your salon', to: '/signup?role=owner' },
        { label: 'Owner dashboard', to: '/dashboard' },
        { label: 'Specials guide', to: '/dashboard' },
      ],
    },
  ];

  return (
    <footer className="deep-section">
      <div className="container-ysl relative z-10 grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
        {/* brand */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <img src="/ysl-logo.svg" alt="YSL seal" className="h-12 w-12" />
            <span>
              <span className="block font-serif text-xl font-semibold italic text-white">Young Space Lighty</span>
              <span className="block text-[9px] font-medium uppercase tracking-[.3em]" style={{ color: 'var(--ysl-gold-light)' }}>
                Mega Beauty Salon · Grahamstown
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm font-light" style={{ color: 'rgba(242,236,250,.65)' }}>
            The student beauty-salon marketplace of Rhodes University. Real schedules, honest ZAR prices,
            secure payment codes via Youna Venture Vault.
          </p>
          <div className="mt-5 flex gap-3">
            {[Instagram, Facebook, Twitter].map((Icon, i) => (
              <a key={i} href="#" aria-label="social"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 transition-colors hover:border-[var(--ysl-gold)] hover:text-[var(--ysl-gold-light)]">
                <Icon size={15} />
              </a>
            ))}
          </div>
          {/* newsletter */}
          <form onSubmit={subscribe} className="mt-7 flex max-w-sm overflow-hidden rounded-full border border-white/20">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@gmail.com"
              aria-label="Newsletter email"
              className="w-full bg-transparent px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button type="submit" className="btn !rounded-none !px-5 text-[11px]"
              style={{ background: 'var(--ysl-purple)', color: '#fff' }}>
              Join
            </button>
          </form>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h4 className="text-[11px] font-medium uppercase tracking-[.3em]" style={{ color: 'var(--ysl-gold-light)' }}>
              {col.title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm font-light transition-colors hover:text-[var(--ysl-gold-light)]"
                    style={{ color: 'rgba(242,236,250,.7)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-ysl relative z-10 flex flex-col items-center justify-between gap-3 py-5 text-[12px] font-light md:flex-row"
          style={{ color: 'rgba(242,236,250,.55)' }}>
          <p>© 2026 Young Space Lighty (YSL) Mega Beauty Salon · Grahamstown, Makhanda</p>
          <p className="inline-flex items-center gap-2">
            <img src="/vault-logo.svg" alt="Youna Venture Vault" className="h-4 w-auto rounded-sm bg-white/90 px-1" />
            Payments via Youna Venture Vault
          </p>
          <p className="flex gap-4">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <Link to="/admin/login" className="hover:text-white">Admin</Link>
          </p>
        </div>
      </div>

      {/* Brevo email preview modal (demo) */}
      <AnimatePresence>
        {brevoOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(20,8,32,.55)] p-4 backdrop-blur-sm"
            onClick={() => setBrevoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="card-surface w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b p-5 hairline">
                <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                  <Mail size={14} /> Email sent via Brevo
                </span>
                <button onClick={() => setBrevoOpen(false)} aria-label="Close" className="transition-transform hover:rotate-90">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6" style={{ background: 'var(--ysl-cream)' }}>
                <div className="rounded-ysl-m border p-6 text-center hairline" style={{ background: 'var(--ysl-surface)' }}>
                  <img src="/ysl-logo.svg" alt="" className="mx-auto h-12 w-12" />
                  <h3 className="mt-3 font-serif text-2xl font-semibold">You're on the list</h3>
                  <p className="mt-2 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                    Salon openings, specials drops and graduation-season news — straight to your inbox.
                    Welcome to Young Space Lighty.
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                    <Lock size={11} /> Delivered by Brevo · unsubscribe anytime
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
