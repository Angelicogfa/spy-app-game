import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

interface GuardianHoldButtonProps {
  variant: 'title' | 'hud';
  onOpenGuardian: () => void;
}

const HOLD_DURATION_MS = 3000;

export function GuardianHoldButton({ variant, onOpenGuardian }: GuardianHoldButtonProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(3);
  const [showHint, setShowHint] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  const stopHold = useCallback((showEarlyHint: boolean, target?: HTMLButtonElement | null) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (target && activePointerIdRef.current !== null) {
      try {
        if (target.hasPointerCapture(activePointerIdRef.current)) {
          target.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        // Ignore pointer capture release errors
      }
    }
    activePointerIdRef.current = null;
    setHoldProgress(0);
    setRemainingSec(3);

    if (showEarlyHint) {
      setShowHint(true);
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
      hintTimerRef.current = window.setTimeout(() => {
        setShowHint(false);
        hintTimerRef.current = null;
      }, 2000);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only respond to primary mouse button or touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    setShowHint(false);
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }

    const btn = e.currentTarget;
    activePointerIdRef.current = e.pointerId;
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if browser doesn't support pointer capture
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      const secsLeft = Math.max(1, Math.ceil((HOLD_DURATION_MS - elapsed) / 1000));
      setHoldProgress(pct);
      setRemainingSec(secsLeft);

      if (elapsed >= HOLD_DURATION_MS) {
        stopHold(false, btn);
        onOpenGuardian();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current === null) return;
    if (e.pointerId !== activePointerIdRef.current) return;
    const elapsed = performance.now() - startRef.current;
    stopHold(elapsed < HOLD_DURATION_MS, e.currentTarget);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  const isHolding = holdProgress > 0;
  const idleLabel = variant === 'title' ? 'Área dos Pais' : 'Pais';
  const label = isHolding
    ? `Segure ${remainingSec}s...`
    : showHint
      ? 'Segure por 3s'
      : idleLabel;

  if (variant === 'title') {
    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={() => stopHold(false)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenGuardian();
          }
        }}
        title="Clique e segure por 3 segundos para abrir a Área dos Pais"
        className={`game-btn-3d relative overflow-hidden rounded-2xl border-2 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm cursor-pointer touch-none select-none whitespace-nowrap ${
          showHint
            ? 'border-[#FEF08A] border-b-[#B45309] bg-[#92400E]/90'
            : 'border-white/40 border-b-black/40 bg-black/45 hover:bg-black/60'
        }`}
      >
        <span
          className="pointer-events-none absolute inset-0 origin-left bg-[#EAB308]/75 transition-none"
          style={{ transform: `scaleX(${holdProgress / 100})` }}
        />
        <span className="relative flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{label}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={() => stopHold(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenGuardian();
        }
      }}
      title="Clique e segure por 3 segundos para abrir a Área dos Pais"
      className={`game-btn-3d relative h-9 overflow-hidden rounded-xl border-2 px-2.5 text-xs font-bold cursor-pointer touch-none select-none whitespace-nowrap ${
        showHint
          ? 'border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3] text-[#78350F]'
          : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#57534E] hover:text-[#14532D]'
      }`}
    >
      <span
        className="pointer-events-none absolute inset-0 origin-left bg-[#EAB308]/55 transition-none"
        style={{ transform: `scaleX(${holdProgress / 100})` }}
      />
      <span className="relative flex items-center gap-1">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span className="tabular-nums">{label}</span>
      </span>
    </button>
  );
}
