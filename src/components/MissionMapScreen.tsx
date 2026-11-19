import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Play, Star } from 'lucide-react';
import { CAMPAIGN_CHAPTERS, getCampaignChapter } from '../data/campaign';
import { CHARACTER_PROFILES } from '../data/characters';
import { MISSIONS_META } from '../data/missions';
import { useDwellSelect } from '../hooks/useDwellSelect';
import { useHandAutoScroll } from '../hooks/useHandAutoScroll';
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
  onSelectMission: (domain: MissionDomain, isCampaign?: boolean) => void;
  onDwellProgressChange?: (pct: number) => void;
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
  onDwellProgressChange,
  onToggleSound,
  onToggleNarration,
  onChangeCameraDisplayMode,
  onBackHome,
  onOpenGuardian,
}: MissionMapScreenProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollUpBtnRef = useRef<HTMLButtonElement | null>(null);
  const scrollDownBtnRef = useRef<HTMLButtonElement | null>(null);
  const campaignBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const levelRefs = useRef<Record<number, HTMLElement | null>>({});
  const prevPinchRef = useRef(false);
  const lastHoveredRef = useRef<string | null>(null);

  const isDwellMode = progress.settings.gestureControlMode === 'dwell';
  const currentChapter = getCampaignChapter(progress.campaignStepIndex ?? 0);
  const chapterHost = CHARACTER_PROFILES[currentChapter.host];

  const { isOverflowing, canScrollUp, canScrollDown, scrollingDirection, scrollStep } =
    useHandAutoScroll({
      containerRef: scrollContainerRef,
      tracking,
      speedPxPerSec: 260,
    });

  const activateTarget = useCallback(
    (targetId: string) => {
      if (targetId === 'scroll_up') {
        playSoftHover(progress.settings.soundEnabled);
        scrollStep('up');
      } else if (targetId === 'scroll_down') {
        playSoftHover(progress.settings.soundEnabled);
        scrollStep('down');
      } else if (targetId === 'campaign_play') {
        playPinchGrab(progress.settings.soundEnabled);
        onSelectMission(currentChapter.domain, true);
      } else if (targetId.startsWith('level_')) {
        const lvl = Number(targetId.replace('level_', '')) as DifficultyLevel;
        playPinchGrab(progress.settings.soundEnabled);
        onSelectLevel(lvl);
      } else if (targetId.startsWith('mission_')) {
        const dom = targetId.replace('mission_', '') as MissionDomain;
        playPinchGrab(progress.settings.soundEnabled);
        onSelectMission(dom, false);
      }
    },
    [
      progress.settings.soundEnabled,
      scrollStep,
      currentChapter.domain,
      onSelectLevel,
      onSelectMission,
    ]
  );

  // Dwell mode ("Só Apontar / Sem Pinça"): holding hand steady over a card/button selects it!
  useDwellSelect({
    enabled:
      isDwellMode &&
      tracking.status === 'ready' &&
      tracking.handDetected &&
      hoveredId !== null &&
      hoveredId !== 'scroll_up' &&
      hoveredId !== 'scroll_down',
    hoveredId,
    durationMs: 1150,
    onProgress: onDwellProgressChange,
    onTrigger: activateTarget,
  });

  useEffect(() => {
    speakPtBr(
      isDwellMode
        ? 'Escolha uma missão! Mantenha a mão parada na fase ou na Campanha do Dia para jogar.'
        : 'Escolha uma missão! Aponte e faça pinça na fase ou na Campanha do Dia!',
      progress.settings.narrationEnabled,
      'anya'
    );
  }, [progress.settings.narrationEnabled, isDwellMode]);

  useEffect(() => {
    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredId(null);
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const hitTest = (el: HTMLElement | null, pad = 0) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - pad &&
        cursorX <= r.right + pad &&
        cursorY >= r.top - pad &&
        cursorY <= r.bottom + pad
      );
    };

    let foundId: string | null = null;

    if (canScrollUp && hitTest(scrollUpBtnRef.current, 10)) {
      foundId = 'scroll_up';
    } else if (canScrollDown && hitTest(scrollDownBtnRef.current, 10)) {
      foundId = 'scroll_down';
    }

    if (!foundId) {
      for (const lvl of LEVELS) {
        if (hitTest(levelRefs.current[lvl.level])) {
          foundId = `level_${lvl.level}`;
          break;
        }
      }
    }

    if (!foundId) {
      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
      const insideViewport =
        !containerRect ||
        (cursorY >= containerRect.top && cursorY <= containerRect.bottom);

      if (insideViewport) {
        if (hitTest(campaignBtnRef.current, 8)) {
          foundId = 'campaign_play';
        } else {
          for (const m of MISSIONS_META) {
            if (hitTest(cardRefs.current[m.domain])) {
              foundId = `mission_${m.domain}`;
              break;
            }
          }
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

    if (justPinched && foundId) {
      activateTarget(foundId);
    }
  }, [
    tracking,
    canScrollUp,
    canScrollDown,
    progress.settings.soundEnabled,
    activateTarget,
  ]);

  const camMode = progress.settings.cameraDisplayMode;
  const actionVerb = isDwellMode ? 'SEGURE A MÃO AQUI!' : 'FAÇA PINÇA PARA JOGAR!';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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
            className="flex items-center gap-1 rounded-xl border-2 border-[#D9CEB8] bg-[#FFFDF7] p-0.5 shadow-xs"
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
                  className={`flex items-center gap-1 rounded-lg px-3 py-1 font-display text-xs font-extrabold transition-transform duration-150 whitespace-nowrap cursor-pointer ${
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

      {/* Responsive Stage Select World: Story Campaign + 5 Missions */}
      <main className="relative mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col px-4 pb-2 pt-1 sm:px-6">
        {canScrollUp && (
          <div className="pointer-events-none absolute inset-x-4 top-2 z-20 flex justify-center sm:inset-x-6">
            <button
              ref={scrollUpBtnRef}
              type="button"
              onClick={() => scrollStep('up')}
              className={`pointer-events-auto game-btn-3d inline-flex items-center gap-1.5 rounded-full border-2 border-[#14532D] border-b-[#0D3B1E] bg-[#DCFCE7]/95 px-5 py-2 font-display text-xs font-extrabold text-[#14532D] shadow-lg backdrop-blur-xs cursor-pointer ${
                hoveredId === 'scroll_up' || scrollingDirection === 'up'
                  ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] text-[#9D174D] ring-4 ring-[#FBCFE8]'
                  : ''
              }`}
            >
              <ChevronUp className="h-4 w-4" />
              <span>Subir lista (aponte ou faça pinça)</span>
            </button>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className={`flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-contain ${
            isOverflowing ? 'justify-start py-10' : 'justify-center py-1'
          }`}
        >
          {/* STORY CAMPAIGN BANNER: "Um Dia na Família Forger" */}
          <section className="mb-3.5 w-full max-w-[932px] rounded-3xl border-3 border-[#EAB308] border-b-[6px] border-b-[#B45309] bg-gradient-to-r from-[#FEF9C3] via-[#FFFDF7] to-[#FCE7F3] p-3 shadow-md sm:px-4 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-3 bg-white shadow-xs ${chapterHost.ringColor}`}
                >
                  <ArtworkImage
                    src={chapterHost.portraitSrc}
                    alt={chapterHost.displayName}
                    fallbackTitle={chapterHost.displayName}
                    fallbackGradient={chapterHost.fallbackGradient}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#14532D] px-2 py-0.5 font-display text-[10px] font-extrabold text-[#FEF9C3]">
                      <BookOpen className="h-3 w-3" />
                      <span>CAMPANHA · UM DIA NOS FORGER</span>
                    </span>
                    <span className="text-[11px] font-extrabold text-[#B45309]">
                      {currentChapter.timeEmoji} Capítulo {currentChapter.index + 1}/5
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-display text-sm font-extrabold text-[#1C1917] sm:text-base">
                    {currentChapter.chapterTitle} —{' '}
                    <span className="font-sans text-xs font-semibold text-[#57534E]">
                      {currentChapter.storyHook}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* 5-Chapter Mini Timeline Dots */}
                <div className="hidden items-center gap-1 md:flex" aria-hidden="true">
                  {CAMPAIGN_CHAPTERS.map((ch) => (
                    <span
                      key={ch.index}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        ch.index < currentChapter.index
                          ? 'bg-[#059669] text-white'
                          : ch.index === currentChapter.index
                            ? 'bg-[#EC4899] text-white ring-2 ring-[#FBCFE8]'
                            : 'bg-[#EFE7D4] text-[#78716C]'
                      }`}
                      title={ch.chapterTitle}
                    >
                      {ch.index < currentChapter.index ? '✓' : ch.index + 1}
                    </span>
                  ))}
                </div>

                <button
                  ref={campaignBtnRef}
                  type="button"
                  onClick={() => onSelectMission(currentChapter.domain, true)}
                  className={`game-btn-3d inline-flex items-center gap-1.5 rounded-2xl border-2 border-[#FBCFE8] border-b-[5px] border-b-[#9D174D] bg-[#EC4899] px-4 py-2 font-display text-xs font-extrabold text-white shadow-md hover:bg-[#DB2777] cursor-pointer whitespace-nowrap ${
                    hoveredId === 'campaign_play' ? 'scale-105 ring-4 ring-[#FBCFE8]' : ''
                  }`}
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>Jogar Capítulo {currentChapter.index + 1}</span>
                </button>
              </div>
            </div>
          </section>

          {/* 5 Free-Play Mission Portals */}
          <section className="flex w-full flex-wrap items-stretch justify-center gap-3.5">
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
                  onClick={() => onSelectMission(mission.domain, false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMission(mission.domain, false);
                    }
                  }}
                  className={`game-token-3d flex w-full max-w-[330px] flex-col overflow-hidden rounded-[1.4rem] bg-[#FFFDF7] text-left cursor-pointer sm:w-[295px] ${
                    isHovered
                      ? '-translate-y-1 scale-[1.03] border-[#EC4899] border-b-[#9D174D] ring-4 ring-[#FBCFE8] shadow-xl'
                      : 'border-[#D9CEB8] border-b-[#BFB195] shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#F6EFE0]">
                    <ArtworkImage
                      src={mission.imagePath}
                      alt={mission.title}
                      fallbackTitle={mission.shortTitle}
                      fallbackGradient={mission.fallbackGradient}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#FFFBF2] bg-[#14532D] font-display text-xs font-extrabold text-[#FEF08A] shadow-md">
                      {idx + 1}
                    </div>

                    {isHovered && (
                      <div className="absolute inset-x-2.5 bottom-2 rounded-xl border-2 border-[#FFFBF2] bg-[#EC4899] px-2.5 py-1 text-center font-display text-xs font-extrabold text-white shadow-lg">
                        {actionVerb}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold leading-none text-[#1B6B3A]">
                        {mission.shortTitle}
                      </span>
                      <h2 className="mt-0.5 truncate font-display text-sm font-extrabold text-[#1C1917]">
                        {mission.title}
                      </h2>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      aria-label={`${bestStars} de 3 estrelas`}
                    >
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= bestStars
                              ? 'fill-[#EAB308] text-[#B45309]'
                              : 'fill-[#EFE9D8] text-[#D9CEB8]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {canScrollDown && (
          <div className="pointer-events-none absolute inset-x-4 bottom-10 z-20 flex justify-center sm:inset-x-6">
            <button
              ref={scrollDownBtnRef}
              type="button"
              onClick={() => scrollStep('down')}
              className={`pointer-events-auto game-btn-3d inline-flex items-center gap-1.5 rounded-full border-2 border-[#14532D] border-b-[#0D3B1E] bg-[#DCFCE7]/95 px-5 py-2 font-display text-xs font-extrabold text-[#14532D] shadow-lg backdrop-blur-xs cursor-pointer ${
                hoveredId === 'scroll_down' || scrollingDirection === 'down'
                  ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] text-[#9D174D] ring-4 ring-[#FBCFE8]'
                  : ''
              }`}
            >
              <ChevronDown className="h-4 w-4" />
              <span>Ver mais missões (aponte ou faça pinça)</span>
            </button>
          </div>
        )}

        <div className="mt-1 shrink-0 self-center rounded-full border border-[#D9CEB8] bg-[#FFFDF7]/90 px-4 py-1 text-center font-mono text-xs font-bold text-[#14532D]">
          {tracking.handDetected
            ? isDwellMode
              ? 'Modo Só Apontar ativo · Pare a mão sobre a fase para entrar'
              : isOverflowing
                ? 'Leve a mão ao topo ou base para rolar · Faça pinça na fase!'
                : 'Mão na tela · Aponte na fase e faça pinça!'
            : 'Levante a mão para a câmera para escolher uma fase'}
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

