import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { GameScreen } from '../types/game';

interface TopBarProps {
  currentScreen: GameScreen;
  cameraReady: boolean;
  onNavigate: (screen: GameScreen) => void;
}

export function TopBar({ currentScreen, cameraReady, onNavigate }: TopBarProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const HOLD_DURATION_MS = 1400;

  const cancelHold = () => {
    if (holdTimerRef.current !== null) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    if (currentScreen === 'GUARDIAN_PANEL') {
      onNavigate(cameraReady ? 'MISSION_MAP' : 'TITLE_MENU');
      return;
    }
    holdStartRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        cancelHold();
        onNavigate('GUARDIAN_PANEL');
      } else {
        holdTimerRef.current = requestAnimationFrame(tick);
      }
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => cancelHold();
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#D9CEB8] bg-[#FFFBF2]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('TITLE_MENU')}
          className="font-display text-xl font-extrabold tracking-tight text-[#14532D] transition-colors hover:text-[#1B6B3A] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Operação Stella
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#57534E]"
        >
          <button
            type="button"
            onClick={() => onNavigate('TITLE_MENU')}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
              currentScreen === 'TITLE_MENU'
                ? 'border-b-2 border-[#14532D] text-[#14532D]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => onNavigate('CALIBRATION')}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
              currentScreen === 'CALIBRATION'
                ? 'border-b-2 border-[#14532D] text-[#14532D]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Treino de Mãos
          </button>
          <button
            type="button"
            onClick={() => onNavigate(cameraReady ? 'MISSION_MAP' : 'CALIBRATION')}
            className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
              currentScreen === 'MISSION_MAP' || currentScreen === 'PLAYING'
                ? 'border-b-2 border-[#14532D] text-[#14532D]'
                : 'hover:text-[#1C1917]'
            }`}
          >
            Missões
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Hold-to-open Guardian Panel) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigate(
                  currentScreen === 'GUARDIAN_PANEL'
                    ? cameraReady
                      ? 'MISSION_MAP'
                      : 'TITLE_MENU'
                    : 'GUARDIAN_PANEL'
                );
              }
            }}
            title="Segure por 1,5 segundo para abrir o Painel dos Responsáveis"
            className="relative overflow-hidden rounded-lg border border-[#14532D] bg-[#14532D] px-4 py-2 text-xs font-semibold text-[#FFFBF2] transition-colors hover:bg-[#1B6B3A] whitespace-nowrap shrink-0 cursor-pointer select-none"
          >
            <span
              className="pointer-events-none absolute inset-0 bg-[#EAB308]/45 origin-left"
              style={{ transform: `scaleX(${holdProgress / 100})` }}
            />
            <span className="relative flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {currentScreen === 'GUARDIAN_PANEL'
                ? 'Voltar ao Jogo'
                : holdProgress > 0
                  ? 'Segure...'
                  : 'Responsáveis'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
