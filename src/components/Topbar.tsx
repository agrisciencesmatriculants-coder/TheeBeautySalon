import { MapPin, Clock, Instagram, Facebook, Twitter, GraduationCap } from 'lucide-react';
import { Link } from 'react-router';
import { useStore, getNextGraduation } from '@/lib/store';
import { formatDate } from '@/lib/format';

/** Topbar — deep violet info strip (design.md §6.1). Becomes the gold grad
 *  banner while the graduation theme is on. */
export default function Topbar() {
  const gradTheme = useStore((s) => s.settings.gradTheme);
  const grad = useStore(() => getNextGraduation());

  return (
    <div className={`relative z-50 text-[12px] tracking-[.08em] ${gradTheme ? 'grad-banner' : ''}`}
      style={gradTheme ? undefined : { background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }}>
      <div className="container-ysl flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} /> <span className="hidden sm:inline">High Street, Grahamstown</span><span className="sm:hidden">Grahamstown</span>
          </span>
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <Clock size={13} /> Mon–Sat 9:00–19:00
          </span>
        </div>
        <div className="flex items-center gap-4">
          {gradTheme && grad && (
            <span className="chip chip-gold normal-case tracking-[.08em]">
              <GraduationCap size={13} /> Graduation {formatDate(grad.date)}
            </span>
          )}
          <span className="hidden items-center gap-3 sm:flex" aria-label="Socials">
            <a href="#" aria-label="Instagram" className="opacity-80 transition-opacity hover:opacity-100"><Instagram size={14} /></a>
            <a href="#" aria-label="Facebook" className="opacity-80 transition-opacity hover:opacity-100"><Facebook size={14} /></a>
            <a href="#" aria-label="Twitter" className="opacity-80 transition-opacity hover:opacity-100"><Twitter size={14} /></a>
          </span>
          <Link to="/admin/login" className="opacity-70 underline-offset-4 transition-opacity hover:opacity-100 hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
