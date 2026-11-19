import { useEffect, useRef } from 'react';

interface UseDwellSelectOptions {
  enabled: boolean;
  hoveredId: string | null;
  durationMs?: number;
  onProgress?: (progress: number) => void;
  onTrigger: (targetId: string) => void;
}

/**
 * Enables "Só Apontar (Sem Pinça)" mode:
 * Holding the hand cursor steady over a target for ~1.15s smoothly fills a visual
 * ring around the cursor and activates the target automatically with zero finger pinch strain.
 */
export function useDwellSelect({
  enabled,
  hoveredId,
  durationMs = 1150,
  onProgress,
  onTrigger,
}: UseDwellSelectOptions) {
  const onTriggerRef = useRef(onTrigger);
  const onProgressRef = useRef(onProgress);
  onTriggerRef.current = onTrigger;
  onProgressRef.current = onProgress;

  const triggeredForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !hoveredId) {
      triggeredForRef.current = null;
      onProgressRef.current?.(0);
      return;
    }

    if (triggeredForRef.current === hoveredId) {
      onProgressRef.current?.(0);
      return;
    }

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(1, elapsed / durationMs);
      onProgressRef.current?.(pct);

      if (pct >= 1) {
        triggeredForRef.current = hoveredId;
        onProgressRef.current?.(0);
        onTriggerRef.current(hoveredId);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      onProgressRef.current?.(0);
    };
  }, [enabled, hoveredId, durationMs]);

  useEffect(() => {
    return () => {
      onProgressRef.current?.(0);
    };
  }, []);
}
