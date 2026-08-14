/** T2 · Salons (vetting) — filter pills, pending/approved rows with
 *  approve / request-changes / suspend actions + expandable detail panel. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router';
import { Check, ChevronDown, ExternalLink, FileText, Mail, PencilLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  DAY_KEYS, DAY_SHORT, getSalonRating, getServicesBySalon, getUserById,
  logAudit, setSalonApproved, useStoreState,
} from '@/lib/store';
import type { Salon } from '@/lib/store';
import { formatZARShort } from '@/lib/format';
import RatingStars from '@/components/RatingStars';
import { EmailPreviewModal, FilterPills } from './shared';

type Filter = 'all' | 'pending' | 'approved' | 'suspended';

const DOCS = ['ID document.pdf', 'Proof of enrolment.pdf', 'Portfolio.zip'];

export default function SalonsSection() {
  const s = useStoreState();
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suspended, setSuspended] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [email, setEmail] = useState<{ to: string; subject: string; body: string } | null>(null);

  const salons = s.salons;
  const isPending = (sl: Salon) => !sl.approved && !suspended.has(sl.id);
  const filtered = salons.filter((sl) =>
    filter === 'all' ? true
      : filter === 'pending' ? isPending(sl)
        : filter === 'approved' ? sl.approved
          : suspended.has(sl.id) && !sl.approved,
  );

  const approve = (sl: Salon) => {
    setSalonApproved(sl.id, true);
    setSuspended((prev) => { const n = new Set(prev); n.delete(sl.id); return n; });
    toast.success(`Store published — owner notified via Brevo`, {
      description: `${sl.name} is now live in browse and search.`,
      action: {
        label: 'Preview email',
        onClick: () =>
          setEmail({
            to: getUserById(sl.ownerId)?.email ?? 'owner@gmail.com',
            subject: `Your salon "${sl.name}" is live on YSL`,
            body: `Congratulations ${sl.ownerName.split(' ')[0]} — your store passed vetting and is now visible to every student in Grahamstown. Add your services and weekly schedule from your dashboard.`,
          }),
      },
    });
  };

  const requestChanges = (sl: Salon) => {
    logAudit('admin', 'salon-changes-requested', `${sl.name}: asked owner to resubmit documents.`);
    toast(`Changes requested from ${sl.ownerName}`, {
      description: 'Owner will see the checklist on their next dashboard load.',
    });
  };

  const suspend = (sl: Salon) => {
    setSalonApproved(sl.id, false);
    setSuspended((prev) => new Set(prev).add(sl.id));
    toast.error(`${sl.name} suspended`, { description: 'Store hidden site-wide immediately.' });
  };

  const reinstate = (sl: Salon) => {
    setSalonApproved(sl.id, true);
    setSuspended((prev) => { const n = new Set(prev); n.delete(sl.id); return n; });
    toast.success(`${sl.name} reinstated`, { description: 'Store is live again.' });
  };

  return (
    <div>
      <FilterPills<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'All', count: salons.length },
          { key: 'pending', label: 'Pending', count: salons.filter(isPending).length },
          { key: 'approved', label: 'Approved', count: salons.filter((x) => x.approved).length },
          { key: 'suspended', label: 'Suspended', count: suspended.size },
        ]}
      />

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((sl) => {
            const pending = isPending(sl);
            const isSuspended = suspended.has(sl.id) && !sl.approved;
            const rating = getSalonRating(sl.id);
            const services = getServicesBySalon(sl.id);
            const owner = getUserById(sl.ownerId);
            const open = expanded === sl.id;
            return (
              <motion.div
                key={sl.id}
                layout="position"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card-surface overflow-hidden"
                style={pending ? { background: 'color-mix(in srgb, var(--ysl-amber) 5%, var(--ysl-surface))', borderColor: 'color-mix(in srgb, var(--ysl-amber) 35%, var(--ysl-line))' } : undefined}
              >
                {/* row */}
                <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                  <img src={sl.avatar} alt={sl.ownerName} className="h-12 w-12 rounded-full object-cover" style={{ border: '2px solid var(--ysl-lilac)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg font-semibold">{sl.name}</span>
                      {sl.approved ? (
                        <span className="chip chip-success !text-[9px]"><Check size={10} /> Approved</span>
                      ) : isSuspended ? (
                        <span className="chip !text-[9px]" style={{ background: 'rgba(214,69,69,.12)', color: 'var(--ysl-danger)' }}>Suspended</span>
                      ) : (
                        <span className="chip chip-amber !text-[9px]">Pending vetting</span>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                      <span className="inline-flex items-center gap-1"><Mail size={11} /> {sl.ownerName} · {owner?.email}</span>
                      <span>{sl.area}</span>
                      <span>{services.length} services</span>
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <RatingStars rating={rating.avg} count={rating.count} size={13} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pending && (
                      <>
                        <button onClick={() => approve(sl)} className="btn !px-4 !py-2 text-[10px] text-white" style={{ background: 'var(--ysl-success)' }}>
                          <Check size={13} /> Approve
                        </button>
                        <button onClick={() => requestChanges(sl)} className="btn !px-4 !py-2 text-[10px]" style={{ background: 'var(--ysl-amber)', color: 'var(--ysl-violet-deep)' }}>
                          Request changes
                        </button>
                      </>
                    )}
                    {sl.approved && (
                      <>
                        <Link to={`/salon/${sl.slug}`} className="btn btn-ghost !px-4 !py-2 text-[10px]">
                          View store <ExternalLink size={12} />
                        </Link>
                        <button onClick={() => suspend(sl)} className="btn !border !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)', background: 'transparent' }}>
                          Suspend
                        </button>
                      </>
                    )}
                    {isSuspended && (
                      <button onClick={() => reinstate(sl)} className="btn !px-4 !py-2 text-[10px] text-white" style={{ background: 'var(--ysl-success)' }}>
                        Reinstate
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(open ? null : sl.id)}
                      aria-label={open ? 'Collapse details' : 'Expand details'}
                      className="grid h-9 w-9 place-items-center rounded-full transition-transform"
                      style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)', transform: open ? 'rotate(180deg)' : 'none' }}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                {/* expand panel */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-6 p-5 sm:grid-cols-3" style={{ borderTop: '1px dashed var(--ysl-line)' }}>
                        <div>
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Submitted documents</p>
                          <div className="flex flex-wrap gap-2">
                            {DOCS.map((d) => (
                              <span key={d} className="chip chip-lilac !normal-case !tracking-normal"><FileText size={12} /> {d}</span>
                            ))}
                          </div>
                          <p className="mt-4 mb-2 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Weekly schedule</p>
                          <div className="flex flex-wrap gap-1.5">
                            {DAY_KEYS.map((k) => (
                              <span key={k} className="rounded px-2 py-1 text-[10px] font-medium"
                                style={{
                                  background: sl.schedule[k].open ? 'var(--ysl-lilac)' : 'transparent',
                                  color: sl.schedule[k].open ? 'var(--ysl-purple)' : 'var(--ysl-muted)',
                                  border: '1px solid var(--ysl-line)',
                                }}>
                                {DAY_SHORT[k]} {sl.schedule[k].open ? `${sl.schedule[k].start}–${sl.schedule[k].end}` : 'closed'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Services ({services.length})</p>
                          <ul className="space-y-1.5 text-sm">
                            {services.map((sv) => (
                              <li key={sv.id} className="flex justify-between gap-3">
                                <span className="truncate">{sv.name}</span>
                                <span className="font-serif font-bold">{formatZARShort(sv.price)}</span>
                              </li>
                            ))}
                            {!services.length && <li style={{ color: 'var(--ysl-muted)' }}>No services listed yet.</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
                            <PencilLine size={12} /> Internal note
                          </p>
                          <textarea
                            value={notes[sl.id] ?? ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [sl.id]: e.target.value }))}
                            placeholder="Visible to admins only…"
                            rows={4}
                            className="w-full p-3 text-sm outline-none"
                            style={{
                              background: 'var(--ysl-cream)', border: '1px solid var(--ysl-line)',
                              borderRadius: 'var(--radius-s)', color: 'var(--ysl-ink)', resize: 'vertical',
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!filtered.length && (
          <div className="card-surface p-10 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>
            Nothing in this bucket right now.
          </div>
        )}
      </div>

      <EmailPreviewModal
        open={!!email}
        onClose={() => setEmail(null)}
        to={email?.to ?? ''}
        subject={email?.subject ?? ''}
        body={email?.body ?? ''}
      />
    </div>
  );
}
