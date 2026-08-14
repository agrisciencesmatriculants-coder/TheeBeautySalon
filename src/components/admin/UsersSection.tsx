/** T7 · Users — search + role pills, avatar rows with bookings count,
 *  suspend/reinstate (demo-local), expandable recent-bookings mini list. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, Search } from 'lucide-react';
import { getBookingsByUser, getSalon, getService, logAudit, useStoreState } from '@/lib/store';
import { formatDateShort, formatTime, formatZAR, timeAgo } from '@/lib/format';
import { FilterPills, inputStyle } from './shared';

type RoleFilter = 'all' | 'customer' | 'owner';

const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  customer: { bg: 'var(--ysl-lilac)', fg: 'var(--ysl-purple)' },
  owner: { bg: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))', fg: 'var(--ysl-violet-deep)' },
  admin: { bg: 'var(--ysl-violet-deep)', fg: 'var(--ysl-gold-light)' },
};

export default function UsersSection() {
  const s = useStoreState();
  const [role, setRole] = useState<RoleFilter>('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suspended, setSuspended] = useState<Set<string>>(new Set());

  const users = s.users.filter(
    (u) =>
      (role === 'all' || u.role === role) &&
      (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())),
  );

  const toggleSuspend = (id: string, name: string) => {
    const isSus = suspended.has(id);
    setSuspended((prev) => {
      const n = new Set(prev);
      if (isSus) n.delete(id); else n.add(id);
      return n;
    });
    logAudit('admin', isSus ? 'user-reinstated' : 'user-suspended', name);
    toast(isSus ? `${name} reinstated` : `${name} suspended`, {
      description: isSus ? 'Account active again.' : 'Account access blocked (demo-local flag).',
    });
  };

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ysl-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or Gmail…" style={{ ...inputStyle, paddingLeft: 38 }} />
        </div>
      </div>
      <FilterPills<RoleFilter>
        value={role}
        onChange={setRole}
        options={[
          { key: 'all', label: 'All', count: s.users.length },
          { key: 'customer', label: 'Customers', count: s.users.filter((u) => u.role === 'customer').length },
          { key: 'owner', label: 'Owners', count: s.users.filter((u) => u.role === 'owner').length },
        ]}
      />

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {users.map((u, i) => {
            const bookings = getBookingsByUser(u.id);
            const isSus = suspended.has(u.id);
            const rs = ROLE_STYLES[u.role] ?? ROLE_STYLES.customer!;
            const open = expanded === u.id;
            return (
              <motion.div key={u.id} layout="position" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }} className="card-surface overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-serif text-lg font-bold"
                    style={{ background: isSus ? 'var(--ysl-lilac)' : 'linear-gradient(135deg, var(--ysl-violet), var(--ysl-purple))', color: isSus ? 'var(--ysl-muted)' : '#fff' }}
                  >
                    {u.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" style={isSus ? { color: 'var(--ysl-muted)', textDecoration: 'line-through' } : undefined}>{u.name}</span>
                      <span className="chip !text-[9px]" style={{ background: rs.bg, color: rs.fg }}>{u.role}</span>
                      {isSus && <span className="chip !text-[9px]" style={{ background: 'rgba(214,69,69,.12)', color: 'var(--ysl-danger)' }}>suspended</span>}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--ysl-muted)' }}>
                      {u.email} · {bookings.length} booking{bookings.length === 1 ? '' : 's'} · joined {timeAgo(u.createdAt)}
                    </p>
                  </div>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleSuspend(u.id, u.name)}
                      className="btn !border !px-4 !py-2 text-[10px]"
                      style={{ borderColor: isSus ? 'var(--ysl-success)' : 'var(--ysl-line)', color: isSus ? 'var(--ysl-success)' : 'var(--ysl-muted)', background: 'transparent' }}
                    >
                      {isSus ? 'Reinstate' : 'Suspend'}
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(open ? null : u.id)}
                    aria-label={open ? 'Collapse' : 'Expand'}
                    className="grid h-9 w-9 place-items-center rounded-full transition-transform"
                    style={{ background: 'var(--ysl-lilac)', color: 'var(--ysl-purple)', transform: open ? 'rotate(180deg)' : 'none' }}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="overflow-hidden">
                      <div className="p-4 pt-0" style={{ borderTop: '1px dashed var(--ysl-line)' }}>
                        <p className="mb-2 mt-3 text-[11px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>Recent bookings</p>
                        <ul className="space-y-1.5 text-sm">
                          {bookings.slice(0, 4).map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                              <span className="truncate">
                                {getSalon(b.salonId)?.name} · {getService(b.serviceId)?.name}
                                <span className="ml-2 text-xs" style={{ color: 'var(--ysl-muted)' }}>{formatDateShort(b.date)} {formatTime(b.time)}</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="font-serif font-bold">{formatZAR(b.priceCharged)}</span>
                                <span className="chip chip-lilac !text-[8px]">{b.status}</span>
                              </span>
                            </li>
                          ))}
                          {!bookings.length && <li style={{ color: 'var(--ysl-muted)' }}>No bookings yet.</li>}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!users.length && (
          <div className="card-surface p-10 text-center text-sm" style={{ color: 'var(--ysl-muted)' }}>No users match.</div>
        )}
      </div>
    </div>
  );
}
