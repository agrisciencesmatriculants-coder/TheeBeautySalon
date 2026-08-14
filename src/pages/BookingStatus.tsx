/** BookingStatus — `/booking/:id/status` (booking.md Stage 5).
 *  Source of truth: renders straight from the booking row. Live states:
 *  held / code-issued (resume payment) → confirming (orbit loader, auto-confirm
 *  ~3s via the simulated signed callback) → confirmed (confetti + QR ticket),
 *  plus expired / cancelled / no-show / completed panels. */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Mail, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  cancelBooking, confirmPaymentCode, issuePaymentCode,
  markBookingCompleted, sweep, useStoreState,
} from '@/lib/store';
import { formatDate, formatZAR } from '@/lib/format';
import ProgressRail from '@/components/booking/ProgressRail';
import PaymentCodePanel from '@/components/booking/PaymentCodePanel';
import VaultOverlay from '@/components/booking/VaultOverlay';
import TicketCard from '@/components/booking/TicketCard';
import OrbitLoader from '@/components/booking/OrbitLoader';
import Modal from '@/components/booking/Modal';
import CountdownTimer from '@/components/CountdownTimer';
import { fireCelebration } from '@/components/booking/confetti';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function BookingStatus() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const state = useStoreState();

  const booking = state.bookings.find((b) => b.id === id);
  const salon = booking ? state.salons.find((s) => s.id === booking.salonId) : undefined;
  const service = booking ? state.services.find((s) => s.id === booking.serviceId) : undefined;
  const code = booking?.paymentCodeId ? state.paymentCodes.find((c) => c.id === booking.paymentCodeId) : undefined;
  const user = state.sessionUserId ? state.users.find((u) => u.id === state.sessionUserId) : null;

  const [vaultOpen, setVaultOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [failed, setFailed] = useState(params.get('failed') === '1');

  // 1s heartbeat: sweep stale holds so expiry flips live
  useEffect(() => {
    sweep();
    const t = window.setInterval(() => sweep(), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Simulated signed callback: a 'confirming' booking auto-confirms after ~3s.
  const confirmFired = useRef<string | null>(null);
  useEffect(() => {
    if (!booking || booking.status !== 'confirming' || !booking.paymentCodeId) return;
    if (confirmFired.current === booking.id) return;
    confirmFired.current = booking.id;
    const codeId = booking.paymentCodeId;
    const t = window.setTimeout(() => {
      confirmPaymentCode(codeId);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [booking]);

  // Confetti: on transition to confirmed (or landing with ?paid=1 already confirmed).
  const prevStatus = useRef(booking?.status);
  const celebrated = useRef(false);
  useEffect(() => {
    const cur = booking?.status;
    if (cur === 'confirmed' && !celebrated.current) {
      const transitioned = prevStatus.current !== undefined && prevStatus.current !== 'confirmed';
      const landedPaid = params.get('paid') === '1' && prevStatus.current === 'confirmed';
      if (transitioned || landedPaid) {
        celebrated.current = true;
        fireCelebration();
      }
    }
    prevStatus.current = cur;
  }, [booking?.status, params]);

  // ── not found ────────────────────────────────────────────────────────────
  if (!booking || !salon || !service) {
    return (
      <div className="container-ysl grid min-h-[50vh] place-items-center py-24 text-center">
        <div>
          <img src="/ysl-logo.svg" alt="" className="mx-auto h-14 w-14" />
          <p className="eyebrow center mt-6 justify-center">Not found</p>
          <h1 className="display-2 mt-4">We can't find that booking</h1>
          <p className="lead mx-auto mt-4">It may have been removed, or the link is incomplete.</p>
          <Link to="/account" className="btn btn-primary mt-8">Go to my account</Link>
        </div>
      </div>
    );
  }

  const status = booking.status;
  const step =
    status === 'confirmed' || status === 'completed' ? 4
      : status === 'code-issued' || status === 'confirming' ? 3
        : status === 'held' ? 2
          : 3;

  const resumeHold = () => {
    const issued = issuePaymentCode(booking.id);
    if (!issued) {
      toast.error('This hold can no longer be converted — it may have expired.');
      sweep();
    } else {
      toast.success('Payment code issued');
    }
  };

  const confirmCancel = () => {
    cancelBooking(booking.id);
    setCancelOpen(false);
    toast('Booking cancelled — deposit refund initiated via Vault (demo)');
  };

  const bookAgain = `/book/${salon.id}/${service.id}`;

  return (
    <div className="container-ysl py-10 sm:py-14">
      <ProgressRail current={step} />

      <AnimatePresence mode="wait">
        {/* ───────── 5a · confirming (deep violet, orbit loader) ───────── */}
        {status === 'confirming' && (
          <motion.section
            key="confirming"
            className="deep-section mt-10 rounded-ysl-l px-6 py-20 text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <div className="relative mx-auto max-w-md">
              <div className="flex justify-center">
                <OrbitLoader />
              </div>
              <h1 className="display-2 mt-8 text-white">Confirming your payment…</h1>
              <motion.p
                className="mx-auto mt-3 max-w-sm text-sm"
                style={{ color: 'var(--ysl-gold-light)' }}
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                Youna Venture Vault is notifying us — this takes a few seconds.
              </motion.p>
              <p className="mt-6 text-xs uppercase tracking-[.2em]" style={{ color: 'rgba(242,236,250,.55)' }}>
                {salon.name} · {formatDate(booking.date)} · {booking.time}
              </p>
            </div>
          </motion.section>
        )}

        {/* ───────── 5b · confirmed / completed ticket ───────── */}
        {(status === 'confirmed' || status === 'completed') && (
          <motion.section
            key="ticket"
            className="mx-auto mt-10 max-w-2xl text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <p className="eyebrow center justify-center" style={{ color: 'var(--ysl-success)' }}>
              {status === 'completed' ? 'Visit completed' : 'Payment confirmed'}
            </p>
            <h1 className="display-2 mt-3">
              You're booked!{' '}
              <Sparkles className="inline h-8 w-8 -translate-y-1" style={{ color: 'var(--ysl-gold)' }} aria-hidden />
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px]" style={{ color: 'var(--ysl-muted)' }}>
              {service.name} at {salon.name} — {formatDate(booking.date)} at {booking.time}. See you soon.
            </p>

            <div className="mt-8">
              <TicketCard booking={booking} salon={salon} service={service} />
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/account" className="btn btn-primary">View my bookings</Link>
              <Link to={bookAgain} className="btn btn-ghost">Book another service</Link>
            </div>

            <button
              onClick={() => setEmailOpen(true)}
              className="chip chip-gold mx-auto mt-6 transition-transform hover:-translate-y-0.5"
            >
              <Mail size={13} /> Confirmation email sent via Brevo
            </button>

            {/* demo helper: mark the visit as done once the date passes */}
            {status === 'confirmed' && (
              <p className="mt-6">
                <button
                  onClick={() => { markBookingCompleted(booking.id); toast('Marked as completed — thanks for visiting!'); }}
                  className="text-[11px] uppercase tracking-[.14em] underline-offset-4 hover:underline"
                  style={{ color: 'var(--ysl-muted)' }}
                >
                  Demo: mark visit completed
                </button>
              </p>
            )}
          </motion.section>
        )}

        {/* ───────── resume payment · held ───────── */}
        {status === 'held' && (
          <motion.section key="held" className="mx-auto mt-10 max-w-xl text-center"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}>
            <p className="eyebrow center justify-center" style={{ color: 'var(--ysl-amber)' }}>Finish your booking</p>
            <h1 className="display-2 mt-3">Your slot is still held</h1>
            <p className="mx-auto mt-3 max-w-md text-[15px]" style={{ color: 'var(--ysl-muted)' }}>
              {service.name} at {salon.name} — {formatDate(booking.date)} at {booking.time}. Complete payment before the timer ends.
            </p>
            {booking.holdExpiresAt && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-pill px-5 py-2.5" style={{ background: 'rgba(232,161,58,.12)' }}>
                <span className="text-[11px] font-medium uppercase tracking-[.14em]" style={{ color: 'var(--ysl-amber)' }}>Hold ends in</span>
                <span className="text-lg"><CountdownTimer endsAt={booking.holdExpiresAt} variant="hold" compact /></span>
              </div>
            )}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button onClick={resumeHold} className="btn btn-gold">
                Get my payment code <ArrowRight size={15} />
              </button>
              <button onClick={() => setCancelOpen(true)} className="btn btn-ghost" style={{ borderColor: 'var(--ysl-danger)', color: 'var(--ysl-danger)' }}>
                Cancel booking
              </button>
            </div>
          </motion.section>
        )}

        {/* ───────── resume payment · code issued ───────── */}
        {status === 'code-issued' && code && (
          <motion.section key="pay" className="mt-10"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}>
            {failed && (
              <motion.div
                className="mx-auto mb-6 flex max-w-xl items-start gap-3 rounded-ysl-m px-5 py-4 text-left"
                style={{ background: 'rgba(214,69,69,.1)', border: '1px solid rgba(214,69,69,.4)' }}
                initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
              >
                <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--ysl-danger)' }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--ysl-danger)' }}>Payment not completed</p>
                  <p className="text-sm" style={{ color: 'var(--ysl-muted)' }}>
                    The Vault payment didn't go through. Your code is still valid while the hold lasts — try again.
                  </p>
                </div>
                <button onClick={() => setFailed(false)} aria-label="Dismiss" style={{ color: 'var(--ysl-muted)' }}>
                  <XCircle size={16} />
                </button>
              </motion.div>
            )}
            <PaymentCodePanel
              code={code}
              holdEndsAt={booking.holdExpiresAt}
              onPayVault={() => setVaultOpen(true)}
              onCancel={() => setCancelOpen(true)}
            />
          </motion.section>
        )}

        {/* ───────── 5c · expired / cancelled / no-show ───────── */}
        {(status === 'expired' || status === 'cancelled' || status === 'no-show') && (
          <motion.section key="closed" className="mx-auto mt-10 max-w-xl text-center"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}>
            <div className="card-surface rounded-ysl-l p-9">
              <XCircle size={40} className="mx-auto" style={{ color: status === 'no-show' ? 'var(--ysl-danger)' : 'var(--ysl-muted)' }} />
              <h1 className="mt-4 font-serif text-3xl font-semibold">
                {status === 'expired' ? 'This booking expired' : status === 'cancelled' ? 'Booking cancelled' : 'Marked as no-show'}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
                {status === 'expired' && 'The 10-minute hold ran out before payment completed, so the slot was released. No charge was made.'}
                {status === 'cancelled' && 'This booking was cancelled and the slot freed. Any Vault payment is refunded (demo).'}
                {status === 'no-show' && 'The salon marked this booking as a no-show. Reach out to them if this looks wrong.'}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[.16em]" style={{ color: 'var(--ysl-muted)' }}>
                {service.name} · {formatDate(booking.date)} · {booking.time} · {formatZAR(booking.priceCharged)}
              </p>
              <Link to={bookAgain} className="btn btn-primary mt-7">Book again</Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* cancel confirm */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this booking?">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ysl-muted)' }}>
          The slot will be freed immediately and any issued payment code becomes void. If you already paid, a refund is
          initiated via Vault (demo).
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCancelOpen(false)} className="btn btn-ghost flex-1">Keep booking</button>
          <button onClick={confirmCancel} className="btn flex-1" style={{ background: 'var(--ysl-danger)', color: '#fff' }}>
            Cancel booking
          </button>
        </div>
      </Modal>

      {/* Brevo email preview (demo) */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="" wide>
        <div className="overflow-hidden rounded-ysl-m" style={{ border: '1px solid var(--ysl-line)' }}>
          <div className="px-6 py-4" style={{ background: 'var(--ysl-violet-deep)' }}>
            <p className="text-[11px] uppercase tracking-[.2em]" style={{ color: 'var(--ysl-gold-light)' }}>Email sent via Brevo · demo preview</p>
            <p className="mt-1 font-serif text-xl font-semibold text-white">Your YSL booking is confirmed</p>
          </div>
          <div className="space-y-3 p-6 text-sm" style={{ background: 'var(--ysl-surface)' }}>
            <p>Hi {user?.name.split(' ')[0] ?? 'there'},</p>
            <p style={{ color: 'var(--ysl-muted)' }}>
              Your booking at <strong style={{ color: 'var(--ysl-ink)' }}>{salon.name}</strong> is confirmed:
            </p>
            <div className="rounded-ysl-s p-4" style={{ background: 'var(--ysl-cream)', border: '1px dashed var(--ysl-gold)' }}>
              <p className="font-medium">{service.name}</p>
              <p style={{ color: 'var(--ysl-muted)' }}>{formatDate(booking.date)} at {booking.time}</p>
              <p className="mt-2 font-mono text-lg font-bold tracking-[.12em]">{booking.ticketCode ?? '—'}</p>
              <p className="text-xs" style={{ color: 'var(--ysl-success)' }}>{formatZAR(code?.amount ?? booking.priceCharged)} paid via Youna Venture Vault</p>
            </div>
            <p style={{ color: 'var(--ysl-muted)' }}>Show the ticket code at the salon. We can't wait to see you glow.</p>
          </div>
        </div>
      </Modal>

      {/* Vault overlay for resumed payments */}
      {code && (
        <VaultOverlay
          open={vaultOpen}
          code={code}
          payerName={user?.name ?? 'YSL Customer'}
          payerEmail={user?.email ?? ''}
          onSuccess={() => setVaultOpen(false)}
          onFail={() => { setVaultOpen(false); setFailed(true); }}
          onClose={() => setVaultOpen(false)}
        />
      )}
    </div>
  );
}
