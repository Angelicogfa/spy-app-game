import { useCallback, useEffect, useRef, useState } from 'react';
import { HandTrackingState } from '../types/game';

interface UseHandAutoScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  tracking: HandTrackingState;
  enabled?: boolean;
  speedPxPerSec?: number;
}

export interface HandAutoScrollState {
  isOverflowing: boolean;
  canScrollUp: boolean;
  canScrollDown: boolean;
  scrollingDirection: 'up' | 'down' | null;
  scrollStep: (direction: 'up' | 'down') => void;
}

export function useHandAutoScroll({
  containerRef,
  tracking,
  enabled = true,
  speedPxPerSec = 260,
}: UseHandAutoScrollOptions): HandAutoScrollState {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollingDirection, setScrollingDirection] = useState<'up' | 'down' | null>(null);

  const trackingRef = useRef(tracking);
  trackingRef.current = tracking;
  const activeDirRef = useRef<'up' | 'down' | null>(null);

  const updateScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const overflowing = el.scrollHeight > el.clientHeight + 8;
    const up = el.scrollTop > 6;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 6;
    setIsOverflowing(overflowing);
    setCanScrollUp(up);
    setCanScrollDown(down);
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollBounds();

    const onScroll = () => updateScrollBounds();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollBounds);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateScrollBounds());
      observer.observe(el);
      if (el.firstElementChild) {
        observer.observe(el.firstElementChild);
      }
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollBounds);
      observer?.disconnect();
    };
  }, [containerRef, updateScrollBounds]);

  // Smooth, ASD-friendly hand-gesture edge auto-scrolling loop
  useEffect(() => {
    if (!enabled || !isOverflowing) {
      if (activeDirRef.current !== null) {
        activeDirRef.current = null;
        setScrollingDirection(null);
      }
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const el = containerRef.current;
      const t = trackingRef.current;
      let nextDir: 'up' | 'down' | null = null;

      if (el && t.status === 'ready' && t.handDetected) {
        const rect = el.getBoundingClientRect();
        const insideX = t.cursorX >= rect.left - 24 && t.cursorX <= rect.right + 24;
        const insideY = t.cursorY >= rect.top - 16 && t.cursorY <= rect.bottom + 16;

        if (insideX && insideY && el.scrollHeight > el.clientHeight + 8) {
          const zoneHeight = Math.min(110, Math.max(68, rect.height * 0.18));
          const distFromTop = t.cursorY - rect.top;
          const distFromBottom = rect.bottom - t.cursorY;

          if (distFromTop <= zoneHeight && el.scrollTop > 2) {
            const intensity = Math.max(0.35, Math.min(1, 1 - distFromTop / zoneHeight));
            el.scrollTop -= speedPxPerSec * intensity * dt;
            nextDir = 'up';
          } else if (
            distFromBottom <= zoneHeight &&
            el.scrollTop + el.clientHeight < el.scrollHeight - 2
          ) {
            const intensity = Math.max(0.35, Math.min(1, 1 - distFromBottom / zoneHeight));
            el.scrollTop += speedPxPerSec * intensity * dt;
            nextDir = 'down';
          }
        }
      }

      if (nextDir !== activeDirRef.current) {
        activeDirRef.current = nextDir;
        setScrollingDirection(nextDir);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [containerRef, enabled, isOverflowing, speedPxPerSec]);

  const scrollStep = useCallback(
    (direction: 'up' | 'down') => {
      const el = containerRef.current;
      if (!el) return;
      const step = Math.max(210, Math.round(el.clientHeight * 0.65));
      el.scrollBy({
        top: direction === 'down' ? step : -step,
        behavior: 'smooth',
      });
    },
    [containerRef]
  );

  return {
    isOverflowing,
    canScrollUp,
    canScrollDown,
    scrollingDirection,
    scrollStep,
  };
}
