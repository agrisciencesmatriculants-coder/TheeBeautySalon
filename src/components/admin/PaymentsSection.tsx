/** T6 · Payment codes — awaiting/confirmed/expired filter, mono codes with
 *  copy, aging highlights, manual [Confirm payment] → confetti ticket path. */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import {
  cancelBooking, confirmPaymentCode, getAllBookings, getSalon, getService,
  getUserById, useStoreState,
} from '@/lib/store';
import type { PaymentCode } from '@/lib/store';
import { formatZAR, timeAgo } from '@/lib/format';
import { FilterPills } from './shared';

type Filter = 'awaiting' | 'confirmed' | 'expired' | 'all';
const AGING_MS = 7 * 60 * 1000; // rows pulse amber past 7 minutes

function CodeCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable — still show the tick as demo feedback */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-[13px] font-bold tracking-wider">{code}</span>
      <button onClick={copy} aria-label="Copy code" className="grid h-7 w-7 place-items-center rounded-full" style={{ background: 'var(--ysl-lilac)', color: copied ? 'var(--ysl-success)' : 'var(--ysl-purple)' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? 'c' : 'x'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="grid place-items-center">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </span>
  );
}

export default function PaymentsSection() {
  const s = useStoreState();
  const [filter, setFilter] = useState<Filter>('awaiting');
  const [now, setNow] = useState(() => Date.now());
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const bookings = useMemo(() => getAllBookings(), [s.bookings]);
  const codes = useMemo(() => [...s.paymentCodes].sort((a, b) => b.issuedAt - a.issuedAt), [s.paymentCodes]);

  const filtered = codes.filter((c) =>
    filter === 'all' ? true
      : filter === 'awaiting' ? c.status === 'issued' || c.status === 'paid'
        : filter === 'confirmed' ? c.status === 'confirmed'
          : c.status === 'expired',
  );

  const confirm = (c: PaymentCode) => {
    const res = confirmPaymentCode(c.id);
    if (res.ok) {
      setJustConfirmed(c.id);
      window.setTimeout(() => setJustConfirmed(null), 1800);
      toast.success(`Payment confirmed — ticket issued`, {
        description: `${c.code} · the customer's status page just flipped to the confetti ticket.`,
      });
    } else {
      toast.error(res.error ?? 'Could not confirm this code.');
    }
  };

  const expire = (c: PaymentCode) => {
    cancelBooking(c.bookingId);
    toast('Code marked expired', { description: `${c.code} — the slot was released.` });
  };

  const statusChip = (c: PaymentCode) => {
    const map: Record<PaymentCode['status'], { bg: string; fg: string; label: string }> = {
      issued: { bg: 'rgba(232,161,58,.14)', fg: 'var(--ysl-amber)', label: 'awaiting' },
      paid: { bg: 'var(--ysl-lilac)', fg: 'var(--ysl-purple)', label: 'paid · confirm' },
      confirmed: { bg: 'rgba(30,158,106,.12)', fg: 'var(--ysl-success)', label: 'confirmed' },
      expired: { bg: 'rgba(214,69,69,.1)', fg: 'var(--ysl-danger)', label: 'expired' },
    };
    const m = map[c.status];
    return <span className="chip !text-[9px]" style={{ background: m.bg, color: m.fg }}>{m.label}</span>;
  };

  return (
    <div>
      <FilterPills<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'awaiting', label: 'Awaiting', count: codes.filter((c) => c.status === 'issued' || c.status === 'paid').length },
          { key: 'confirmed', label: 'Confirmed', count: codes.filter((c) => c.status === 'confirmed').length },
          { key: 'expired', label: 'Expired', count: codes.filter((c) => c.status === 'expired').length },
          { key: 'all', label: 'All', count: codes.length },
        ]}
      />

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ysl-line)' }}>
              {['Code', 'Customer', 'Salon · Service', 'Amount', 'Age', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map((c) => {
                const b = bookings.find((x) => x.id === c.bookingId);
                const aging = (c.status === 'issued' || c.status === 'paid') && now - c.issuedAt > AGING_MS;
                const confirmedRow = justConfirmed === c.id || c.status === 'confirmed';
                return (
                  <motion.tr
                    key={c.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      borderBottom: '1px solid var(--ysl-line)',
                      background: confirmedRow && justConfirmed === c.id ? 'rgba(30,158,106,.07)' : undefined,
                    }}
                  >
                    <td className="px-4 py-3"><CodeCell code={c.code} /></td>
                    <td className="px-4 py-3">{b ? getUserById(b.userId)?.name ?? '—' : '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b ? getSalon(b.salonId)?.name : '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--ysl-muted)' }}>{b ? getService(b.serviceId)?.name : ''}</p>
                    </td>
                    <td className="px-4 py-3 font-serif font-bold">{formatZAR(c.amount)}</td>
                    <td className="px-4 py-3">
                      <motion.span
                        className="chip !text-[9px]"
                        style={{ background: aging ? 'rgba(232,161,58,.16)' : 'var(--ysl-lilac)', color: aging ? 'var(--ysl-amber)' : 'var(--ysl-muted)' }}
                        animate={aging ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                        transition={aging ? { duration: 1.6, repeat: Infinity } : undefined}
                      >
                        {timeAgo(c.issuedAt)}
                      </motion.span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        {statusChip(c)}
                        {justConfirmed === c.id && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                            <Check size={15} style={{ color: 'var(--ysl-success)' }} />
                          </motion.span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex gap-2">
                        {(c.status === 'issued' || c.status === 'paid') && (
                          <>
                            <button onClick={() => confirm(c)} className="btn !px-4 !py-2 text-[10px] text-white" style={{ background: 'var(--ysl-success)' }}>
                              Confirm payment
                            </button>
                            {c.status === 'issued' && (
                              <button onClick={() => expire(c)} className="btn !border !px-4 !py-2 text-[10px]" style={{ borderColor: 'var(--ysl-line)', color: 'var(--ysl-muted)', background: 'transparent' }}>
                                Mark expired
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!filtered.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: 'var(--ysl-muted)' }}>
                No codes in this state. Awaiting codes appear here the moment a customer books.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--ysl-muted)' }}>
        Manual confirmation mirrors the Youna Venture Vault callback path — the same booking state transition to a confirmed ticket.
      </p>
    </div>
  );
}
