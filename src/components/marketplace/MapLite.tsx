import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { Salon } from '@/lib/store';
import { AREAS, fromPrice } from '@/lib/store';
import { formatZARShort } from '@/lib/format';

/** MapLite — stylised static "map" of Grahamstown with salon pins (browse.md S6). */

/** Deterministic hash → spread multiple pins in the same area. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Base pin coordinates per area (SVG viewBox 640x420). */
const AREA_POS: Record<string, { x: number; y: number }> = {
  'High Street': { x: 250, y: 205 },
  'New Street': { x: 300, y: 140 },
  Kingsway: { x: 470, y: 320 },
  Oatlands: { x: 490, y: 95 },
  Fiddlers: { x: 180, y: 320 },
  'Campus res': { x: 100, y: 250 },
};

function pinPos(salon: Salon, index: number): { x: number; y: number } {
  const base = AREA_POS[salon.area] ?? { x: 320, y: 210 };
  const h = hash(salon.id);
  const angle = (h % 360) * (Math.PI / 180);
  const r = index === 0 ? 0 : 18 + (h % 14);
  return { x: base.x + Math.cos(angle) * r, y: base.y + Math.sin(angle) * r };
}

interface Props {
  salons: Salon[];
  onArea: (area: string) => void;
  activeArea: string;
}

export default function MapLite({ salons, onArea, activeArea }: Props) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);

  const counts = AREAS.map((a) => ({ area: a, n: salons.filter((s) => s.area === a).length })).filter((c) => c.n > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* map card */}
      <div className="card-surface reveal overflow-hidden p-4 lg:col-span-2">
        <svg viewBox="0 0 640 420" className="h-auto w-full" role="img" aria-label="Stylised map of Grahamstown salons">
          {/* ground */}
          <rect x="0" y="0" width="640" height="420" rx="10" fill="var(--ysl-lilac)" />
          {/* campus block */}
          <rect x="30" y="190" width="150" height="130" rx="10" fill="var(--ysl-purple)" opacity=".12" />
          <text x="105" y="262" textAnchor="middle" fontSize="12" letterSpacing="3" fill="var(--ysl-purple)" style={{ textTransform: 'uppercase' }}>
            RHODES
          </text>
          {/* streets */}
          <g stroke="var(--ysl-surface)" strokeWidth="14" strokeLinecap="round">
            <line x1="30" y1="205" x2="610" y2="205" /> {/* High Street axis */}
            <line x1="120" y1="140" x2="610" y2="140" /> {/* New Street */}
            <line x1="60" y1="320" x2="560" y2="320" /> {/* Kingsway */}
            <line x1="250" y1="30" x2="250" y2="390" />
            <line x1="420" y1="30" x2="420" y2="390" />
            <line x1="520" y1="60" x2="520" y2="380" />
          </g>
          <g fontSize="11" letterSpacing="2" fill="var(--ysl-muted)">
            <text x="330" y="193">HIGH STREET</text>
            <text x="330" y="128">NEW STREET</text>
            <text x="330" y="308">KINGSWAY</text>
          </g>

          {/* pins */}
          {salons.map((salon, i) => {
            const areaIdx = salons.filter((s) => s.area === salon.area).findIndex((s) => s.id === salon.id);
            const { x, y } = pinPos(salon, areaIdx);
            const price = fromPrice(salon.id);
            const hovered = hover === salon.id;
            return (
              <motion.g
                key={salon.id}
                initial={{ y: -30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/salon/${salon.slug}`)}
                onMouseEnter={() => setHover(salon.id)}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={x} cy={y} r={hovered ? 13 : 10} fill="var(--ysl-purple)" stroke="#fff" strokeWidth="2.5" />
                <circle cx={x} cy={y} r="3" fill="#fff" />
                {hovered && (
                  <g>
                    <rect
                      x={Math.min(Math.max(x - 90, 8), 460)}
                      y={y - 62}
                      width="180"
                      height="46"
                      rx="8"
                      fill="var(--ysl-violet-deep)"
                    />
                    <text x={Math.min(Math.max(x - 90, 8), 460) + 90} y={y - 42} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#fff">
                      {salon.name.length > 22 ? salon.name.slice(0, 21) + '…' : salon.name}
                    </text>
                    <text x={Math.min(Math.max(x - 90, 8), 460) + 90} y={y - 26} textAnchor="middle" fontSize="11" fill="var(--ysl-gold-light)">
                      {price !== null ? `from ${formatZARShort(price)}` : salon.area}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </svg>
        <p className="mt-2 text-center text-xs" style={{ color: 'var(--ysl-muted)' }}>
          All salons within walking distance of Rhodes campus.
        </p>
      </div>

      {/* area list */}
      <div className="reveal delay-1 flex flex-col gap-2">
        {counts.map(({ area, n }) => (
          <button
            key={area}
            onClick={() => onArea(activeArea === area ? '' : area)}
            className="card-surface flex items-center justify-between px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
            style={activeArea === area ? { borderColor: 'var(--ysl-purple)', boxShadow: 'var(--glow-purple)' } : undefined}
          >
            <span className="inline-flex items-center gap-2.5 text-sm font-medium">
              <MapPin size={15} style={{ color: 'var(--ysl-purple)' }} />
              {area}
            </span>
            <span className="chip chip-lilac">{n} salon{n === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
