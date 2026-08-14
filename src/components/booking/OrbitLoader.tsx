/** OrbitLoader — gold dot orbiting a purple ring (booking.md §5a).
 *  Isolated + memoized so perpetual animation is never reset by parents. */
import { memo } from 'react';

function OrbitLoader({ size = 88 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }} role="status" aria-label="Confirming">
      <style>{`
        @keyframes yslOrbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .ysl-orbit { animation: none !important; } }
      `}</style>
      <div
        className="absolute inset-0 rounded-full"
        style={{ border: '2px solid rgba(139,92,246,.35)', borderTopColor: 'var(--ysl-purple)' }}
      />
      <div className="ysl-orbit absolute inset-0" style={{ animation: 'yslOrbit 1.2s linear infinite' }}>
        <span
          className="absolute left-1/2 top-0 block rounded-full"
          style={{
            width: 12,
            height: 12,
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, var(--ysl-gold), var(--ysl-gold-light))',
            boxShadow: '0 0 14px rgba(212,175,106,.8)',
          }}
        />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <img src="/ysl-logo.svg" alt="" className="h-8 w-8 opacity-90" />
      </div>
    </div>
  );
}

export default memo(OrbitLoader);
