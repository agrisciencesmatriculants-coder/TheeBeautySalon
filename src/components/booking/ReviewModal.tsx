/** ReviewModal — star rating + textarea, posts via addReview (account.md T1/T3). */
import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { addReview } from '@/lib/store';
import Modal from '@/components/booking/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  salonId: string;
  salonName: string;
  serviceName?: string;
  userId: string;
}

export default function ReviewModal({ open, onClose, salonId, salonName, serviceName, userId }: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setText('');
    setRating(5);
    setHover(0);
    onClose();
  };

  const submit = () => {
    if (busy) return;
    if (!text.trim()) {
      toast.error('Tell us a little about your visit first.');
      return;
    }
    setBusy(true);
    const review = addReview({ salonId, userId, rating, text, serviceName });
    setBusy(false);
    if (review) {
      toast.success('Review posted — leaderboard updated.');
      close();
    } else {
      toast.error('Could not post your review — try again.');
    }
  };

  return (
    <Modal open={open} onClose={close} title={`Review ${salonName}`}>
      {serviceName && (
        <p className="-mt-2 mb-4 text-xs uppercase tracking-[.15em]" style={{ color: 'var(--ysl-muted)' }}>
          {serviceName}
        </p>
      )}
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hover || rating);
          return (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              <Star size={28} fill={filled ? 'var(--ysl-gold)' : 'none'} color={filled ? 'var(--ysl-gold)' : 'var(--ysl-line)'} />
            </button>
          );
        })}
        <span className="ml-2 font-serif text-xl font-semibold">{rating}.0</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="How was your visit? The stylist, the vibe, the result…"
        className="mt-4 w-full rounded-ysl-s p-4 text-sm outline-none transition-shadow"
        style={{ background: 'var(--ysl-cream)', border: '1px solid var(--ysl-line)', color: 'var(--ysl-ink)' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ysl-purple)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,.14)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ysl-line)'; e.currentTarget.style.boxShadow = 'none'; }}
      />
      <button onClick={submit} disabled={busy} className="btn btn-gold mt-5 w-full disabled:opacity-60">
        {busy ? 'Posting…' : 'Post review'}
      </button>
    </Modal>
  );
}
