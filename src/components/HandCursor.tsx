import { useEffect, useRef } from 'react';
import { Hand, Pointer } from 'lucide-react';
import { HandTrackingState } from '../types/game';

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

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
  const handCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render ONLY the real-time hand skeleton (zero video frame) anchored cleanly around the cursor
  useEffect(() => {
    const canvas = handCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const landmarks = tracking.landmarks;
    if (!visible || tracking.status !== 'ready' || !tracking.handDetected || !landmarks || landmarks.length < 21) {
      return;
    }

    // Center the drawn hand so landmark 8 (index fingertip) aligns directly with the cursor center
    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmSize = Math.max(Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y), 0.08);
    const scale = 80 / palmSize; // Larger, highly legible hand silhouette (~185px tall)
    const originX = w / 2;
    const originY = h / 2 - 10;

    const pt = (lm: { x: number; y: number }) => ({
      x: originX + (lm.x - indexTip.x) * scale,
      y: originY + (lm.y - indexTip.y) * scale,
    });

    // Vivid translucent palm fill for unmistakable hand shape
    const palmIndices = [0, 1, 5, 9, 13, 17];
    ctx.beginPath();
    palmIndices.forEach((idx, i) => {
      const p = pt(landmarks[idx]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = tracking.isPinching
      ? 'rgba(234, 179, 8, 0.34)'
      : 'rgba(20, 83, 45, 0.24)';
    ctx.fill();

    // Soft white halo behind finger bones so the hand pops on any background
    ctx.strokeStyle = 'rgba(255, 251, 242, 0.9)';
    ctx.lineWidth = 10.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const a = pt(landmarks[startIdx]);
      const b = pt(landmarks[endIdx]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw bold finger bones
    ctx.strokeStyle = tracking.isPinching ? '#B45309' : '#14532D';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const a = pt(landmarks[startIdx]);
      const b = pt(landmarks[endIdx]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw larger, high-contrast joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = pt(landmarks[i]);
      const isIndex = i === 8;
      const isThumb = i === 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isIndex || isThumb ? 8 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isIndex ? '#EC4899' : isThumb ? '#EAB308' : '#FFFBF2';
      ctx.fill();
      ctx.strokeStyle = '#14532D';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pinch connection glow
    if (tracking.isPinching) {
      const thumb = pt(landmarks[4]);
      const index = pt(landmarks[8]);
      ctx.beginPath();
      ctx.moveTo(thumb.x, thumb.y);
      ctx.lineTo(index.x, index.y);
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }, [tracking, visible]);

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
        {/* Larger real-time hand silhouette ONLY (no webcam video!) */}
        <canvas
          ref={handCanvasRef}
          width={320}
          height={320}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 opacity-95"
        />

        {/* Larger tactile reticle aligned with fingertip */}
        <div
          className={`relative flex items-center justify-center rounded-full border-4 transition-transform duration-100 ${
            isPinching
              ? 'h-16 w-16 scale-95 border-[#B45309] bg-[#EAB308]/40 shadow-lg'
              : 'h-16 w-16 scale-100 border-[#EC4899] bg-[#EC4899]/22 shadow-md'
          }`}
        >
          {holdingEmoji ? (
            <span className="text-4xl leading-none drop-shadow-sm">{holdingEmoji}</span>
          ) : isPinching ? (
            <Hand className="h-7 w-7 text-[#78350F]" strokeWidth={2.5} />
          ) : (
            <Pointer className="h-7 w-7 text-[#9D174D]" strokeWidth={2.5} />
          )}
        </div>

        {/* Non-hue-only explicit gesture state label */}
        <div
          className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-extrabold shadow-md ${
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
