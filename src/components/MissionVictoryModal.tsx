import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Map, RotateCcw, Star } from 'lucide-react';
import { getMissionMeta, MISSIONS_META } from '../data/missions';
import {
  AccessibilitySettings,
  DifficultyLevel,
  HandTrackingState,
  MissionDomain,
} from '../types/game';
import { playPinchGrab, playStellaFanfare, speakPtBr } from '../utils/audio';

interface MissionVictoryModalProps {
  domain: MissionDomain;
  level: DifficultyLevel;
  starsEarned: number;
  firstTryCount: number;
  totalChallenges: number;
  tracking: HandTrackingState;
  settings: AccessibilitySettings;
  onReplay: () => void;
  onNextMission: (nextDomain: MissionDomain) => void;
  onBackToMap: () => void;
}

const CONFETTI_COLORS = ['#EAB308', '#EC4899', '#14532D', '#22C55E', '#F59E0B'];

export function MissionVictoryModal({
  domain,
  level,
  starsEarned,
  firstTryCount,
  totalChallenges,
  tracking,
  settings,
  onReplay,
  onNextMission,
  onBackToMap,
}: MissionVictoryModalProps) {
  const missionMeta = getMissionMeta(domain);
  const currentIdx = MISSIONS_META.findIndex((m) => m.domain === domain);
  const nextMission = MISSIONS_META[(currentIdx + 1) % MISSIONS_META.length];

  const [hoveredBtn, setHoveredBtn] = useState<'next' | 'replay' | 'map' | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const replayBtnRef = useRef<HTMLButtonElement | null>(null);
  const mapBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevPinchRef = useRef(false);

  useEffect(() => {
    playStellaFanfare(settings.soundEnabled);
    speakPtBr(
      `Parabéns! Missão cumprida! Você ganhou ${starsEarned} ${
        starsEarned === 1 ? 'Estrela Stella' : 'Estrelas Stella'
      }!`,
      settings.narrationEnabled
    );
  }, [starsEarned, settings.soundEnabled, settings.narrationEnabled]);

  useEffect(() => {
    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredBtn(null);
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const hit = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - 12 &&
        cursorX <= r.right + 12 &&
        cursorY >= r.top - 12 &&
        cursorY <= r.bottom + 12
      );
    };

    let target: 'next' | 'replay' | 'map' | null = null;
    if (hit(nextBtnRef.current)) target = 'next';
    else if (hit(replayBtnRef.current)) target = 'replay';
    else if (hit(mapBtnRef.current)) target = 'map';

    setHoveredBtn(target);

    if (justPinched && target) {
      playPinchGrab(settings.soundEnabled);
      if (target === 'next') onNextMission(nextMission.domain);
      else if (target === 'replay') onReplay();
      else onBackToMap();
    }
  }, [tracking, settings.soundEnabled, nextMission.domain, onNextMission, onReplay, onBackToMap]);

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto px-4 py-4">
      {/* Gentle Confetti Celebration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, idx) => (
          <span
            key={idx}
            className="animate-confetti absolute top-0 h-3.5 w-3.5 rounded-sm"
            style={{
              left: `${(idx * 5) % 96}%`,
              backgroundColor: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
              animationDelay: `${(idx % 5) * 0.24}s`,
            }}
          />
        ))}
      </div>

      <section className="game-board-frame relative z-10 w-full max-w-[780px] border-[#EAB308] border-b-[#B45309] p-8 text-center sm:p-12">
        <span className="inline-block rounded-full bg-[#DCFCE7] px-4 py-1 font-display text-xs font-extrabold text-[#14532D]">
          {missionMeta.shortTitle} · Nível {level}
        </span>

        <h1 className="mt-3 font-display text-4xl font-extrabold text-[#14532D] sm:text-5xl">
          Missão Cumprida!
        </h1>

        {/* Big Animated Stella Stars */}
        <div className="my-8 flex items-center justify-center gap-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`animate-stella-pop flex h-24 w-24 items-center justify-center rounded-full border-4 sm:h-28 sm:w-28 ${
                idx <= starsEarned
                  ? 'border-[#B45309] bg-[#FEF9C3] shadow-lg'
                  : 'border-[#E6DEC8] bg-[#FAF6EB] opacity-45'
              }`}
              style={{ animationDelay: `${idx * 0.14}s` }}
            >
              <Star
                className={`h-14 w-14 ${
                  idx <= starsEarned ? 'fill-[#EAB308] text-[#B45309]' : 'text-[#D9CEB8]'
                }`}
              />
            </div>
          ))}
        </div>

        <p className="font-display text-lg font-bold text-[#57534E]">
          Acertos de primeira:{' '}
          <span className="font-mono text-[#14532D] tabular-nums">
            {firstTryCount}/{totalChallenges}
          </span>
        </p>

        {/* Big Chunky 3D Gesture-Selectable Game Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            ref={nextBtnRef}
            type="button"
            onClick={() => onNextMission(nextMission.domain)}
            className={`game-btn-3d inline-flex items-center gap-2.5 rounded-3xl border-3 border-[#FBCFE8] border-b-[7px] border-b-[#9D174D] bg-[#EC4899] px-8 py-4 font-display text-xl font-extrabold text-white cursor-pointer whitespace-nowrap ${
              hoveredBtn === 'next' ? 'scale-105 ring-4 ring-[#FBCFE8] shadow-xl' : 'hover:bg-[#DB2777]'
            }`}
          >
            <span>PRÓXIMA: {nextMission.shortTitle.toUpperCase()}</span>
            <ArrowRight className="h-6 w-6" />
          </button>

          <button
            ref={replayBtnRef}
            type="button"
            onClick={onReplay}
            className={`game-btn-3d inline-flex items-center gap-2 rounded-3xl border-3 border-[#86EFAC] border-b-[7px] border-b-[#0D3B1E] bg-[#14532D] px-6 py-4 font-display text-base font-extrabold text-white cursor-pointer whitespace-nowrap ${
              hoveredBtn === 'replay' ? 'scale-105 ring-4 ring-[#86EFAC] shadow-xl' : 'hover:bg-[#1B6B3A]'
            }`}
          >
            <RotateCcw className="h-5 w-5" />
            <span>Jogar de Novo</span>
          </button>

          <button
            ref={mapBtnRef}
            type="button"
            onClick={onBackToMap}
            className={`game-btn-3d inline-flex items-center gap-2 rounded-3xl border-3 border-[#D9CEB8] border-b-[7px] border-b-[#BFB195] bg-[#FAF6EB] px-6 py-4 font-display text-base font-extrabold text-[#1C1917] cursor-pointer whitespace-nowrap ${
              hoveredBtn === 'map' ? 'scale-105 ring-4 ring-[#EC4899]/40 shadow-xl' : 'hover:bg-[#EFE7D4]'
            }`}
          >
            <Map className="h-5 w-5" />
            <span>Mapa</span>
          </button>
        </div>
      </section>
    </main>
  );
}
