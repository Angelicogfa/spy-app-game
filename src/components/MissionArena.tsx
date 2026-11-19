import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lightbulb, Sparkles, Star } from 'lucide-react';
import { MISSION_BRIEFINGS } from '../data/characters';
import { getMissionMeta } from '../data/missions';
import {
  AccessibilitySettings,
  CameraDisplayMode,
  DifficultyLevel,
  DraggableItem,
  HandTrackingState,
  MissionChallenge,
  MissionDomain,
  SequenceSlotItem,
} from '../types/game';
import {
  playChallengeSuccess,
  playGentleEncourage,
  playItemDrop,
  playPinchGrab,
  playSoftHover,
  playTelepathySparkle,
  speakPtBr,
  stopSpeaking,
} from '../utils/audio';
import { CameraMirror } from './CameraMirror';
import { CharacterNarrator, MissionIntroCutscene, NarratorMood } from './CharacterNarrator';
import { GameHud } from './GameHud';

export interface MissionCompletionPayload {
  domain: MissionDomain;
  level: DifficultyLevel;
  firstTryCount: number;
  totalChallenges: number;
  hintsUsed: number;
  durationSec: number;
  successfulPinches: number;
  earlyDrops: number;
}

interface MissionArenaProps {
  totalStars: number;
  domain: MissionDomain;
  level: DifficultyLevel;
  challenges: MissionChallenge[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  settings: AccessibilitySettings;
  onExitToMap: () => void;
  onToggleSound: () => void;
  onToggleNarration: () => void;
  onChangeCameraDisplayMode: (mode: CameraDisplayMode) => void;
  onOpenGuardian: () => void;
  onCompleteMission: (payload: MissionCompletionPayload) => void;
  onHoldingChange: (item: { label: string; emoji: string } | null) => void;
}

export function MissionArena({
  totalStars,
  domain,
  level,
  challenges,
  videoRef,
  tracking,
  settings,
  onExitToMap,
  onToggleSound,
  onToggleNarration,
  onChangeCameraDisplayMode,
  onOpenGuardian,
  onCompleteMission,
  onHoldingChange,
}: MissionArenaProps) {
  const missionMeta = useMemo(() => getMissionMeta(domain), [domain]);

  const [showIntro, setShowIntro] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [hadMissThisStep, setHadMissThisStep] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'encourage' | 'success';
    message: string;
  } | null>(null);
  const [telepathyRevealed, setTelepathyRevealed] = useState(false);

  const [holdingDragId, setHoldingDragId] = useState<string | null>(null);
  const [placedByZone, setPlacedByZone] = useState<Record<string, DraggableItem[]>>({});
  const [holdingSeqId, setHoldingSeqId] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<Record<number, SequenceSlotItem>>({});
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const firstTryCountRef = useRef<number>(0);
  const hintsUsedRef = useRef<number>(0);
  const successfulPinchesRef = useRef<number>(0);
  const earlyDropsRef = useRef<number>(0);

  const dragItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const dropZoneRefs = useRef<Record<string, HTMLElement | null>>({});
  const seqPoolRefs = useRef<Record<string, HTMLElement | null>>({});
  const seqSlotRefs = useRef<Record<number, HTMLElement | null>>({});
  const choiceRefs = useRef<Record<string, HTMLElement | null>>({});
  const telepathyZoneRef = useRef<HTMLDivElement | null>(null);
  const hintBtnRef = useRef<HTMLButtonElement | null>(null);
  const undoBtnRef = useRef<HTMLButtonElement | null>(null);
  const backBtnRef = useRef<HTMLButtonElement | null>(null);
  const introStartBtnRef = useRef<HTMLButtonElement | null>(null);
  const replayAudioBtnRef = useRef<HTMLButtonElement | null>(null);

  const prevPinchRef = useRef<boolean>(false);
  const lastHoveredRef = useRef<string | null>(null);
  const advancingRef = useRef<boolean>(false);
  const advanceTimerRef = useRef<number | null>(null);

  const challenge = challenges[stepIndex];
  const briefing = MISSION_BRIEFINGS[domain];

  const handleDismissIntro = useCallback(() => {
    stopSpeaking();
    startTimeRef.current = Date.now();
    setShowIntro(false);
  }, []);

  // Speak the character's animated mission introduction when entering the mission
  useEffect(() => {
    if (!showIntro) return;
    speakPtBr(briefing.narration, settings.narrationEnabled);
    return () => {
      stopSpeaking();
    };
  }, [showIntro, briefing.narration, settings.narrationEnabled]);

  useEffect(() => {
    if (showIntro) return;
    setHintTier(0);
    setHadMissThisStep(false);
    setFeedback(null);
    setTelepathyRevealed(false);
    setHoldingDragId(null);
    setHoldingSeqId(null);
    setPlacedByZone({});
    setFilledSlots({});
    advancingRef.current = false;
    onHoldingChange(null);

    if (challenge) {
      speakPtBr(challenge.narrationText, settings.narrationEnabled);
    }
    return () => {
      stopSpeaking();
    };
  }, [showIntro, stepIndex, challenge, settings.narrationEnabled, onHoldingChange]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      onHoldingChange(null);
    };
  }, [onHoldingChange]);

  const placedItemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(placedByZone).forEach((list) => {
      list.forEach((item) => ids.add(item.id));
    });
    return ids;
  }, [placedByZone]);

  const remainingDragItems = useMemo(() => {
    return (challenge?.draggableItems || []).filter((item) => !placedItemIds.has(item.id));
  }, [challenge, placedItemIds]);

  const usedSeqIds = useMemo(() => {
    return new Set(Object.values(filledSlots).map((s) => s.id));
  }, [filledSlots]);

  const emptySequenceIndices = useMemo(() => {
    if (!challenge?.sequencePromptItems) return [];
    return challenge.sequencePromptItems
      .map((item, idx) => (item === null ? idx : -1))
      .filter((idx) => idx !== -1);
  }, [challenge]);

  const triggerStepVictory = useCallback(
    (msg: string) => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      if (!hadMissThisStep) {
        firstTryCountRef.current += 1;
      }
      setFeedback({ type: 'success', message: msg });
      playChallengeSuccess(settings.soundEnabled);
      speakPtBr(msg, settings.narrationEnabled);

      advanceTimerRef.current = window.setTimeout(() => {
        if (stepIndex + 1 < challenges.length) {
          setStepIndex((prev) => prev + 1);
        } else {
          const durationSec = Math.max(5, Math.round((Date.now() - startTimeRef.current) / 1000));
          onCompleteMission({
            domain,
            level,
            firstTryCount: firstTryCountRef.current,
            totalChallenges: challenges.length,
            hintsUsed: hintsUsedRef.current,
            durationSec,
            successfulPinches: successfulPinchesRef.current,
            earlyDrops: earlyDropsRef.current,
          });
        }
      }, 1750);
    },
    [
      hadMissThisStep,
      settings.soundEnabled,
      settings.narrationEnabled,
      stepIndex,
      challenges.length,
      domain,
      level,
      onCompleteMission,
    ]
  );

  const triggerGentleMiss = useCallback(
    (customMsg?: string) => {
      setHadMissThisStep(true);
      setHintTier((prev) => Math.min(3, prev + 1) as 0 | 1 | 2 | 3);
      if (challenge?.telepathyThought) {
        setTelepathyRevealed(true);
      }
      const msg = customMsg || `Quase lá! ${challenge?.hintText || 'Tente com calma!'}`;
      setFeedback({ type: 'encourage', message: msg });
      playGentleEncourage(settings.soundEnabled);
      speakPtBr(msg, settings.narrationEnabled);
    },
    [challenge, settings.soundEnabled, settings.narrationEnabled]
  );

  const activateManualHint = useCallback(() => {
    hintsUsedRef.current += 1;
    setHintTier((prev) => Math.min(3, prev + 1) as 0 | 1 | 2 | 3);
    if (challenge?.telepathyThought) {
      setTelepathyRevealed(true);
    }
    if (challenge) {
      setFeedback({ type: 'encourage', message: `Dica: ${challenge.hintText}` });
      playTelepathySparkle(settings.soundEnabled);
      speakPtBr(challenge.hintText, settings.narrationEnabled);
    }
  }, [challenge, settings.soundEnabled, settings.narrationEnabled]);

  const handleUndoLastDrag = useCallback(() => {
    const zoneIds = Object.keys(placedByZone);
    for (const zId of zoneIds) {
      if (placedByZone[zId] && placedByZone[zId].length > 0) {
        setPlacedByZone((prev) => ({
          ...prev,
          [zId]: prev[zId].slice(0, -1),
        }));
        playItemDrop(settings.soundEnabled);
        return;
      }
    }
  }, [placedByZone, settings.soundEnabled]);

  // Real-time webcam hand-gesture interaction loop
  useEffect(() => {
    if (!challenge || advancingRef.current) return;

    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredTargetId(null);
      if (holdingDragId || holdingSeqId) {
        earlyDropsRef.current += 1;
        setHoldingDragId(null);
        setHoldingSeqId(null);
        onHoldingChange(null);
      }
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    const justReleased = !isPinching && prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const isInside = (el: HTMLElement | null, pad = 14) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - pad &&
        cursorX <= r.right + pad &&
        cursorY >= r.top - pad &&
        cursorY <= r.bottom + pad
      );
    };

    if (challenge.telepathyThought && !telepathyRevealed && isInside(telepathyZoneRef.current, 18)) {
      setTelepathyRevealed(true);
      playTelepathySparkle(settings.soundEnabled);
      speakPtBr(challenge.telepathyThought, settings.narrationEnabled);
    }

    let hovered: string | null = null;

    if (showIntro) {
      if (isInside(introStartBtnRef.current, 18)) {
        hovered = 'btn_intro_start';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          playPinchGrab(settings.soundEnabled);
          handleDismissIntro();
          return;
        }
      } else if (isInside(backBtnRef.current, 12)) {
        hovered = 'btn_back';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          playPinchGrab(settings.soundEnabled);
          onExitToMap();
          return;
        }
      }

      if (hovered !== lastHoveredRef.current) {
        lastHoveredRef.current = hovered;
        setHoveredTargetId(hovered);
        if (hovered) {
          playSoftHover(settings.soundEnabled);
        }
      }
      return;
    }

    if (!holdingDragId && !holdingSeqId) {
      if (isInside(hintBtnRef.current, 12)) {
        hovered = 'btn_hint';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          activateManualHint();
          return;
        }
      } else if (isInside(replayAudioBtnRef.current, 14)) {
        hovered = 'btn_replay_audio';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          playSoftHover(settings.soundEnabled);
          speakPtBr(challenge.narrationText, true);
          return;
        }
      } else if (isInside(undoBtnRef.current, 12)) {
        hovered = 'btn_undo';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          handleUndoLastDrag();
          return;
        }
      } else if (isInside(backBtnRef.current, 12)) {
        hovered = 'btn_back';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          playPinchGrab(settings.soundEnabled);
          onExitToMap();
          return;
        }
      }
    }

    if (challenge.mode === 'pinch_choice') {
      for (const ch of challenge.choices || []) {
        if (isInside(choiceRefs.current[ch.id], 14)) {
          hovered = `choice_${ch.id}`;
          if (justPinched) {
            successfulPinchesRef.current += 1;
            if (ch.isCorrect) {
              triggerStepVictory(challenge.successMessage);
            } else {
              triggerGentleMiss();
            }
          }
          break;
        }
      }
    } else if (challenge.mode === 'drag_count' || challenge.mode === 'drag_buckets') {
      const zones = challenge.dropZones || [];

      if (!holdingDragId) {
        for (const item of remainingDragItems) {
          if (isInside(dragItemRefs.current[item.id], 16)) {
            hovered = `drag_${item.id}`;
            if (justPinched) {
              successfulPinchesRef.current += 1;
              setHoldingDragId(item.id);
              onHoldingChange({ label: item.label, emoji: item.emoji });
              playPinchGrab(settings.soundEnabled);
            }
            break;
          }
        }
      } else {
        let targetZone = null;
        for (const z of zones) {
          if (isInside(dropZoneRefs.current[z.id], 26)) {
            hovered = `zone_${z.id}`;
            targetZone = z;
            break;
          }
        }

        if (justReleased) {
          const item = (challenge.draggableItems || []).find((i) => i.id === holdingDragId);
          setHoldingDragId(null);
          onHoldingChange(null);

          if (!item || !targetZone) {
            earlyDropsRef.current += 1;
          } else if (challenge.mode === 'drag_count') {
            const currentCount = (placedByZone[targetZone.id] || []).length;
            const nextList = [...(placedByZone[targetZone.id] || []), item];
            const nextMap = { ...placedByZone, [targetZone.id]: nextList };
            setPlacedByZone(nextMap);
            playItemDrop(settings.soundEnabled);

            const targetTotal = challenge.targetTotalCount || targetZone.targetCount || 1;
            if (currentCount + 1 === targetTotal) {
              triggerStepVictory(challenge.successMessage);
            } else if (currentCount + 1 > targetTotal) {
              triggerGentleMiss(`Passou de ${targetTotal}! Faça pinça em "Tirar 1".`);
            }
          } else {
            const currentList = placedByZone[targetZone.id] || [];
            const matchesCategory = targetZone.acceptsCategory === item.category;
            const hasCapacity =
              !targetZone.targetCount || currentList.length < targetZone.targetCount;

            if (matchesCategory && hasCapacity) {
              const nextMap = {
                ...placedByZone,
                [targetZone.id]: [...currentList, item],
              };
              setPlacedByZone(nextMap);
              playItemDrop(settings.soundEnabled);

              const totalPlaced = Object.values(nextMap).reduce((acc, arr) => acc + arr.length, 0);
              if (totalPlaced >= (challenge.draggableItems || []).length) {
                triggerStepVictory(challenge.successMessage);
              }
            } else if (!hasCapacity) {
              triggerGentleMiss(`Essa tigela já completou! Tente na outra.`);
            } else {
              triggerGentleMiss(`${item.label} vai no outro lugar! ${challenge.hintText}`);
            }
          }
        }
      }
    } else if (challenge.mode === 'sequence_order') {
      const pool = challenge.sequencePool || [];

      if (!holdingSeqId) {
        for (const item of pool) {
          if (usedSeqIds.has(item.id)) continue;
          if (isInside(seqPoolRefs.current[item.id], 16)) {
            hovered = `seq_${item.id}`;
            if (justPinched) {
              successfulPinchesRef.current += 1;
              setHoldingSeqId(item.id);
              onHoldingChange({ label: item.label, emoji: item.emoji });
              playPinchGrab(settings.soundEnabled);
            }
            break;
          }
        }
      } else {
        let hoveredSlotIdx: number | null = null;
        for (const slotIdx of emptySequenceIndices) {
          if (filledSlots[slotIdx]) continue;
          if (isInside(seqSlotRefs.current[slotIdx], 26)) {
            hovered = `slot_${slotIdx}`;
            hoveredSlotIdx = slotIdx;
            break;
          }
        }

        if (justReleased) {
          const seqItem = pool.find((s) => s.id === holdingSeqId);
          setHoldingSeqId(null);
          onHoldingChange(null);

          if (!seqItem || hoveredSlotIdx === null) {
            earlyDropsRef.current += 1;
          } else {
            const orderPosition = emptySequenceIndices.indexOf(hoveredSlotIdx);
            const expectedId = challenge.sequenceExpectedOrder?.[orderPosition];

            if (expectedId === seqItem.id) {
              const nextFilled = { ...filledSlots, [hoveredSlotIdx]: seqItem };
              setFilledSlots(nextFilled);
              playItemDrop(settings.soundEnabled);

              if (Object.keys(nextFilled).length >= emptySequenceIndices.length) {
                triggerStepVictory(challenge.successMessage);
              }
            } else {
              triggerGentleMiss(`Quase! Veja a ordem certinha: ${challenge.hintText}`);
            }
          }
        }
      }
    }

    if (hovered !== lastHoveredRef.current) {
      lastHoveredRef.current = hovered;
      setHoveredTargetId(hovered);
      if (hovered) {
        playSoftHover(settings.soundEnabled);
      }
    }
  }, [
    tracking,
    showIntro,
    challenge,
    telepathyRevealed,
    holdingDragId,
    holdingSeqId,
    remainingDragItems,
    placedByZone,
    filledSlots,
    usedSeqIds,
    emptySequenceIndices,
    settings.soundEnabled,
    settings.narrationEnabled,
    activateManualHint,
    handleDismissIntro,
    handleUndoLastDrag,
    onExitToMap,
    onHoldingChange,
    triggerStepVictory,
    triggerGentleMiss,
  ]);

  if (!challenge) return null;

  const totalCountPlaced =
    challenge.mode === 'drag_count'
      ? Object.values(placedByZone).reduce((acc, l) => acc + l.length, 0)
      : 0;

  const camMode = settings.cameraDisplayMode;

  const narratorMood: NarratorMood =
    feedback?.type === 'success'
      ? 'celebrate'
      : feedback?.type === 'encourage'
        ? 'encourage'
        : 'idle';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Slim Floating Game HUD with 5 Mission Progress Stars */}
      <GameHud
        totalStars={totalStars}
        settings={settings}
        backLabel="Mapa"
        backIcon="back"
        backButtonRef={backBtnRef}
        backHovered={hoveredTargetId === 'btn_back'}
        onBack={onExitToMap}
        onToggleSound={onToggleSound}
        onToggleNarration={onToggleNarration}
        onChangeCameraDisplayMode={onChangeCameraDisplayMode}
        onOpenGuardian={onOpenGuardian}
        centerSlot={
          <div className="flex h-9 items-center gap-2 rounded-xl border-2 border-[#D9CEB8] bg-[#FFFDF7] px-3.5 shadow-xs">
            <span className="hidden font-display text-xs font-extrabold text-[#14532D] sm:inline">
              {missionMeta.shortTitle}
            </span>
            <div className="flex items-center gap-1" aria-label={`Etapa ${stepIndex + 1} de ${challenges.length}`}>
              {challenges.map((c, idx) => (
                <Star
                  key={c.id}
                  className={`h-4 w-4 transition-transform duration-200 ${
                    idx < stepIndex
                      ? 'fill-[#EAB308] text-[#B45309] scale-105'
                      : idx === stepIndex
                        ? 'fill-[#FBCFE8] text-[#EC4899] scale-115'
                        : 'fill-[#EFE9D8] text-[#D9CEB8]'
                  }`}
                />
              ))}
            </div>
          </div>
        }
      />

      {/* CENTERED FULL-HEIGHT GAME BOARD (Zero Scroll!) */}
      <main className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col px-4 pb-3 pt-1 sm:px-5">
        <section className="game-board-frame relative flex min-h-0 flex-1 flex-col justify-between p-4 sm:p-5">
          {showIntro ? (
            <MissionIntroCutscene
              domain={domain}
              startButtonRef={introStartBtnRef}
              startHovered={hoveredTargetId === 'btn_intro_start'}
              onReplayIntro={() => speakPtBr(briefing.narration, true)}
              onStartMission={handleDismissIntro}
            />
          ) : (
            <>
              {/* Animated Character Narrator Strip (portrait talks & reacts with speech bubble!) */}
              <CharacterNarrator
                characterName={challenge.characterName}
                domain={domain}
                prompt={challenge.prompt}
                mood={narratorMood}
                replayButtonRef={replayAudioBtnRef}
                replayHovered={hoveredTargetId === 'btn_replay_audio'}
                onReplayAudio={() => speakPtBr(challenge.narrationText, true)}
              />

              {/* Floating Feedback Toast (overlays cleanly without pushing game board down!) */}
              {feedback && (
                <div
                  className={`pointer-events-none absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border-2 px-5 py-2.5 text-center font-display text-sm font-extrabold shadow-lg sm:text-base ${
                    feedback.type === 'success'
                      ? 'border-[#059669] bg-[#DCFCE7] text-[#14532D]'
                      : 'border-[#EAB308] bg-[#FEF9C3] text-[#78350F]'
                  }`}
                  role="status"
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#059669]" />
                  ) : (
                    <Sparkles className="h-5 w-5 shrink-0 text-[#B45309]" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* MAXIMIZED PLAYABLE GAME SURFACE */}
              <div className="flex min-h-0 flex-1 flex-col justify-center py-2.5">
            {/* MODE 1: DRAG COUNT */}
            {challenge.mode === 'drag_count' && challenge.dropZones && (
              <div className="grid h-full grid-cols-1 items-center gap-5 md:grid-cols-12">
                <div className="flex h-full items-center justify-center rounded-3xl border-2 border-[#EFE7D4] bg-[#FAF6EB] p-4 md:col-span-7">
                  <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4">
                    {remainingDragItems.map((item, idx) => {
                      const isHolding = holdingDragId === item.id;
                      const isHovered = hoveredTargetId === `drag_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          ref={(el) => {
                            dragItemRefs.current[item.id] = el;
                          }}
                          className={`game-token-3d flex h-20 flex-col items-center justify-center rounded-2xl select-none sm:h-24 ${
                            isHolding
                              ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                              : isHovered
                                ? '-translate-y-1 scale-108 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] shadow-lg'
                                : `${item.accentBorder} border-b-[#B45309] ${item.accentBg}`
                          }`}
                        >
                          <span className="text-4xl leading-none">{item.emoji}</span>
                          {hintTier >= 2 && (
                            <span className="mt-0.5 font-mono text-xs font-bold text-[#78350F] tabular-nums">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex h-full flex-col justify-center gap-3 md:col-span-5">
                  {challenge.dropZones.map((zone) => {
                    const placed = placedByZone[zone.id] || [];
                    const isHovered = hoveredTargetId === `zone_${zone.id}`;
                    const target = challenge.targetTotalCount || zone.targetCount || 1;
                    return (
                      <div
                        key={zone.id}
                        ref={(el) => {
                          dropZoneRefs.current[zone.id] = el;
                        }}
                        className={`flex h-full min-h-[220px] flex-1 flex-col items-center justify-center rounded-[2rem] border-4 border-dashed p-4 text-center shadow-inner transition-transform duration-150 ${
                          holdingDragId && isHovered
                            ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                            : hintTier >= 3 && holdingDragId
                              ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                              : `${zone.accentBorder} ${zone.accentBg}`
                        }`}
                      >
                        <span className="text-6xl leading-none">{zone.emoji}</span>
                        <h2 className="mt-2 font-display text-lg font-extrabold text-[#14532D]">
                          {zone.label}
                        </h2>
                        <div className="mt-1.5 inline-flex rounded-xl bg-white/90 px-4 py-0.5 font-display text-2xl font-extrabold text-[#1C1917] tabular-nums shadow-xs">
                          {placed.length} / {target}
                        </div>

                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                          {placed.map((p) => (
                            <span key={p.id} className="text-2xl leading-none">
                              {p.emoji}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {totalCountPlaced > (challenge.targetTotalCount || 0) && (
                    <button
                      ref={undoBtnRef}
                      type="button"
                      onClick={handleUndoLastDrag}
                      className={`game-btn-3d rounded-2xl border-2 border-[#B45309] border-b-[#78350F] bg-[#FEF3C7] px-4 py-2 font-display text-sm font-extrabold text-[#78350F] cursor-pointer ${
                        hoveredTargetId === 'btn_undo' ? 'scale-105 ring-4 ring-[#FBCFE8]' : ''
                      }`}
                    >
                      Tirar 1
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* MODE 2: DRAG TO BUCKETS */}
            {challenge.mode === 'drag_buckets' && challenge.dropZones && (
              <div className="flex h-full flex-col justify-center gap-4">
                <div className="rounded-3xl border-2 border-[#EFE7D4] bg-[#FAF6EB] p-3.5">
                  <div className="flex flex-wrap justify-center gap-3">
                    {remainingDragItems.map((item) => {
                      const isHolding = holdingDragId === item.id;
                      const isHovered = hoveredTargetId === `drag_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          ref={(el) => {
                            dragItemRefs.current[item.id] = el;
                          }}
                          className={`game-token-3d flex min-w-[104px] flex-col items-center justify-center rounded-2xl px-3.5 py-2.5 select-none ${
                            isHolding
                              ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                              : isHovered
                                ? '-translate-y-1 scale-108 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] shadow-lg'
                                : `${item.accentBorder} border-b-[#57534E]/40 ${item.accentBg}`
                          }`}
                        >
                          <span className="text-4xl leading-none">{item.emoji}</span>
                          <span className="mt-1 font-display text-xs font-extrabold text-[#1C1917]">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`grid flex-1 grid-cols-1 gap-4 ${
                    challenge.dropZones.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                  }`}
                >
                  {challenge.dropZones.map((zone) => {
                    const placed = placedByZone[zone.id] || [];
                    const isHovered = hoveredTargetId === `zone_${zone.id}`;
                    const heldItem = (challenge.draggableItems || []).find(
                      (i) => i.id === holdingDragId
                    );
                    const shouldHintGlow =
                      hintTier >= 3 &&
                      heldItem &&
                      zone.acceptsCategory === heldItem.category &&
                      (!zone.targetCount || placed.length < zone.targetCount);

                    return (
                      <div
                        key={zone.id}
                        ref={(el) => {
                          dropZoneRefs.current[zone.id] = el;
                        }}
                        className={`flex min-h-[155px] flex-col items-center justify-center rounded-[1.8rem] border-4 border-dashed p-4 text-center shadow-inner transition-transform duration-150 ${
                          holdingDragId && isHovered
                            ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                            : shouldHintGlow
                              ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                              : `${zone.accentBorder} ${zone.accentBg}`
                        }`}
                      >
                        <span className="text-4xl leading-none">{zone.emoji}</span>
                        <h2 className="mt-1 font-display text-base font-extrabold text-[#1C1917]">
                          {zone.label}
                        </h2>
                        {zone.targetCount && (
                          <span className="mt-0.5 inline-block rounded-lg bg-white/85 px-2.5 py-0.5 font-mono text-xs font-bold text-[#14532D] tabular-nums">
                            {placed.length} / {zone.targetCount}
                          </span>
                        )}

                        {placed.length > 0 && (
                          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {placed.map((p) => (
                              <span
                                key={p.id}
                                className="rounded-lg bg-white/95 px-2 py-0.5 text-xl shadow-xs"
                                title={p.label}
                              >
                                {p.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 3: SEQUENCE ORDER */}
            {challenge.mode === 'sequence_order' && challenge.sequencePromptItems && (
              <div className="flex flex-col justify-center gap-5">
                <div className="rounded-[1.8rem] border-3 border-[#DFD4BC] bg-[#F4EFE0] p-4 shadow-inner">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {challenge.sequencePromptItems.map((fixedItem, idx) => {
                      if (fixedItem) {
                        return (
                          <div
                            key={`fixed_${idx}`}
                            className={`game-token-3d flex h-24 w-24 flex-col items-center justify-center rounded-2xl border-[#D9CEB8] border-b-[#BFB195] ${fixedItem.bgClass} p-2 text-center sm:h-28 sm:w-28`}
                          >
                            <span className="text-4xl leading-none">{fixedItem.emoji}</span>
                            <span className="mt-1 font-display text-xs font-extrabold text-[#1C1917]">
                              {fixedItem.label}
                            </span>
                          </div>
                        );
                      }

                      const placed = filledSlots[idx];
                      const isHovered = hoveredTargetId === `slot_${idx}`;
                      const emptyOrderIdx = emptySequenceIndices.indexOf(idx);
                      const expectedId = challenge.sequenceExpectedOrder?.[emptyOrderIdx];
                      const shouldGlow =
                        hintTier >= 3 && holdingSeqId !== null && holdingSeqId === expectedId;

                      return (
                        <div
                          key={`slot_${idx}`}
                          ref={(el) => {
                            seqSlotRefs.current[idx] = el;
                          }}
                          className={`flex h-28 w-28 flex-col items-center justify-center rounded-3xl border-4 border-dashed p-2 text-center transition-transform duration-150 sm:h-32 sm:w-32 ${
                            placed
                              ? 'border-solid border-[#059669] bg-[#DCFCE7]'
                              : holdingSeqId && isHovered
                                ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                                : shouldGlow
                                  ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                                  : 'border-[#EC4899] bg-white'
                          }`}
                        >
                          {placed ? (
                            <>
                              <span className="text-4xl leading-none">{placed.emoji}</span>
                              <span className="mt-1 font-display text-xs font-extrabold text-[#14532D]">
                                {placed.label}
                              </span>
                            </>
                          ) : (
                            <span className="font-display text-4xl font-extrabold text-[#EC4899]">
                              {emptySequenceIndices.length > 1 ? `${emptyOrderIdx + 1}º` : '?'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  {(challenge.sequencePool || []).map((item) => {
                    if (usedSeqIds.has(item.id)) return null;
                    const isHolding = holdingSeqId === item.id;
                    const isHovered = hoveredTargetId === `seq_${item.id}`;
                    const nextEmptyPos = emptySequenceIndices.findIndex((i) => !filledSlots[i]);
                    const isNextExpected =
                      nextEmptyPos !== -1 &&
                      challenge.sequenceExpectedOrder?.[nextEmptyPos] === item.id;

                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          seqPoolRefs.current[item.id] = el;
                        }}
                        className={`game-token-3d flex min-w-[132px] flex-col items-center justify-center rounded-2xl px-4 py-3 select-none ${
                          isHolding
                            ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                            : isHovered
                              ? '-translate-y-1 scale-108 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] shadow-lg'
                              : hintTier >= 3 && isNextExpected
                                ? 'animate-hint-halo border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3]'
                                : `border-[#D9CEB8] border-b-[#BFB195] ${item.bgClass}`
                        }`}
                      >
                        <span className="text-4xl leading-none">{item.emoji}</span>
                        <span className="mt-1.5 font-display text-sm font-extrabold text-[#1C1917]">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 4: PINCH CHOICE */}
            {challenge.mode === 'pinch_choice' && (
              <div className="flex flex-col justify-center gap-4">
                {challenge.telepathyThought && (
                  <div
                    ref={telepathyZoneRef}
                    className={`rounded-3xl border-3 px-5 py-3.5 text-center transition-colors ${
                      telepathyRevealed
                        ? 'border-[#EC4899] bg-[#FCE7F3]'
                        : 'border-dashed border-[#EC4899] bg-[#FAF6EB]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 font-display text-xs font-extrabold text-[#9D174D]">
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {telepathyRevealed
                          ? 'Pensamento revelado!'
                          : 'Aponte aqui para usar a Telepatia da Anya!'}
                      </span>
                    </div>
                    {telepathyRevealed ? (
                      <p className="mt-1.5 font-display text-lg font-extrabold text-[#1C1917] sm:text-xl">
                        {challenge.telepathyThought}
                      </p>
                    ) : (
                      <div className="mt-1 flex items-center justify-center gap-3 text-4xl">
                        <span>{challenge.characterEmoji}</span>
                        <span>💭</span>
                      </div>
                    )}
                  </div>
                )}

                {challenge.visualGroups && challenge.visualGroups.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 rounded-3xl border-2 border-[#EFE7D4] bg-[#FAF6EB] px-4 py-3.5">
                    {challenge.visualGroups.map((grp, gIdx) => (
                      <div key={grp.title} className="flex items-center gap-3.5">
                        <div className="rounded-2xl border-2 border-[#DFD4BC] bg-[#FFFDF7] px-4 py-2.5 text-center shadow-xs">
                          <p className="font-display text-xs font-extrabold text-[#57534E]">
                            {grp.title}
                          </p>
                          <div className="mt-1.5 flex max-w-[260px] flex-wrap justify-center gap-1.5">
                            {grp.tokens.map((tok, tIdx) => (
                              <div
                                key={tok.id}
                                className={`relative flex flex-col items-center justify-center rounded-xl px-1.5 py-0.5 ${
                                  tok.crossedOut ? 'bg-[#FEE2E2]/80 opacity-50' : 'bg-[#FFFBF2]'
                                }`}
                              >
                                <span className="text-3xl leading-none">{tok.emoji}</span>
                                {tok.crossedOut && (
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black text-[#DC2626]">
                                    ✕
                                  </span>
                                )}
                                {hintTier >= 2 && !tok.crossedOut && (
                                  <span className="font-mono text-[11px] font-bold text-[#14532D] tabular-nums">
                                    {tIdx + 1}
                                  </span>
                                )}
                                {tok.label.length <= 12 &&
                                  (domain === 'logic' || tok.label === '?') && (
                                    <span className="mt-0.5 font-display text-xs font-extrabold text-[#1C1917]">
                                      {tok.label}
                                    </span>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {grp.operatorAfter && gIdx < challenge.visualGroups!.length - 1 && (
                          <span className="font-display text-3xl font-extrabold text-[#14532D]">
                            {grp.operatorAfter}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tactile 3D Choice Buttons */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    (challenge.choices || []).length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                  }`}
                >
                  {(challenge.choices || []).map((choice) => {
                    const isHovered = hoveredTargetId === `choice_${choice.id}`;
                    const showHalo = hintTier >= 3 && choice.isCorrect;

                    return (
                      <div
                        key={choice.id}
                        ref={(el) => {
                          choiceRefs.current[choice.id] = el;
                        }}
                        className={`game-token-3d flex min-h-[124px] flex-col items-center justify-center rounded-[1.6rem] p-4 text-center select-none ${
                          isHovered
                            ? '-translate-y-1 scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-xl'
                            : showHalo
                              ? 'animate-hint-halo border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3] shadow-md'
                              : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FAF6EB]'
                        }`}
                      >
                        <span className="text-4xl leading-none">{choice.emoji}</span>
                        <span className="mt-1.5 font-display text-xl font-extrabold text-[#1C1917]">
                          {choice.label}
                        </span>
                        {choice.sublabel && (
                          <span className="mt-0.5 text-xs font-semibold text-[#57534E]">
                            {choice.sublabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Slim Bottom Helper Bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 pt-1">
            <button
              ref={hintBtnRef}
              type="button"
              onClick={activateManualHint}
              className={`game-btn-3d inline-flex items-center gap-1.5 rounded-xl border-2 border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3] px-4 py-1.5 font-display text-xs font-extrabold text-[#78350F] cursor-pointer ${
                hoveredTargetId === 'btn_hint' ? 'scale-105 ring-4 ring-[#FBCFE8]' : ''
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              <span>{hintTier === 0 ? 'Dica' : `Mais Dica (${hintTier}/3)`}</span>
            </button>

            <span className="rounded-full bg-[#F4EFE0] px-3 py-1 font-mono text-xs font-bold text-[#14532D]">
              {tracking.handDetected
                ? tracking.isPinching
                  ? 'Pinça ativa'
                  : 'Mão na tela'
                : 'Levante a mão para jogar'}
            </span>
          </div>
            </>
          )}
        </section>
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
