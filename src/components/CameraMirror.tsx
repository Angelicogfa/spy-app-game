import { useEffect, useRef } from 'react';
import { Camera, EyeOff, Hand, Pointer } from 'lucide-react';
import { CameraDisplayMode, HandTrackingState } from '../types/game';

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
  displayMode: CameraDisplayMode;
  onChangeDisplayMode?: (mode: CameraDisplayMode) => void;
  compact?: boolean;
}

export function CameraMirror({
  videoRef,
  tracking,
  displayMode,
  onChangeDisplayMode,
  compact = false,
}: CameraMirrorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackingRef = useRef<HandTrackingState>(tracking);
  const modeRef = useRef<CameraDisplayMode>(displayMode);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    modeRef.current = displayMode;
  }, [displayMode]);

  useEffect(() => {
    if (displayMode === 'hidden') return;
    let rafId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const isReady = video && video.readyState >= 2 && trackingRef.current.status === 'ready';

        if (isReady && modeRef.current === 'video') {
          // Only render webcam video when explicitly enabled by guardian
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, w, h);
          ctx.restore();
          ctx.fillStyle = 'rgba(20, 83, 45, 0.08)';
          ctx.fillRect(0, 0, w, h);
        } else {
          // Hand-only calm solid Eden backdrop — zero distracting face/video frame
          ctx.fillStyle = '#14532D';
          ctx.fillRect(0, 0, w, h);

          // Subtle calm reference crosshair so hand position is clear
          ctx.strokeStyle = 'rgba(255, 251, 242, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2, 16);
          ctx.lineTo(w / 2, h - 16);
          ctx.moveTo(16, h / 2);
          ctx.lineTo(w - 16, h / 2);
          ctx.stroke();
        }

        // Draw MediaPipe hand landmarks ONLY
        const landmarks = trackingRef.current.landmarks;
        if (isReady && landmarks && landmarks.length >= 21) {
          // Subtle palm shape
          const palmIndices = [0, 1, 5, 9, 13, 17];
          ctx.beginPath();
          palmIndices.forEach((idx, i) => {
            const p = landmarks[idx];
            if (i === 0) ctx.moveTo(p.x * w, p.y * h);
            else ctx.lineTo(p.x * w, p.y * h);
          });
          ctx.closePath();
          ctx.fillStyle = trackingRef.current.isPinching
            ? 'rgba(234, 179, 8, 0.25)'
            : 'rgba(255, 251, 242, 0.14)';
          ctx.fill();

          // Finger bones
          ctx.strokeStyle = trackingRef.current.isPinching ? '#EAB308' : '#4ADE80';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
            const a = landmarks[startIdx];
            const b = landmarks[endIdx];
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }

          // Joints
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            const isIndexTip = i === 8;
            const isThumbTip = i === 4;

            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, isIndexTip || isThumbTip ? 8 : 4, 0, Math.PI * 2);
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

          // Pinch bridge
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
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, displayMode]);

  if (displayMode === 'hidden') {
    return null;
  }

  const pinchPercent = tracking.handDetected
    ? Math.max(0, Math.min(100, Math.round((1 - Math.min(tracking.pinchDistance, 1.0)) * 100)))
    : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9CEB8] bg-[#F6EFE0] shadow-md">
      {/* Compact Header with 1-click Hide */}
      <div className="flex items-center justify-between gap-2 border-b border-[#D9CEB8] bg-[#FFFBF2] px-3 py-2">
        <span className="text-xs font-bold text-[#14532D]">
          {displayMode === 'hand_only' ? 'Somente Mão (Sem Vídeo)' : 'Vídeo da Câmera'}
        </span>
        {onChangeDisplayMode && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                onChangeDisplayMode(displayMode === 'hand_only' ? 'video' : 'hand_only')
              }
              className="rounded-md border border-[#D9CEB8] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#44403C] hover:bg-[#F6EFE0] cursor-pointer whitespace-nowrap"
            >
              {displayMode === 'hand_only' ? 'Ver Vídeo' : 'Só Mão'}
            </button>
            <button
              type="button"
              onClick={() => onChangeDisplayMode('hidden')}
              className="inline-flex items-center gap-1 rounded-md bg-[#14532D] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#1B6B3A] cursor-pointer whitespace-nowrap"
              title="Ocultar painel da câmera"
            >
              <EyeOff className="h-3 w-3" />
              <span>Ocultar</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#14532D]">
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          className="h-full w-full object-cover"
        />

        {tracking.status !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#14532D]/90 p-4 text-center text-[#FFFBF2]">
            <Camera className="mb-2 h-7 w-7 text-[#EAB308]" />
            <p className="text-xs font-semibold">
              {tracking.status === 'loading_model'
                ? 'Carregando sensor de gestos...'
                : tracking.status === 'requesting_camera'
                  ? 'Aguardando câmera...'
                  : 'Câmera desligada'}
            </p>
          </div>
        )}

        {tracking.status === 'ready' && !tracking.handDetected && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 px-3 py-1.5 text-center text-xs font-medium text-white">
            Levante sua mão em frente à câmera
          </div>
        )}
      </div>

      {/* Clear non-hue-only gesture readout */}
      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-[#1C1917]">
            {tracking.isPinching ? (
              <Hand className="h-3.5 w-3.5 text-[#B45309]" />
            ) : (
              <Pointer className="h-3.5 w-3.5 text-[#EC4899]" />
            )}
            <span>
              {!tracking.handDetected
                ? 'Procurando mão'
                : tracking.isPinching
                  ? 'Pinça ativa'
                  : 'Apontando'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#57534E] tabular-nums">
            {tracking.handDetected ? `${pinchPercent}%` : '—'}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E6DEC8]">
          <div
            className={`h-full origin-left rounded-full transition-transform duration-100 ${
              tracking.isPinching ? 'bg-[#EAB308]' : 'bg-[#EC4899]'
            }`}
            style={{ transform: `scaleX(${pinchPercent / 100})` }}
          />
        </div>

        {!compact && (
          <p className="text-[11px] leading-relaxed text-[#57534E]">
            Aponte o indicador para mover e junte com o polegar para pinçar.
          </p>
        )}
      </div>
    </div>
  );
}
