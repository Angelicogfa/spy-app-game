import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Hand, Map, RotateCcw, Sparkles, Star } from 'lucide-react';
import { CAMPAIGN_CHAPTERS, getCampaignChapter } from '../data/campaign';
import { CHARACTER_PROFILES, MISSION_BRIEFINGS } from '../data/characters';
import { getMissionMeta, MISSIONS_META } from '../data/missions';
import { useDwellSelect } from '../hooks/useDwellSelect';
import {
  AccessibilitySettings,
  DifficultyLevel,
  HandTrackingState,
  MissionDomain,
} from '../types/game';
import {
  playHighFiveCelebration,
  playPinchGrab,
  playStellaFanfare,
  speakPtBr,
} from '../utils/audio';
import { ArtworkImage } from './ArtworkImage';

interface MissionVictoryModalProps {
  domain: MissionDomain;
  level: DifficultyLevel;
  starsEarned: number;
  firstTryCount: number;
  totalChallenges: number;
  isCampaign: boolean;
  completedCampaignChapterIdx?: number;
  tracking: HandTrackingState;
  settings: AccessibilitySettings;
  onDwellProgressChange?: (pct: number) => void;
  onReplay: () => void;
  onNextMission: (nextDomain: MissionDomain, nextIsCampaign?: boolean) => void;
  onBackToMap: () => void;
}

const CONFETTI_COLORS = ['#EAB308', '#EC4899', '#14532D', '#22C55E', '#F59E0B'];

export function MissionVictoryModal({
  domain,
  level,
  starsEarned,
  firstTryCount,
  totalChallenges,
  isCampaign,
  completedCampaignChapterIdx = 0,
  tracking,
  settings,
  onDwellProgressChange,
  onReplay,
  onNextMission,
  onBackToMap,
}: MissionVictoryModalProps) {
  const missionMeta = getMissionMeta(domain);
  const currentIdx = MISSIONS_META.findIndex((m) => m.domain === domain);
  const nextFreeMission = MISSIONS_META[(currentIdx + 1) % MISSIONS_META.length];

  const completedChapter = getCampaignChapter(completedCampaignChapterIdx);
  const nextChapter = getCampaignChapter((completedCampaignChapterIdx + 1) % CAMPAIGN_CHAPTERS.length);
  const finishedWholeDay = isCampaign && completedCampaignChapterIdx === CAMPAIGN_CHAPTERS.length - 1;

  const hostId = isCampaign ? completedChapter.host : MISSION_BRIEFINGS[domain].host;
  const hostProfile = CHARACTER_PROFILES[hostId];

  const [hoveredBtn, setHoveredBtn] = useState<'next' | 'replay' | 'map' | null>(null);
  const [highFived, setHighFived] = useState(false);
  const [hoveringHighFive, setHoveringHighFive] = useState(false);

  const highFiveRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const replayBtnRef = useRef<HTMLButtonElement | null>(null);
  const mapBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevPinchRef = useRef(false);

  const nextTargetDomain = isCampaign ? nextChapter.domain : nextFreeMission.domain;

  const triggerHighFive = useCallback(() => {
    if (highFived) return;
    setHighFived(true);
    playHighFiveCelebration(settings.soundEnabled);
    speakPtBr('Toca aqui! Waku waku! Você mandou super bem!', settings.narrationEnabled, hostId);
  }, [highFived, settings.soundEnabled, settings.narrationEnabled, hostId]);

  const triggerButton = useCallback(
    (id: string) => {
      playPinchGrab(settings.soundEnabled);
      if (id === 'next') onNextMission(nextTargetDomain, isCampaign);
      else if (id === 'replay') onReplay();
      else if (id === 'map') onBackToMap();
    },
    [settings.soundEnabled, nextTargetDomain, isCampaign, onNextMission, onReplay, onBackToMap]
  );

  useDwellSelect({
    enabled:
      settings.gestureControlMode === 'dwell' &&
      tracking.status === 'ready' &&
      tracking.handDetected &&
      hoveredBtn !== null,
    hoveredId: hoveredBtn,
    durationMs: 1150,
    onProgress: onDwellProgressChange,
    onTrigger: triggerButton,
  });

  useEffect(() => {
    playStellaFanfare(settings.soundEnabled);
    const introMsg = isCampaign
      ? `${completedChapter.outroCelebration} Você ganhou ${starsEarned} ${
          starsEarned === 1 ? 'Estrela Stella' : 'Estrelas Stella'
        }! Abra a mão para dar um toca aqui!`
      : `Parabéns! Missão cumprida! Você ganhou ${starsEarned} ${
          starsEarned === 1 ? 'Estrela Stella' : 'Estrelas Stella'
        }! Abra a mão sobre o personagem para dar um toca aqui!`;
    speakPtBr(introMsg, settings.narrationEnabled, hostId);
  }, [
    starsEarned,
    isCampaign,
    completedChapter.outroCelebration,
    settings.soundEnabled,
    settings.narrationEnabled,
    hostId,
  ]);

  useEffect(() => {
    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredBtn(null);
      setHoveringHighFive(false);
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching, isOpenPalm } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const hit = (el: HTMLElement | null, pad = 12) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - pad &&
        cursorX <= r.right + pad &&
        cursorY >= r.top - pad &&
        cursorY <= r.bottom + pad
      );
    };

    const overHighFive = !highFived && hit(highFiveRef.current, 24);
    setHoveringHighFive(overHighFive);
    if (overHighFive && (isOpenPalm || justPinched)) {
      triggerHighFive();
      return;
    }

    let target: 'next' | 'replay' | 'map' | null = null;
    if (hit(nextBtnRef.current)) target = 'next';
    else if (hit(replayBtnRef.current)) target = 'replay';
    else if (hit(mapBtnRef.current)) target = 'map';

    setHoveredBtn(target);

    if (justPinched && target) {
      triggerButton(target);
    }
  }, [tracking, highFived, triggerHighFive, triggerButton]);

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

      <section className="game-board-frame relative z-10 w-full max-w-[780px] border-[#EAB308] border-b-[#B45309] p-6 text-center sm:p-9">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-block rounded-full bg-[#DCFCE7] px-4 py-1 font-display text-xs font-extrabold text-[#14532D]">
            {missionMeta.shortTitle} · Nível {level}
          </span>
          {isCampaign && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF9C3] px-3.5 py-1 font-display text-xs font-extrabold text-[#B45309]">
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                {finishedWholeDay
                  ? 'Dia Completo nos Forger! (5/5)'
                  : `Campanha · Capítulo ${completedCampaignChapterIdx + 1}/5`}
              </span>
            </span>
          )}
        </div>

        <h1 className="mt-2.5 font-display text-3xl font-extrabold text-[#14532D] sm:text-5xl">
          {finishedWholeDay ? 'Dia Incrível Completo!' : 'Missão Cumprida!'}
        </h1>

        {isCampaign && (
          <p className="mx-auto mt-1.5 max-w-lg text-sm font-semibold text-[#57534E]">
            “{completedChapter.outroCelebration}”
          </p>
        )}

        {/* Stars + Open-Palm High-Five Celebration Row */}
        <div className="my-5 flex flex-wrap items-center justify-center gap-5">
          {/* Interactive High-Five Character Pad */}
          <button
            ref={highFiveRef}
            type="button"
            onClick={triggerHighFive}
            className={`game-token-3d relative flex items-center gap-3 rounded-3xl px-4 py-3 text-left transition-transform cursor-pointer ${
              highFived
                ? 'border-[#059669] border-b-[#065F46] bg-[#DCFCE7] scale-105'
                : hoveringHighFive
                  ? 'scale-108 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8]'
                  : 'animate-float-gentle border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3]'
            }`}
          >
            <div
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-3 bg-white shadow-sm ${
                hostProfile.ringColor
              } ${highFived ? 'animate-char-celebrate' : ''}`}
            >
              <ArtworkImage
                src={hostProfile.portraitSrc}
                alt={hostProfile.displayName}
                fallbackTitle={hostProfile.displayName}
                fallbackGradient={hostProfile.fallbackGradient}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div>
              <span className="flex items-center gap-1.5 font-display text-sm font-extrabold text-[#14532D]">
                {highFived ? (
                  <>
                    <Sparkles className="h-4 w-4 text-[#059669]" />
                    <span>Toca Aqui Feito! 🙌</span>
                  </>
                ) : (
                  <>
                    <Hand className="h-4 w-4 text-[#EC4899]" />
                    <span>Toca Aqui!</span>
                  </>
                )}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-[#57534E]">
                {highFived
                  ? `${hostProfile.displayName} amou comemorar!`
                  : 'Passe a mão aberta aqui!'}
              </span>
            </div>
          </button>

          {/* 3 Animated Stella Stars */}
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`animate-stella-pop flex h-20 w-20 items-center justify-center rounded-full border-4 sm:h-24 sm:w-24 ${
                  idx <= starsEarned
                    ? 'border-[#B45309] bg-[#FEF9C3] shadow-lg'
                    : 'border-[#E6DEC8] bg-[#FAF6EB] opacity-45'
                }`}
                style={{ animationDelay: `${idx * 0.14}s` }}
              >
                <Star
                  className={`h-11 w-11 sm:h-12 sm:w-12 ${
                    idx <= starsEarned ? 'fill-[#EAB308] text-[#B45309]' : 'text-[#D9CEB8]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <p className="font-display text-base font-bold text-[#57534E]">
          Acertos de primeira:{' '}
          <span className="font-mono text-[#14532D] tabular-nums">
            {firstTryCount}/{totalChallenges}
          </span>
        </p>

        {/* Big Chunky 3D Gesture-Selectable Game Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
          <button
            ref={nextBtnRef}
            type="button"
            onClick={() => onNextMission(nextTargetDomain, isCampaign)}
            className={`game-btn-3d inline-flex items-center gap-2.5 rounded-3xl border-3 border-[#FBCFE8] border-b-[7px] border-b-[#9D174D] bg-[#EC4899] px-7 py-3.5 font-display text-lg font-extrabold text-white cursor-pointer whitespace-nowrap sm:text-xl ${
              hoveredBtn === 'next' ? 'scale-105 ring-4 ring-[#FBCFE8] shadow-xl' : 'hover:bg-[#DB2777]'
            }`}
          >
            <span>
              {isCampaign
                ? finishedWholeDay
                  ? 'NOVO DIA NOS FORGER'
                  : `CAPÍTULO ${nextChapter.index + 1}: ${nextChapter.chapterTitle.toUpperCase()}`
                : `PRÓXIMA: ${nextFreeMission.shortTitle.toUpperCase()}`}
            </span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            ref={replayBtnRef}
            type="button"
            onClick={onReplay}
            className={`game-btn-3d inline-flex items-center gap-2 rounded-3xl border-3 border-[#86EFAC] border-b-[7px] border-b-[#0D3B1E] bg-[#14532D] px-5 py-3.5 font-display text-sm font-extrabold text-white cursor-pointer whitespace-nowrap ${
              hoveredBtn === 'replay' ? 'scale-105 ring-4 ring-[#86EFAC] shadow-xl' : 'hover:bg-[#1B6B3A]'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span>Jogar de Novo</span>
          </button>

          <button
            ref={mapBtnRef}
            type="button"
            onClick={onBackToMap}
            className={`game-btn-3d inline-flex items-center gap-2 rounded-3xl border-3 border-[#D9CEB8] border-b-[7px] border-b-[#BFB195] bg-[#FAF6EB] px-5 py-3.5 font-display text-sm font-extrabold text-[#1C1917] cursor-pointer whitespace-nowrap ${
              hoveredBtn === 'map' ? 'scale-105 ring-4 ring-[#EC4899]/40 shadow-xl' : 'hover:bg-[#EFE7D4]'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>Mapa</span>
          </button>
        </div>
      </section>
    </main>
  );
}
