/** TicketCard — perforated-edge confirmed ticket with runtime QR (booking.md §5b).
 *  Reused on the status page and in Account "View ticket". */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { BadgeCheck, Download, MapPin } from 'lucide-react';
import type { Booking, Salon, Service } from '@/lib/store';
import { useStoreState } from '@/lib/store';
import { formatDate, formatZAR } from '@/lib/format';

interface Props {
  booking: Booking;
  salon: Salon;
  service: Service;
}

export default function TicketCard({ booking, salon, service }: Props) {
  const state = useStoreState();
  const qrBox = useRef<HTMLDivElement>(null);
  const code = booking.paymentCodeId ? state.paymentCodes.find((c) => c.id === booking.paymentCodeId) : undefined;
  const paid = code?.amount ?? booking.priceCharged;
  const ticket = booking.ticketCode ?? 'PENDING';
  const gradOn = state.settings.gradTheme;

  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name}, ${salon.area}, Makhanda, South Africa`)}`;

  const download = () => {
    const qr = qrBox.current?.querySelector('canvas');
    if (!qr) return;
    const css = getComputedStyle(document.documentElement);
    const cream = css.getPropertyValue('--ysl-cream').trim() || '#FAF8FD';
    const ink = css.getPropertyValue('--ysl-ink').trim() || '#221327';
    const muted = css.getPropertyValue('--ysl-muted').trim() || '#7C6F8A';
    const gold = css.getPropertyValue('--ysl-gold').trim() || '#D4AF6A';
    const W = 720;
    const H = 1040;
    const cnv = document.createElement('canvas');
    cnv.width = W;
    cnv.height = H;
    const ctx = cnv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = cream;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.textAlign = 'center';
    ctx.fillStyle = muted;
    ctx.font = '500 20px Jost, sans-serif';
    ctx.fillText('YOUNG SPACE LIGHTY · MEGA BEAUTY SALON', W / 2, 92);
    ctx.fillStyle = ink;
    ctx.font = '600 44px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(salon.name, W / 2, 158);
    ctx.font = '400 26px Jost, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(`${service.name} · ${formatDate(booking.date)} · ${booking.time}`, W / 2, 208);
    // dashed perforation
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(48, 250);
    ctx.lineTo(W - 48, 250);
    ctx.stroke();
    ctx.setLineDash([]);
    // QR
    const qrSize = 300;
    ctx.drawImage(qr, (W - qrSize) / 2, 290, qrSize, qrSize);
    ctx.fillStyle = ink;
    ctx.font = '700 46px "JetBrains Mono", monospace';
    ctx.fillText(ticket, W / 2, 670);
    ctx.fillStyle = muted;
    ctx.font = '400 24px Jost, sans-serif';
    ctx.fillText('Show this at the salon', W / 2, 716);
    ctx.fillStyle = '#1E9E6A';
    ctx.font = '500 26px Jost, sans-serif';
    ctx.fillText(`${formatZAR(paid)} paid via Youna Venture Vault`, W / 2, 800);
    ctx.fillStyle = muted;
    ctx.fillText(`Balance due at the salon: ${formatZAR(0)}`, W / 2, 844);
    ctx.fillText(`${salon.area} · Makhanda (Grahamstown)`, W / 2, 920);
    const a = document.createElement('a');
    a.href = cnv.toDataURL('image/png');
    a.download = `ysl-ticket-${ticket.replace(/[^A-Z0-9-]/gi, '')}.png`;
    a.click();
  };

  return (
    <motion.div
      className="card-surface relative mx-auto w-full max-w-md overflow-hidden rounded-ysl-l shadow-ysl-lg"
      style={{ border: '1px solid var(--ysl-gold)' }}
      initial={{ opacity: 0, y: 60, rotateX: 15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      {gradOn && <img src="/grad-cap.svg" alt="" className="absolute -right-3 -top-3 h-16 w-16 rotate-12 opacity-90" />}

      {/* top: booking summary */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <img src={salon.avatar} alt="" className="h-11 w-11 rounded-full object-cover" style={{ border: '2px solid var(--ysl-gold)' }} />
          <div className="min-w-0">
            <p className="truncate font-serif text-xl font-semibold leading-tight">{salon.name}</p>
            <p className="text-xs uppercase tracking-[.14em]" style={{ color: 'var(--ysl-muted)' }}>{service.name}</p>
          </div>
          <img src="/ysl-logo.svg" alt="YSL" className="ml-auto h-9 w-9" />
        </div>
        <p className="mt-3 font-serif text-lg font-semibold">
          {formatDate(booking.date)} · {booking.time}
        </p>
      </div>

      {/* perforation */}
      <div className="relative">
        <div className="border-t-2 border-dashed" style={{ borderColor: 'var(--ysl-line)' }} />
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full" style={{ background: 'var(--ysl-cream)' }} />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full" style={{ background: 'var(--ysl-cream)' }} />
      </div>

      {/* bottom: QR + ticket code */}
      <div className="p-6 pt-5 text-center">
        <motion.div
          ref={qrBox}
          className="mx-auto inline-block rounded-ysl-m bg-white p-3"
          style={{ border: '1px solid var(--ysl-line)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          <QRCodeCanvas value={`YSL-TICKET:${ticket}:${booking.id}`} size={148} marginSize={1} level="M" />
        </motion.div>
        <p className="mt-4 font-mono text-2xl font-bold tracking-[.14em]">{ticket}</p>
        <p className="text-xs uppercase tracking-[.18em]" style={{ color: 'var(--ysl-muted)' }}>Show this at the salon</p>

        <div className="mt-5 space-y-2 border-t pt-4 text-left text-sm" style={{ borderColor: 'var(--ysl-line)' }}>
          <p className="flex items-center gap-2" style={{ color: 'var(--ysl-success)' }}>
            <BadgeCheck size={16} className="shrink-0" />
            {formatZAR(paid)} paid via Youna Venture Vault
          </p>
          <p className="flex items-center justify-between" style={{ color: 'var(--ysl-muted)' }}>
            <span>Balance due at the salon</span>
            <span className="font-medium">{formatZAR(0)}</span>
          </p>
          <p className="flex items-center justify-between gap-3" style={{ color: 'var(--ysl-muted)' }}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {salon.area} · Makhanda
            </span>
            <a href={directions} target="_blank" rel="noreferrer" className="font-medium underline-offset-2 hover:underline" style={{ color: 'var(--ysl-purple)' }}>
              Get directions
            </a>
          </p>
        </div>

        <button onClick={download} className="btn btn-ghost mt-5 w-full !py-3 text-[11px]">
          <Download size={14} /> Download ticket
        </button>
      </div>
    </motion.div>
  );
}
