import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { Salon } from '@/lib/store';
import { updateSalon, CATEGORIES, AREAS } from '@/lib/store';
import type { CategoryKey } from '@/lib/store';
import SalonCard from '@/components/SalonCard';
import { DashField, TabHeader, dashInputCls, dashInputStyle } from '@/components/dash/ui';

/** T1 · My store — live-preview profile editor (dashboard.md).
 *  Left: form. Right: sticky live SalonCard preview updating as they type. */

export default function StoreProfile({ salon }: { salon: Salon }) {
  const [name, setName] = useState(salon.name);
  const [blurb, setBlurb] = useState(salon.blurb);
  const [area, setArea] = useState(salon.area);
  const [categories, setCategories] = useState<CategoryKey[]>(salon.categories);
  const [saving, setSaving] = useState(false);

  const toggleCat = (key: CategoryKey) => {
    setCategories((prev) =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter((c) => c !== key) : prev
        : [...prev, key],
    );
  };

  const dirty = name !== salon.name || blurb !== salon.blurb || area !== salon.area
    || categories.join() !== salon.categories.join();

  const save = () => {
    if (!name.trim()) {
      toast.error('Your store needs a name.');
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      updateSalon(salon.id, { name: name.trim(), blurb: blurb.trim(), area, categories });
      setSaving(false);
      toast.success('Store updated ✓ — live on your page');
    }, 600);
  };

  // live preview object (rating/specials still resolve via salon.id in SalonCard)
  const preview: Salon = { ...salon, name: name.trim() || salon.name, blurb, area, categories };

  return (
    <div>
      <TabHeader
        title="My store"
        note="Everything here updates your public store page instantly."
        action={
          <Link to={`/salon/${salon.slug}`} className="btn btn-ghost !px-5 !py-2.5 text-[11px]">
            View my store <ExternalLink size={13} />
          </Link>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* form */}
        <div className="space-y-6">
          <DashField label="Store name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className={dashInputCls} style={dashInputStyle} placeholder="Glow by Ama" />
          </DashField>

          <DashField label="About your store" hint="Shown under your store name — keep it warm and student-proud.">
            <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={4}
              className={`${dashInputCls} resize-none`} style={dashInputStyle} />
          </DashField>

          <div>
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
              Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = categories.includes(c.key);
                return (
                  <button key={c.key} type="button" onClick={() => toggleCat(c.key)}
                    className="chip transition-all"
                    style={active
                      ? { background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }
                      : { background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)' }}>
                    <img src={c.icon} alt="" className="h-4 w-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <DashField label="Area">
            <select value={area} onChange={(e) => setArea(e.target.value)}
              className={dashInputCls} style={dashInputStyle}>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </DashField>

          {/* cover / gallery note */}
          <div className="flex gap-3 rounded-[var(--radius-m)] border border-dashed p-5"
            style={{ borderColor: 'var(--ysl-line)', background: 'var(--ysl-surface)' }}>
            <ImageIcon size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-muted)' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
              Cover photo and gallery are curated during admin vetting in this demo — your seeded cover stays live.
              Uploads arrive with the real backend.
            </p>
          </div>

          <div className="sticky bottom-4 z-10 lg:static">
            <button onClick={save} disabled={!dirty || saving} className="btn btn-primary w-full disabled:opacity-60 sm:w-auto">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'All changes saved'}
            </button>
          </div>
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[.18em]" style={{ color: 'var(--ysl-muted)' }}>
            Live preview — as students see you
          </p>
          <SalonCard salon={preview} />
        </div>
      </div>
    </div>
  );
}
