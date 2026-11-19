import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { MISSIONS_META } from '../data/missions';
import {
  CameraDisplayMode,
  DifficultyLevel,
  HandTrackingState,
  MissionDomain,
  PlayerProgress,
} from '../types/game';
import { playPinchGrab, playSoftHover, speakPtBr } from '../utils/audio';
import { ArtworkImage } from './ArtworkImage';
import { CameraMirror } from './CameraMirror';
import { GameHud } from './GameHud';

interface MissionMapScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  progress: PlayerProgress;
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
  onSelectMission: (domain: MissionDomain) => void;
  onToggleSound: () => void;
  onToggleNarration: () => void;
  onChangeCameraDisplayMode: (mode: CameraDisplayMode) => void;
  onBackHome: () => void;
  onOpenGuardian: () => void;
}

const LEVELS: { level: DifficultyLevel; label: string; stars: number }[] = [
  { level: 1, label: 'Nível 1', stars: 1 },
  { level: 2, label: 'Nível 2', stars: 2 },
  { level: 3, label: 'Nível 3', stars: 3 },
];

export function MissionMapScreen({
  videoRef,
  tracking,
  progress,
  selectedLevel,
  onSelectLevel,
  onSelectMission,
  onToggleSound,
  onToggleNarration,
  onChangeCameraDisplayMode,
  onBackHome,
  onOpenGuardian,
}: MissionMapScreenProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const levelRefs = useRef<Record<number, HTMLElement | null>>({});
  const prevPinchRef = useRef(false);
  const lastHoveredRef = useRef<string | null>(null);

  useEffect(() => {
    speakPtBr(
      'Escolha uma missão! Aponte e faça pinça na fase que você quer jogar.',
      progress.settings.narrationEnabled
    );
  }, [progress.settings.narrationEnabled]);

  useEffect(() => {
    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredId(null);
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const hitTest = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return cursorX >= r.left && cursorX <= r.right && cursorY >= r.top && cursorY <= r.bottom;
    };

    let foundId: string | null = null;
    let matchedLevel: DifficultyLevel | null = null;
    let matchedMission: MissionDomain | null = null;

    for (const lvl of LEVELS) {
      if (hitTest(levelRefs.current[lvl.level])) {
        foundId = `level_${lvl.level}`;
        matchedLevel = lvl.level;
        break;
      }
    }

    if (!foundId) {
      for (const m of MISSIONS_META) {
        if (hitTest(cardRefs.current[m.domain])) {
          foundId = `mission_${m.domain}`;
          matchedMission = m.domain;
          break;
        }
      }
    }

    if (foundId !== lastHoveredRef.current) {
      lastHoveredRef.current = foundId;
      setHoveredId(foundId);
      if (foundId) {
        playSoftHover(progress.settings.soundEnabled);
      }
    }

    if (justPinched) {
      if (matchedLevel !== null) {
        playPinchGrab(progress.settings.soundEnabled);
        onSelectLevel(matchedLevel);
      } else if (matchedMission !== null) {
        playPinchGrab(progress.settings.soundEnabled);
        onSelectMission(matchedMission);
      }
    }
  }, [tracking, progress.settings.soundEnabled, onSelectLevel, onSelectMission]);

  const camMode = progress.settings.cameraDisplayMode;

  return (
    <div className="flex min-h-screen flex-col">
      <GameHud
        totalStars={progress.totalStellaStars}
        settings={progress.settings}
        backLabel="Início"
        backIcon="home"
        onBack={onBackHome}
        onToggleSound={onToggleSound}
        onToggleNarration={onToggleNarration}
        onChangeCameraDisplayMode={onChangeCameraDisplayMode}
        onOpenGuardian={onOpenGuardian}
        centerSlot={
          <div
            className="flex items-center gap-1.5 rounded-2xl border-2 border-[#D9CEB8] bg-[#FFFDF7] p-1 shadow-xs"
            role="group"
            aria-label="Nível das fases"
          >
            {LEVELS.map((item) => {
              const isSelected = selectedLevel === item.level;
              const isHovered = hoveredId === `level_${item.level}`;
              return (
                <button
                  key={item.level}
                  ref={(el) => {
                    levelRefs.current[item.level] = el;
                  }}
                  type="button"
                  onClick={() => onSelectLevel(item.level)}
                  className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 font-display text-xs font-extrabold transition-transform duration-150 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#14532D] text-[#FEF9C3] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  } ${isHovered ? 'scale-105 ring-2 ring-[#EC4899]' : ''}`}
                >
                  <span>{'★'.repeat(item.stars)}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Centered Game Stage Select World */}
      <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6">
        <div className="mb-5 text-center">
          <h1 className="font-display text-3xl font-extrabold text-[#14532D] sm:text-4xl">
            Escolha sua Missão
          </h1>
        </div>

        {/* Balanced 5 Stage Portals (centered flex wrap so 3 top + 2 bottom look like a real game map) */}
        <section className="flex w-full flex-wrap items-stretch justify-center gap-5">
          {MISSIONS_META.map((mission, idx) => {
            const bestStars = progress.missionBestStars[`${mission.domain}_${selectedLevel}`] || 0;
            const isHovered = hoveredId === `mission_${mission.domain}`;

            return (
              <div
                key={mission.domain}
                ref={(el) => {
                  cardRefs.current[mission.domain] = el;
                }}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMission(mission.domain)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMission(mission.domain);
                  }
                }}
                className={`game-token-3d flex w-full max-w-[310px] flex-col overflow-hidden rounded-[1.8rem] bg-[#FFFDF7] text-left cursor-pointer ${
                  isHovered
                    ? '-translate-y-1.5 scale-[1.04] border-[#EC4899] border-b-[#9D174D] ring-4 ring-[#FBCFE8] shadow-xl'
                    : 'border-[#D9CEB8] border-b-[#BFB195] shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Stage Art Portal */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F6EFE0]">
                  <ArtworkImage
                    src={mission.imagePath}
                    alt={mission.title}
                    fallbackTitle={mission.shortTitle}
                    fallbackGradient={mission.fallbackGradient}
                    className="h-full w-full object-cover"
                  />

                  {/* Stage Number Crest */}
                  <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFFBF2] bg-[#14532D] font-display text-sm font-extrabold text-[#FEF08A] shadow-md">
                    {idx + 1}
                  </div>

                  {/* Hover Pinch Callout */}
                  {isHovered && (
                    <div className="absolute inset-x-3 bottom-3 rounded-2xl border-2 border-[#FFFBF2] bg-[#EC4899] px-3 py-1.5 text-center font-display text-sm font-extrabold text-white shadow-lg">
                      FAÇA PINÇA PARA JOGAR!
                    </div>
                  )}
                </div>

                {/* Compact Stage Ribbon + 3 Stella Stars */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#1B6B3A]">
                        {mission.shortTitle}
                      </span>
                      <h2 className="font-display text-lg font-extrabold leading-tight text-[#1C1917]">
                        {mission.title}
                      </h2>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-0.5 pt-1"
                      aria-label={`${bestStars} de 3 estrelas`}
                    >
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-5 w-5 ${
                            s <= bestStars
                              ? 'fill-[#EAB308] text-[#B45309]'
                              : 'fill-[#EFE9D8] text-[#D9CEB8]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Quiet Hand Status Bar */}
        <div className="mt-6 rounded-full border border-[#D9CEB8] bg-[#FFFDF7]/90 px-4 py-1.5 font-mono text-xs font-bold text-[#14532D]">
          {tracking.handDetected
            ? 'Mão detectada · Aponte na fase e faça pinça!'
            : 'Levante a mão para a câmera para mover o cursor'}
        </div>
      </main>

      {camMode !== 'hidden' && (
        <div className="fixed bottom-4 right-4 z-40 w-64">
          <CameraMirror
            videoRef={videoRef}
            tracking={tracking}
            displayMode={camMode}
            onChangeDisplayMode={onChangeCameraDisplayMode}
            compact
          />
        </div>
      )}
    </div>
  );
}
