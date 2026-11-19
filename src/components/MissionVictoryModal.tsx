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

const CONFETTI_COLORS = ['#EAB308', '#EC4899', '#14532D', '#DC2626', '#22C55E', '#F59E0B'];

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
      `Parabéns! Missão cumprida com elegância! Você conquistou ${starsEarned} ${
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
      return cursorX >= r.left - 10 && cursorX <= r.right + 10 && cursorY >= r.top - 10 && cursorY <= r.bottom + 10;
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
    <main className="relative mx-auto flex min-h-[78vh] max-w-[1000px] items-center justify-center overflow-hidden px-6 py-10">
      {/* Celebratory Confetti Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, idx) => (
          <span
            key={idx}
            className="animate-confetti absolute top-0 h-3 w-3 rounded-xs"
            style={{
              left: `${(idx * 4.2) % 98}%`,
              backgroundColor: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
              animationDelay: `${(idx % 6) * 0.22}s`,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 w-full rounded-3xl border-2 border-[#EAB308] bg-white p-8 text-center shadow-lg sm:p-12">
        <p className="text-sm font-bold text-[#14532D]">
          Academia Eden · {missionMeta.title} · Nível {level}
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-[#1C1917] sm:text-5xl">
          Missão Cumprida!
        </h1>
        <p className="mt-2 text-base text-[#57534E]">
          Waku waku! A Família Forger está super orgulhosa de você!
        </p>

        {/* Animated Stella Stars */}
        <div className="my-8 flex items-center justify-center gap-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`animate-stella-pop flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                idx <= starsEarned
                  ? 'border-[#B45309] bg-[#FEF9C3] shadow-md'
                  : 'border-[#E6DEC8] bg-[#FFFBF2] opacity-45'
              }`}
              style={{ animationDelay: `${idx * 0.14}s` }}
            >
              <Star
                className={`h-12 w-12 ${
                  idx <= starsEarned ? 'fill-[#EAB308] text-[#B45309]' : 'text-[#D9CEB8]'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="mx-auto flex max-w-md items-center justify-center gap-6 rounded-2xl bg-[#F6EFE0] px-6 py-4 text-sm font-semibold text-[#1C1917]">
          <div>
            <span className="block text-xs text-[#57534E]">Estrelas Stella</span>
            <span className="font-mono text-2xl font-bold text-[#B45309] tabular-nums">
              +{starsEarned}
            </span>
          </div>
          <div className="h-8 w-px bg-[#D9CEB8]" />
          <div>
            <span className="block text-xs text-[#57534E]">Acertos de primeira</span>
            <span className="font-mono text-2xl font-bold text-[#14532D] tabular-nums">
              {firstTryCount}/{totalChallenges}
            </span>
          </div>
        </div>

        <p className="mt-5 text-xs font-semibold text-[#57534E]">
          Aponte e faça Pinça no botão que você quer escolher:
        </p>

        {/* Large Gesture-Selectable Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            ref={nextBtnRef}
            type="button"
            onClick={() => onNextMission(nextMission.domain)}
            className={`inline-flex items-center gap-2 rounded-2xl bg-[#EC4899] px-7 py-4 font-display text-lg font-bold text-white transition-transform duration-150 whitespace-nowrap cursor-pointer ${
              hoveredBtn === 'next' ? 'scale-105 ring-4 ring-[#FBCFE8] shadow-lg' : 'hover:bg-[#DB2777]'
            }`}
          >
            <span>Próxima: {nextMission.shortTitle}</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            ref={replayBtnRef}
            type="button"
            onClick={onReplay}
            className={`inline-flex items-center gap-2 rounded-2xl border-2 border-[#14532D] bg-[#14532D] px-6 py-4 font-display text-base font-bold text-white transition-transform duration-150 whitespace-nowrap cursor-pointer ${
              hoveredBtn === 'replay' ? 'scale-105 ring-4 ring-[#86EFAC] shadow-lg' : 'hover:bg-[#1B6B3A]'
            }`}
          >
            <RotateCcw className="h-5 w-5" />
            <span>Jogar Novamente</span>
          </button>

          <button
            ref={mapBtnRef}
            type="button"
            onClick={onBackToMap}
            className={`inline-flex items-center gap-2 rounded-2xl border-2 border-[#D9CEB8] bg-[#F6EFE0] px-6 py-4 font-display text-base font-bold text-[#1C1917] transition-transform duration-150 whitespace-nowrap cursor-pointer ${
              hoveredBtn === 'map' ? 'scale-105 ring-4 ring-[#EC4899]/40 shadow-lg' : 'hover:bg-[#EFE7D4]'
            }`}
          >
            <Map className="h-5 w-5" />
            <span>Mapa de Missões</span>
          </button>
        </div>
      </section>
    </main>
  );
}
