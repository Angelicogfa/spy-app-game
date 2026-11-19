import { Hand, Pointer } from 'lucide-react';
import { HandTrackingState } from '../types/game';

interface HandCursorProps {
  tracking: HandTrackingState;
  visible: boolean;
  holdingLabel?: string | null;
  holdingEmoji?: string | null;
}

export function HandCursor({
  tracking,
  visible,
  holdingLabel,
  holdingEmoji,
}: HandCursorProps) {
  if (!visible || tracking.status !== 'ready' || !tracking.handDetected) {
    return null;
  }

  const { cursorX, cursorY, isPinching } = tracking;

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 will-change-transform"
      style={{
        transform: `translate3d(${Math.round(cursorX)}px, ${Math.round(cursorY)}px, 0)`,
      }}
      aria-hidden="true"
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        {/* Outer tactile reticle */}
        <div
          className={`flex items-center justify-center rounded-full border-4 transition-transform duration-100 ${
            isPinching
              ? 'h-14 w-14 scale-90 border-[#B45309] bg-[#EAB308]/35 shadow-lg'
              : 'h-16 w-16 scale-100 border-[#EC4899] bg-[#EC4899]/18 shadow-md'
          }`}
        >
          {holdingEmoji ? (
            <span className="text-3xl leading-none drop-shadow-sm">{holdingEmoji}</span>
          ) : isPinching ? (
            <Hand className="h-6 w-6 text-[#78350F]" strokeWidth={2.5} />
          ) : (
            <Pointer className="h-6 w-6 text-[#9D174D]" strokeWidth={2.5} />
          )}
        </div>

        {/* Non-hue-only explicit gesture state label */}
        <div
          className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-bold shadow-sm ${
            isPinching
              ? 'bg-[#B45309] text-white'
              : 'bg-[#14532D] text-[#FFFBF2]'
          }`}
        >
          {holdingLabel ? holdingLabel : isPinching ? 'Pinça' : 'Apontando'}
        </div>
      </div>
    </div>
  );
}
