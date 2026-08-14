import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Minus, AlertTriangle } from 'lucide-react';
import type { Salon, Service, CategoryKey } from '@/lib/store';
import {
  useStoreState, createService, updateService, deleteService, cancelBooking,
  getSpecialForService, isSpecialLive, CATEGORIES, todayIso,
} from '@/lib/store';
import { formatZAR, formatCountdown, formatDateShort } from '@/lib/format';
import { Drawer, Toggle, TabHeader, DashField, dashInputCls, dashInputStyle, EmptyState } from '@/components/dash/ui';

/** T2 · Services manager (dashboard.md): card list with inline price editing,
 *  active toggles, special chips, add/edit drawer, guarded delete. */

const CAT_IMAGE: Record<CategoryKey, string> = {
  braids: '/work-braids.png', nails: '/work-nails.png', lashes: '/work-lashes.png',
  makeup: '/work-makeup.png', barber: '/work-fade.png', skin: '/work-curls.png',
};

interface Draft {
  id?: string;
  name: string;
  category: CategoryKey;
  blurb: string;
  durationMin: number;
  price: number;
  active: boolean;
}

const blankDraft = (salon: Salon): Draft => ({
  name: '', category: salon.categories[0] ?? 'braids', blurb: '', durationMin: 60, price: 150, active: true,
});

export default function ServicesTab({ salon }: { salon: Salon }) {
  const state = useStoreState();
  const services = useMemo(
    () => state.services.filter((s) => s.salonId === salon.id),
    [state, salon.id],
  );
  const [filter, setFilter] = useState<CategoryKey | 'all'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => blankDraft(salon));
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const shown = filter === 'all' ? services : services.filter((s) => s.category === filter);
  const usedCats = Array.from(new Set(services.map((s) => s.category)));

  const openAdd = () => { setDraft(blankDraft(salon)); setDrawerOpen(true); };
  const openEdit = (s: Service) => {
    setDraft({ id: s.id, name: s.name, category: s.category, blurb: s.blurb, durationMin: s.durationMin, price: s.price, active: s.active });
    setDrawerOpen(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) { toast.error('Give the service a name.'); return; }
    if (draft.price <= 0) { toast.error('Price must be more than R0.'); return; }
    if (draft.id) {
      updateService(draft.id, { ...draft, name: draft.name.trim(), blurb: draft.blurb.trim() });
      toast.success('Service updated ✓');
    } else {
      createService({
        salonId: salon.id, name: draft.name.trim(), category: draft.category,
        blurb: draft.blurb.trim(), durationMin: draft.durationMin, price: Math.round(draft.price),
        image: CAT_IMAGE[draft.category], active: draft.active,
      });
      toast.success('Service added — live on your store ✓');
    }
    setDrawerOpen(false);
  };

  const commitPrice = (s: Service) => {
    const v = Math.round(Number(priceDraft));
    if (Number.isFinite(v) && v > 0 && v !== s.price) {
      updateService(s.id, { price: v });
      setFlashId(s.id);
      window.setTimeout(() => setFlashId(null), 900);
    }
    setPriceEditId(null);
  };

  const affectedBookings = deleteTarget
    ? state.bookings.filter((b) => b.serviceId === deleteTarget.id && b.date >= todayIso()
        && ['held', 'code-issued', 'confirming', 'confirmed'].includes(b.status))
    : [];

  const confirmDelete = () => {
    if (!deleteTarget) return;
    affectedBookings.forEach((b) => cancelBooking(b.id));
    deleteService(deleteTarget.id);
    toast.success(affectedBookings.length
      ? `Deleted — ${affectedBookings.length} upcoming booking${affectedBookings.length === 1 ? '' : 's'} auto-cancelled and customers notified.`
      : 'Service deleted.');
    setDeleteTarget(null);
  };

  return (
    <div>
      <TabHeader
        title="Services"
        note="Prices in ZAR. Click a price to edit it inline — changes go live instantly."
        action={<button onClick={openAdd} className="btn btn-primary !px-5 !py-2.5 text-[11px]"><Plus size={14} /> Add service</button>}
      />

      {/* category filter pills */}
      {usedCats.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', ...usedCats] as const).map((c) => (
            <button key={c} onClick={() => setFilter(c as CategoryKey | 'all')}
              className="chip transition-all"
              style={filter === c
                ? { background: 'var(--ysl-violet-deep)', color: 'var(--ysl-gold-light)' }
                : { background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)' }}>
              {c === 'all' ? 'All' : CATEGORIES.find((x) => x.key === c)?.label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card-surface">
          <EmptyState title="No services yet" note="Add your first service — name, duration and a ZAR price."
            action={<button onClick={openAdd} className="btn btn-primary !py-2.5 text-[11px]"><Plus size={14} /> Add service</button>} />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((s, i) => {
            const special = getSpecialForService(s.id);
            const live = special && isSpecialLive(special);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card-surface flex flex-wrap items-center gap-4 p-4 sm:px-5"
                style={!s.active ? { opacity: 0.62 } : flashId === s.id ? { boxShadow: '0 0 0 3px rgba(212,175,106,.5)' } : undefined}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                  style={{ background: 'var(--ysl-lilac)' }}>
                  <img src={CATEGORIES.find((c) => c.key === s.category)?.icon} alt="" className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg font-semibold leading-tight">{s.name}</p>
                  <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>
                    {CATEGORIES.find((c) => c.key === s.category)?.label} · {s.durationMin} min
                  </p>
                </div>

                {live && (
                  <span className="chip chip-special" title={`Ends ${formatCountdown(special.endsAt - Date.now())}`}>
                    −{special.kind === 'percent' ? `${special.value}%` : formatZAR(special.value)} by {special.createdBy} · ends in {formatCountdown(special.endsAt - Date.now())}
                  </span>
                )}

                {/* inline price edit */}
                {priceEditId === s.id ? (
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    onBlur={() => commitPrice(s)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitPrice(s); if (e.key === 'Escape') setPriceEditId(null); }}
                    className="w-28 rounded-[var(--radius-s)] border border-ysl-purple px-3 py-1.5 font-serif text-lg font-bold outline-none"
                    style={dashInputStyle}
                  />
                ) : (
                  <button
                    onClick={() => { setPriceEditId(s.id); setPriceDraft(String(s.price)); }}
                    className="rounded-md px-2 py-1 font-serif text-xl font-bold transition-colors hover:bg-ysl-lilac"
                    title="Click to edit price"
                  >
                    {formatZAR(s.price)}
                  </button>
                )}

                <Toggle on={s.active} onChange={(v) => { updateService(s.id, { active: v }); toast.success(v ? 'Service is live ✓' : 'Service hidden from your store.'); }} label={`Toggle ${s.name}`} />

                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-ysl-lilac" style={{ color: 'var(--ysl-ink)' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteTarget(s)} aria-label={`Delete ${s.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-ysl-special-soft" style={{ color: 'var(--ysl-danger)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* add / edit drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={draft.id ? 'Edit service' : 'Add a service'}>
        <div className="space-y-5">
          <DashField label="Service name">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Knotless Braids (Waist)" className={dashInputCls} style={dashInputStyle} />
          </DashField>

          <DashField label="Category">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CategoryKey })}
              className={dashInputCls} style={dashInputStyle}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </DashField>

          <DashField label="Duration" hint="Slots are fitted to this in 15-minute steps.">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDraft({ ...draft, durationMin: Math.max(15, draft.durationMin - 15) })}
                className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-ysl-lilac hairline" aria-label="Shorter">
                <Minus size={15} />
              </button>
              <span className="min-w-[90px] text-center font-serif text-2xl font-semibold">{draft.durationMin} min</span>
              <button type="button" onClick={() => setDraft({ ...draft, durationMin: Math.min(480, draft.durationMin + 15) })}
                className="grid h-10 w-10 place-items-center rounded-full border transition-colors hover:bg-ysl-lilac hairline" aria-label="Longer">
                <Plus size={15} />
              </button>
            </div>
          </DashField>

          <DashField label="Price (ZAR)">
            <input type="number" min={1} value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className={dashInputCls} style={dashInputStyle} placeholder="250" />
            <motion.span key={draft.price} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 block font-serif text-3xl font-bold" style={{ color: 'var(--ysl-gold)' }}>
              {formatZAR(draft.price || 0)}
            </motion.span>
          </DashField>

          <DashField label="Description">
            <textarea value={draft.blurb} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} rows={3}
              placeholder="What makes it special?" className={`${dashInputCls} resize-none`} style={dashInputStyle} />
          </DashField>

          <div className="flex items-center justify-between rounded-[var(--radius-s)] border px-4 py-3 hairline">
            <span className="text-sm font-medium">Visible on your store</span>
            <Toggle on={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Active" />
          </div>

          <button onClick={saveDraft} className="btn btn-primary w-full">
            {draft.id ? 'Save service' : 'Add service'}
          </button>
        </div>
      </Drawer>

      {/* guarded delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] backdrop-blur-sm" style={{ background: 'rgba(20,8,32,.55)' }}
              onClick={() => setDeleteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="fixed left-1/2 top-1/2 z-[95] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2">
              <div className="card-surface p-7" style={{ borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-lg)' }}>
                <span className="grid h-12 w-12 place-items-center rounded-full"
                  style={{ background: 'var(--ysl-special-soft)', color: 'var(--ysl-danger)' }}>
                  <AlertTriangle size={22} />
                </span>
                <h3 className="mt-4 font-serif text-2xl font-semibold">Delete “{deleteTarget.name}”?</h3>
                {affectedBookings.length > 0 ? (
                  <div className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
                    <p className="font-medium" style={{ color: 'var(--ysl-danger)' }}>
                      {affectedBookings.length} upcoming booking{affectedBookings.length === 1 ? '' : 's'} will be auto-cancelled:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {affectedBookings.slice(0, 4).map((b) => (
                        <li key={b.id}>· {formatDateShort(b.date)} at {b.time} — {formatZAR(b.priceCharged)}</li>
                      ))}
                      {affectedBookings.length > 4 && <li>· and {affectedBookings.length - 4} more…</li>}
                    </ul>
                    <p className="mt-2">Customers are notified automatically.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm" style={{ color: 'var(--ysl-muted)' }}>
                    No upcoming bookings on this service — safe to remove.
                  </p>
                )}
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost flex-1 !py-3 text-[11px]">Keep it</button>
                  <button onClick={confirmDelete} className="btn flex-1 !py-3 text-[11px] text-white"
                    style={{ background: 'var(--ysl-danger)' }}>
                    Delete service
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
