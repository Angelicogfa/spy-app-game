import { useEffect, useRef } from 'react';
import { Camera, Hand, Pointer } from 'lucide-react';
import { HandTrackingState } from '../types/game';

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

interface CameraMirrorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  compact?: boolean;
}

export function CameraMirror({ videoRef, tracking, compact = false }: CameraMirrorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackingRef = useRef<HandTrackingState>(tracking);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    let rafId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (video && video.readyState >= 2 && trackingRef.current.status === 'ready') {
          // Draw mirrored webcam frame
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, w, h);
          ctx.restore();

          // Soft Eden academy vignette frame
          ctx.fillStyle = 'rgba(20, 83, 45, 0.08)';
          ctx.fillRect(0, 0, w, h);

          // Draw MediaPipe landmarks
          const landmarks = trackingRef.current.landmarks;
          if (landmarks && landmarks.length >= 21) {
            // Draw bone connections
            ctx.strokeStyle = trackingRef.current.isPinching ? '#EAB308' : '#22C55E';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
              const a = landmarks[startIdx];
              const b = landmarks[endIdx];
              ctx.beginPath();
              ctx.moveTo(a.x * w, a.y * h);
              ctx.lineTo(b.x * w, b.y * h);
              ctx.stroke();
            }

            // Draw joints
            for (let i = 0; i < landmarks.length; i++) {
              const lm = landmarks[i];
              const isIndexTip = i === 8;
              const isThumbTip = i === 4;

              ctx.beginPath();
              ctx.arc(lm.x * w, lm.y * h, isIndexTip || isThumbTip ? 7 : 3.5, 0, Math.PI * 2);
              ctx.fillStyle = isIndexTip
                ? '#EC4899'
                : isThumbTip
                  ? '#EAB308'
                  : '#FFFBF2';
              ctx.fill();
              ctx.strokeStyle = '#14532D';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            // Highlight pinch bridge between thumb (4) and index (8)
            const thumb = landmarks[4];
            const index = landmarks[8];
            ctx.beginPath();
            ctx.moveTo(thumb.x * w, thumb.y * h);
            ctx.lineTo(index.x * w, index.y * h);
            ctx.strokeStyle = trackingRef.current.isPinching ? '#EAB308' : '#F472B6';
            ctx.lineWidth = trackingRef.current.isPinching ? 5 : 2;
            ctx.setLineDash(trackingRef.current.isPinching ? [] : [4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          ctx.fillStyle = '#14532D';
          ctx.fillRect(0, 0, w, h);
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef]);

  const pinchPercent = tracking.handDetected
    ? Math.max(0, Math.min(100, Math.round((1 - Math.min(tracking.pinchDistance, 1.0)) * 100)))
    : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9CEB8] bg-[#F6EFE0] shadow-sm">
      <div className={`relative w-full overflow-hidden bg-[#14532D] ${compact ? 'aspect-[4/3]' : 'aspect-[4/3]'}`}>
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          className="h-full w-full object-cover"
        />

        {tracking.status !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#14532D]/90 p-4 text-center text-[#FFFBF2]">
            <Camera className="mb-2 h-8 w-8 text-[#EAB308]" />
            <p className="text-sm font-semibold">
              {tracking.status === 'loading_model'
                ? 'Carregando visão de gestos...'
                : tracking.status === 'requesting_camera'
                  ? 'Aguardando permissão da câmera...'
                  : 'Câmera desligada'}
            </p>
          </div>
        )}

        {tracking.status === 'ready' && !tracking.handDetected && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-xs">
            Levante sua mão aberta em frente à câmera
          </div>
        )}
      </div>

      {/* Clear non-hue-only gesture readout */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-[#1C1917]">
            {tracking.isPinching ? (
              <Hand className="h-4 w-4 text-[#B45309]" />
            ) : (
              <Pointer className="h-4 w-4 text-[#EC4899]" />
            )}
            <span>
              {!tracking.handDetected
                ? 'Procurando mão'
                : tracking.isPinching
                  ? 'Gesto: Pinça ativa'
                  : 'Gesto: Apontando'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#57534E] tabular-nums">
            {tracking.handDetected ? `${pinchPercent}% pinça` : '—'}
          </span>
        </div>

        {/* Visual pinch closeness bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6DEC8]">
          <div
            className={`h-full rounded-full transition-transform duration-100 origin-left ${
              tracking.isPinching ? 'bg-[#EAB308]' : 'bg-[#EC4899]'
            }`}
            style={{ transform: `scaleX(${pinchPercent / 100})` }}
          />
        </div>

        {!compact && (
          <p className="text-xs leading-relaxed text-[#57534E]">
            Aponte o indicador para mover e junte o polegar com o indicador para fazer pinça.
          </p>
        )}
      </div>
    </div>
  );
}
