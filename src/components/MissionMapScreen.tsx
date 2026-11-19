import { useEffect, useRef, useState } from 'react';
import { Star, Volume2, VolumeX } from 'lucide-react';
import { MISSIONS_META } from '../data/missions';
import {
  DifficultyLevel,
  HandTrackingState,
  MissionDomain,
  PlayerProgress,
} from '../types/game';
import { playPinchGrab, playSoftHover, speakPtBr } from '../utils/audio';
import { ArtworkImage } from './ArtworkImage';
import { CameraMirror } from './CameraMirror';

interface MissionMapScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  progress: PlayerProgress;
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
  onSelectMission: (domain: MissionDomain) => void;
  onToggleSound: () => void;
}

const LEVELS: { level: DifficultyLevel; label: string; detail: string }[] = [
  { level: 1, label: 'Nível 1 · Iniciante', detail: '1 a 5' },
  { level: 2, label: 'Nível 2 · Agente', detail: '1 a 10' },
  { level: 3, label: 'Nível 3 · Stella', detail: '1 a 20' },
];

export function MissionMapScreen({
  videoRef,
  tracking,
  progress,
  selectedLevel,
  onSelectLevel,
  onSelectMission,
  onToggleSound,
}: MissionMapScreenProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const levelRefs = useRef<Record<number, HTMLElement | null>>({});
  const prevPinchRef = useRef(false);
  const lastHoveredRef = useRef<string | null>(null);

  useEffect(() => {
    speakPtBr(
      'Escolha uma missão secreta! Aponte para um cartão e faça pinça para começar.',
      progress.settings.narrationEnabled
    );
  }, [progress.settings.narrationEnabled]);

  // Hand gesture hit-testing for level tabs and mission cards
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
  }, [
    tracking,
    progress.settings.soundEnabled,
    onSelectLevel,
    onSelectMission,
  ]);

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-7">
      {/* Header Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
            <span>Mapa de Missões</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[#B45309] tabular-nums">
              {progress.totalStellaStars} Estrelas Stella conquistadas
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#14532D]">
            Escolha sua Missão Secreta
          </h1>
        </div>

        {/* Difficulty Selector + Quick Audio Control */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 rounded-xl border border-[#D9CEB8] bg-[#F6EFE0] p-1"
            role="group"
            aria-label="Nível de dificuldade"
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
                  className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-transform duration-150 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#14532D] text-[#FFFBF2] shadow-xs'
                      : 'text-[#44403C] hover:text-[#1C1917]'
                  } ${isHovered ? 'scale-105 ring-2 ring-[#EC4899]' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center gap-1.5 rounded-xl border border-[#D9CEB8] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F6EFE0] whitespace-nowrap cursor-pointer"
            title={progress.settings.soundEnabled ? 'Silenciar sons' : 'Ativar sons'}
          >
            {progress.settings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[#14532D]" />
            ) : (
              <VolumeX className="h-4 w-4 text-[#DC2626]" />
            )}
            <span>{progress.settings.soundEnabled ? 'Som ligado' : 'Som desligado'}</span>
          </button>
        </div>
      </div>

      {/* Main Split: 5 Mission Cards (9 cols) + Live Camera Sidebar (3 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-9">
          {MISSIONS_META.map((mission) => {
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectMission(mission.domain);
                  }
                }}
                className={`group flex flex-col overflow-hidden rounded-3xl border-2 bg-white text-left transition-transform duration-150 ${
                  isHovered
                    ? 'scale-[1.03] border-[#EC4899] ring-4 ring-[#FBCFE8] shadow-xl'
                    : 'border-[#D9CEB8] shadow-sm'
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F6EFE0]">
                  <ArtworkImage
                    src={mission.imagePath}
                    alt={mission.title}
                    fallbackTitle={mission.shortTitle}
                    fallbackGradient={mission.fallbackGradient}
                    className="h-full w-full object-cover"
                  />
                  {isHovered && (
                    <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[#EC4899] px-3 py-1.5 text-center font-display text-sm font-bold text-white shadow-md">
                      Faça Pinça para Iniciar!
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
                      <span className="font-semibold text-[#14532D]">{mission.skillLabel}</span>
                      <div className="flex items-center gap-0.5" aria-label={`${bestStars} de 3 estrelas`}>
                        {[1, 2, 3].map((idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${
                              idx <= bestStars
                                ? 'fill-[#EAB308] text-[#B45309]'
                                : 'text-[#D9CEB8]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h2 className="mt-1.5 font-display text-xl font-extrabold text-[#1C1917]">
                      {mission.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#57534E]">
                      {mission.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#EFE7D4] pt-3 text-xs font-medium text-[#57534E]">
                    <span>{mission.characterGuide}</span>
                    <span className="font-semibold text-[#EC4899]">Pinça para jogar →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Live Hand Mirror & Gesture Guide */}
        <aside className="flex flex-col gap-4 lg:col-span-3">
          <CameraMirror videoRef={videoRef} tracking={tracking} compact />

          <div className="rounded-2xl border border-[#D9CEB8] bg-[#F6EFE0] p-4">
            <h3 className="font-display text-base font-bold text-[#14532D]">
              Como escolher uma missão
            </h3>
            <ol className="mt-2 space-y-2 text-xs leading-relaxed text-[#44403C]">
              <li>
                <strong>1. Aponte</strong> o dedo indicador sobre o cartão da missão desejada.
              </li>
              <li>
                <strong>2. Faça Pinça</strong> (polegar + indicador juntos) para abrir a missão!
              </li>
              <li>
                Você também pode mudar o <strong>Nível</strong> no topo usando pinça.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
