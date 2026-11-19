import { useEffect, useRef, useState } from 'react';
import { Lock, Play, Star } from 'lucide-react';
import { HERO_IMAGE_PATH } from '../data/missions';
import { PlayerProgress } from '../types/game';
import { ArtworkImage } from './ArtworkImage';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  progress: PlayerProgress;
  cameraReady: boolean;
  onStart: () => void;
  onOpenGuardian: () => void;
}

export function TitleScreen({
  progress,
  cameraReady,
  onStart,
  onOpenGuardian,
}: TitleScreenProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const cancelHold = () => {
    if (holdTimerRef.current !== null) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    holdStartRef.current = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - holdStartRef.current) / 1300) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        cancelHold();
        onOpenGuardian();
      } else {
        holdTimerRef.current = requestAnimationFrame(tick);
      }
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelHold(), []);

  return (
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden p-3 sm:p-5">
      {/* Full-Viewport Game Cabinet Container */}
      <div className="relative flex h-full max-h-[820px] w-full max-w-[1160px] flex-col justify-between overflow-hidden rounded-[2rem] border-4 border-[#14532D] border-b-[10px] bg-[#14532D] shadow-2xl">
        {/* Full-Bleed Vibrant Anime Backdrop */}
        <div className="absolute inset-0">
          <ArtworkImage
            src={HERO_IMAGE_PATH}
            alt="Família de espiões em frente à Academia Eden"
            fallbackTitle="Operação Stella"
            fallbackGradient="from-[#14532D] via-[#1B6B3A] to-[#CA8A04]"
            className="h-full w-full object-cover object-center"
          />
          {/* Calm warm cinematic gradient scrim so foreground title & Play button stay crisp */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#14532D]/60 via-transparent via-45% to-[#14532D]/90" />
        </div>

        {/* Top Floating Game Corner HUD */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-5 sm:p-7">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-[#EAB308] border-b-4 border-b-[#B45309] bg-[#FEF9C3]/95 px-4 py-2 shadow-md">
            <Star className="h-5 w-5 fill-[#EAB308] text-[#B45309]" />
            <span className="font-display text-lg font-extrabold text-[#78350F] tabular-nums">
              {progress.totalStellaStars}
            </span>
            <span className="text-xs font-bold text-[#92400E]">Estrelas Stella</span>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton variant="title" />

            <button
              type="button"
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenGuardian();
                }
              }}
              title="Segure por 1,5 segundo para abrir a Área dos Pais"
              className="game-btn-3d relative overflow-hidden rounded-2xl border-2 border-white/40 border-b-black/40 bg-black/45 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm hover:bg-black/60 cursor-pointer select-none whitespace-nowrap"
            >
              <span
                className="pointer-events-none absolute inset-0 origin-left bg-[#EAB308]/60"
                style={{ transform: `scaleX(${holdProgress / 100})` }}
              />
              <span className="relative flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>{holdProgress > 0 ? 'Segure...' : 'Área dos Pais'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Center: Game Emblem Title + Big Chunky PLAY Button */}
        <div className="relative z-10 flex flex-col items-center px-6 pb-8 text-center sm:pb-11">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#EAB308]/80 bg-[#14532D]/90 px-4 py-1 text-xs font-extrabold tracking-wide text-[#FEF08A] shadow-sm">
            <span>ACADEMIA EDEN</span>
            <span aria-hidden="true">·</span>
            <span>JOGO POR GESTOS DAS MÃOS</span>
          </div>

          <h1
            className="mt-3 font-display text-5xl font-extrabold tracking-tight text-[#FFFBF2] sm:text-6xl"
            style={{ textShadow: '0 4px 18px rgba(0, 0, 0, 0.55)' }}
          >
            Operação Stella
          </h1>

          <p className="mt-2 max-w-md text-sm font-semibold text-[#FEF9C3] sm:text-base">
            Use sua mão no ar para cumprir missões secretas com Anya, Loid, Yor e Bond!
          </p>

          <button
            type="button"
            onClick={onStart}
            className="game-btn-3d mt-6 inline-flex items-center gap-3.5 rounded-3xl border-3 border-[#FBCFE8] border-b-[7px] border-b-[#9D174D] bg-[#EC4899] px-12 py-5 font-display text-2xl font-extrabold text-white shadow-xl hover:scale-[1.03] hover:bg-[#DB2777] cursor-pointer whitespace-nowrap"
          >
            <Play className="h-7 w-7 fill-white" />
            <span>{cameraReady ? 'CONTINUAR' : 'JOGAR'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
