import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  EyeOff,
  Hand,
  Lightbulb,
  Sparkles,
  Star,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
import { ArtworkImage } from './ArtworkImage';
import { CameraMirror } from './CameraMirror';

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
  onCompleteMission: (payload: MissionCompletionPayload) => void;
  onHoldingChange: (item: { label: string; emoji: string } | null) => void;
}

export function MissionArena({
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
  onCompleteMission,
  onHoldingChange,
}: MissionArenaProps) {
  const missionMeta = useMemo(() => getMissionMeta(domain), [domain]);

  const [stepIndex, setStepIndex] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [hadMissThisStep, setHadMissThisStep] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'encourage' | 'success';
    message: string;
  } | null>(null);
  const [telepathyRevealed, setTelepathyRevealed] = useState(false);

  // Drag & Drop state for drag_count / drag_buckets
  const [holdingDragId, setHoldingDragId] = useState<string | null>(null);
  const [placedByZone, setPlacedByZone] = useState<Record<string, DraggableItem[]>>({});

  // Sequence order state
  const [holdingSeqId, setHoldingSeqId] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<Record<number, SequenceSlotItem>>({});

  // Hover highlight state for gesture targets
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Session telemetry refs
  const startTimeRef = useRef<number>(Date.now());
  const firstTryCountRef = useRef<number>(0);
  const hintsUsedRef = useRef<number>(0);
  const successfulPinchesRef = useRef<number>(0);
  const earlyDropsRef = useRef<number>(0);

  // DOM element refs for hit-testing
  const dragItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const dropZoneRefs = useRef<Record<string, HTMLElement | null>>({});
  const seqPoolRefs = useRef<Record<string, HTMLElement | null>>({});
  const seqSlotRefs = useRef<Record<number, HTMLElement | null>>({});
  const choiceRefs = useRef<Record<string, HTMLElement | null>>({});
  const telepathyZoneRef = useRef<HTMLDivElement | null>(null);
  const hintBtnRef = useRef<HTMLButtonElement | null>(null);
  const undoBtnRef = useRef<HTMLButtonElement | null>(null);
  const backBtnRef = useRef<HTMLButtonElement | null>(null);

  const prevPinchRef = useRef<boolean>(false);
  const lastHoveredRef = useRef<string | null>(null);
  const advancingRef = useRef<boolean>(false);
  const advanceTimerRef = useRef<number | null>(null);

  const challenge = challenges[stepIndex];

  // Reset per-challenge state whenever stepIndex changes
  useEffect(() => {
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
  }, [stepIndex, challenge, settings.narrationEnabled, onHoldingChange]);

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
      setHintTier((prev) => {
        const next = Math.min(3, prev + 1) as 0 | 1 | 2 | 3;
        return next;
      });
      if (challenge?.telepathyThought) {
        setTelepathyRevealed(true);
      }
      const msg = customMsg || `Quase lá! Dica: ${challenge?.hintText || 'tente novamente com calma.'}`;
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
      setFeedback({ type: 'encourage', message: `Dica da Família Forger: ${challenge.hintText}` });
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

  // Main real-time webcam gesture interaction loop
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

    const isInside = (el: HTMLElement | null, pad = 12) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - pad &&
        cursorX <= r.right + pad &&
        cursorY >= r.top - pad &&
        cursorY <= r.bottom + pad
      );
    };

    // 1. Check Telepathy Thought Bubble hover reveal (no pinch required — pointing activates telepathy!)
    if (challenge.telepathyThought && !telepathyRevealed && isInside(telepathyZoneRef.current, 16)) {
      setTelepathyRevealed(true);
      playTelepathySparkle(settings.soundEnabled);
      speakPtBr(challenge.telepathyThought, settings.narrationEnabled);
    }

    // 2. Check toolbar buttons (Hint, Undo, Back) when not holding an item
    let hovered: string | null = null;

    if (!holdingDragId && !holdingSeqId) {
      if (isInside(hintBtnRef.current, 10)) {
        hovered = 'btn_hint';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          activateManualHint();
          return;
        }
      } else if (isInside(undoBtnRef.current, 10)) {
        hovered = 'btn_undo';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          handleUndoLastDrag();
          return;
        }
      } else if (isInside(backBtnRef.current, 10)) {
        hovered = 'btn_back';
        if (justPinched) {
          successfulPinchesRef.current += 1;
          playPinchGrab(settings.soundEnabled);
          onExitToMap();
          return;
        }
      }
    }

    // 3. Mode-specific interactions
    if (challenge.mode === 'pinch_choice') {
      const choices = challenge.choices || [];
      for (const ch of choices) {
        if (isInside(choiceRefs.current[ch.id], 12)) {
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
          if (isInside(dragItemRefs.current[item.id], 14)) {
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
        // Currently holding an item — check drop zones
        let targetZone = null;
        for (const z of zones) {
          if (isInside(dropZoneRefs.current[z.id], 24)) {
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
              triggerGentleMiss(
                `Ops! Passou de ${targetTotal}. Faça pinça em "Tirar 1" para ajustar!`
              );
            }
          } else {
            // drag_buckets
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
              const totalExpected = (challenge.draggableItems || []).length;
              if (totalPlaced >= totalExpected) {
                triggerStepVictory(challenge.successMessage);
              }
            } else if (!hasCapacity) {
              triggerGentleMiss(
                `A ${targetZone.label} já está completa! Coloque na outra tigela.`
              );
            } else {
              triggerGentleMiss(
                `${item.label} pertence a outro lugar! ${challenge.hintText}`
              );
            }
          }
        }
      }
    } else if (challenge.mode === 'sequence_order') {
      const pool = challenge.sequencePool || [];

      if (!holdingSeqId) {
        for (const item of pool) {
          if (usedSeqIds.has(item.id)) continue;
          if (isInside(seqPoolRefs.current[item.id], 14)) {
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
          if (isInside(seqSlotRefs.current[slotIdx], 24)) {
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
              triggerGentleMiss(
                `Quase! Tente observar a ordem certinha: ${challenge.hintText}`
              );
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
  const cycleCameraMode = () => {
    const next: CameraDisplayMode =
      camMode === 'hidden' ? 'hand_only' : camMode === 'hand_only' ? 'video' : 'hidden';
    onChangeCameraDisplayMode(next);
  };

  return (
    <main className="mx-auto max-w-[1000px] px-5 py-5">
      {/* Centered Unobtrusive Top Mission HUD */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D9CEB8] bg-[#F6EFE0] px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            ref={backBtnRef}
            type="button"
            onClick={onExitToMap}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-[#D9CEB8] bg-white px-3.5 py-2 text-xs font-bold text-[#1C1917] transition-transform duration-150 whitespace-nowrap cursor-pointer ${
              hoveredTargetId === 'btn_back' ? 'scale-105 ring-2 ring-[#EC4899]' : ''
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Mapa</span>
          </button>

          <div>
            <p className="text-xs font-semibold text-[#57534E]">
              {missionMeta.skillLabel} · Nível {level}
            </p>
            <h1 className="font-display text-lg font-extrabold text-[#14532D]">
              {missionMeta.title}
            </h1>
          </div>
        </div>

        {/* Step Progress & Quick Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
              Etapa {stepIndex + 1}/{challenges.length}
            </span>
            <div className="flex items-center gap-1">
              {challenges.map((c, idx) => (
                <div
                  key={c.id}
                  className={`h-2.5 w-6 rounded-full transition-colors ${
                    idx < stepIndex
                      ? 'bg-[#059669]'
                      : idx === stepIndex
                        ? 'bg-[#EC4899]'
                        : 'bg-[#D9CEB8]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cycleCameraMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CEB8] bg-white px-2.5 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#FFFBF2] whitespace-nowrap cursor-pointer"
              title="Alternar câmera: Oculta, Só Mão ou Vídeo"
            >
              {camMode === 'hidden' ? (
                <EyeOff className="h-3.5 w-3.5 text-[#14532D]" />
              ) : camMode === 'hand_only' ? (
                <Hand className="h-3.5 w-3.5 text-[#EC4899]" />
              ) : (
                <Video className="h-3.5 w-3.5 text-[#B45309]" />
              )}
              <span>
                {camMode === 'hidden'
                  ? 'Câmera Oculta'
                  : camMode === 'hand_only'
                    ? 'Só Mão'
                    : 'Vídeo'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              className="rounded-xl border border-[#D9CEB8] bg-white p-2 text-[#1C1917] hover:bg-[#FFFBF2] cursor-pointer"
              title={settings.soundEnabled ? 'Silenciar efeitos' : 'Ativar efeitos'}
              aria-label="Alternar som"
            >
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#14532D]" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#DC2626]" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleNarration}
              className={`rounded-xl border px-3 py-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                settings.narrationEnabled
                  ? 'border-[#14532D] bg-[#14532D] text-white'
                  : 'border-[#D9CEB8] bg-white text-[#57534E]'
              }`}
            >
              {settings.narrationEnabled ? 'Voz: On' : 'Voz: Off'}
            </button>
          </div>
        </div>
      </div>

      {/* CENTERED PRIMARY INTERACTIVE STAGE (Zero side video distraction!) */}
      <section className="mx-auto flex flex-col justify-between rounded-3xl border border-[#D9CEB8] bg-white p-6 shadow-sm sm:p-8">
          {/* Scene Banner & Short Clear Prompt */}
          <div className="flex flex-col gap-4 border-b border-[#EFE7D4] pb-5 sm:flex-row sm:items-center">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl border border-[#D9CEB8] bg-[#F6EFE0]">
              <ArtworkImage
                src={missionMeta.imagePath}
                alt={challenge.sceneTag}
                fallbackTitle={challenge.characterName}
                fallbackGradient={missionMeta.fallbackGradient}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#57534E]">
                <span>{challenge.characterName}</span>
                <span aria-hidden="true">·</span>
                <span>{challenge.sceneTag}</span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-extrabold leading-snug text-[#1C1917]">
                {challenge.prompt}
              </h2>
            </div>
          </div>

          {/* Feedback Banner (Always warm & non-punitive) */}
          {feedback && (
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                feedback.type === 'success'
                  ? 'border-[#059669]/40 bg-[#DCFCE7] text-[#14532D]'
                  : 'border-[#EAB308]/50 bg-[#FEF9C3] text-[#78350F]'
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

          {/* DYNAMIC INTERACTIVE WORKSPACE BY MODE */}
          <div className="my-6 flex-1">
            {/* MODE 1: DRAG COUNT (Anya's Peanuts) */}
            {challenge.mode === 'drag_count' && challenge.dropZones && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Draggable Source Tray */}
                <div className="rounded-2xl border border-[#EFE7D4] bg-[#FFFBF2] p-5 md:col-span-7">
                  <div className="mb-3 flex items-center justify-between text-xs font-bold text-[#57534E]">
                    <span>Bandeja de Amendoins (Faça pinça para pegar)</span>
                    <span className="font-mono tabular-nums">
                      Restam: {remainingDragItems.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {remainingDragItems.map((item, idx) => {
                      const isHolding = holdingDragId === item.id;
                      const isHovered = hoveredTargetId === `drag_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          ref={(el) => {
                            dragItemRefs.current[item.id] = el;
                          }}
                          className={`flex h-24 flex-col items-center justify-center rounded-2xl border-2 transition-transform duration-150 select-none ${
                            isHolding
                              ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                              : isHovered
                                ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] shadow-md'
                                : `${item.accentBorder} ${item.accentBg}`
                          }`}
                        >
                          <span className="text-4xl leading-none">{item.emoji}</span>
                          {hintTier >= 2 && (
                            <span className="mt-1 font-mono text-xs font-bold text-[#78350F] tabular-nums">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Satchel Zone */}
                <div className="flex flex-col gap-3 md:col-span-5">
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
                        className={`flex min-h-[240px] flex-1 flex-col items-center justify-between rounded-3xl border-4 border-dashed p-5 text-center transition-transform duration-150 ${
                          holdingDragId && isHovered
                            ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                            : hintTier >= 3 && holdingDragId
                              ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                              : `${zone.accentBorder} ${zone.accentBg}`
                        }`}
                      >
                        <div>
                          <span className="text-5xl leading-none">{zone.emoji}</span>
                          <h3 className="mt-2 font-display text-xl font-extrabold text-[#14532D]">
                            {zone.label}
                          </h3>
                          <p className="mt-1 font-mono text-lg font-bold text-[#1C1917] tabular-nums">
                            {placed.length} / {target}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                          {placed.map((p) => (
                            <span key={p.id} className="text-2xl leading-none">
                              {p.emoji}
                            </span>
                          ))}
                        </div>

                        <p className="mt-2 text-xs font-semibold text-[#57534E]">
                          {holdingDragId
                            ? 'Solte a pinça aqui dentro!'
                            : 'Arraste os amendoins para cá'}
                        </p>
                      </div>
                    );
                  })}

                  {totalCountPlaced > (challenge.targetTotalCount || 0) && (
                    <button
                      ref={undoBtnRef}
                      type="button"
                      onClick={handleUndoLastDrag}
                      className={`rounded-xl border-2 border-[#B45309] bg-[#FEF3C7] px-4 py-2.5 text-sm font-bold text-[#78350F] transition-transform cursor-pointer ${
                        hoveredTargetId === 'btn_undo' ? 'scale-105 ring-2 ring-[#EC4899]' : ''
                      }`}
                    >
                      Pinça aqui para Tirar 1
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* MODE 2: DRAG TO BUCKETS (Routine Bag / Bond Sharing / Forger Classification) */}
            {challenge.mode === 'drag_buckets' && challenge.dropZones && (
              <div className="flex flex-col gap-6">
                {/* Mixed Objects Tray */}
                <div className="rounded-2xl border border-[#EFE7D4] bg-[#FFFBF2] p-4">
                  <p className="mb-3 text-xs font-bold text-[#57534E]">
                    Faça pinça em um objeto e solte na área certa abaixo:
                  </p>
                  <div className="flex flex-wrap justify-center gap-3.5">
                    {remainingDragItems.map((item) => {
                      const isHolding = holdingDragId === item.id;
                      const isHovered = hoveredTargetId === `drag_${item.id}`;
                      return (
                        <div
                          key={item.id}
                          ref={(el) => {
                            dragItemRefs.current[item.id] = el;
                          }}
                          className={`flex min-w-[112px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-3.5 transition-transform duration-150 select-none ${
                            isHolding
                              ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                              : isHovered
                                ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] shadow-md'
                                : `${item.accentBorder} ${item.accentBg}`
                          }`}
                        >
                          <span className="text-4xl leading-none">{item.emoji}</span>
                          <span className="mt-1.5 text-xs font-bold text-[#1C1917]">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Buckets / Folders */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
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
                        className={`flex min-h-[175px] flex-col items-center justify-between rounded-3xl border-4 border-dashed p-5 text-center transition-transform duration-150 ${
                          holdingDragId && isHovered
                            ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                            : shouldHintGlow
                              ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                              : `${zone.accentBorder} ${zone.accentBg}`
                        }`}
                      >
                        <div>
                          <span className="text-4xl leading-none">{zone.emoji}</span>
                          <h3 className="mt-1.5 font-display text-lg font-extrabold text-[#1C1917]">
                            {zone.label}
                          </h3>
                          {zone.subtitle && (
                            <p className="text-xs font-semibold text-[#57534E]">
                              {zone.subtitle}
                              {zone.targetCount
                                ? ` · ${placed.length}/${zone.targetCount}`
                                : ''}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {placed.map((p) => (
                            <span
                              key={p.id}
                              className="rounded-xl bg-white/90 px-2.5 py-1 text-lg shadow-xs"
                              title={p.label}
                            >
                              {p.emoji}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODE 3: SEQUENCE ORDER (Routine Steps & Twilight's WISE Code Patterns) */}
            {challenge.mode === 'sequence_order' && challenge.sequencePromptItems && (
              <div className="flex flex-col gap-6">
                {/* Sequence Slots Board */}
                <div className="rounded-3xl border-2 border-[#14532D]/25 bg-[#F6EFE0] p-5">
                  <p className="mb-3 text-xs font-bold text-[#14532D]">
                    Sequência da Missão (Arraste as peças corretas para os espaços &ldquo;?&rdquo;):
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {challenge.sequencePromptItems.map((fixedItem, idx) => {
                      if (fixedItem) {
                        return (
                          <div
                            key={`fixed_${idx}`}
                            className={`flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 border-[#D9CEB8] ${fixedItem.bgClass} p-2 text-center`}
                          >
                            <span className="text-4xl leading-none">{fixedItem.emoji}</span>
                            <span className="mt-1.5 text-xs font-bold text-[#1C1917]">
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
                          className={`flex h-32 w-32 flex-col items-center justify-center rounded-2xl border-4 border-dashed p-2 text-center transition-transform duration-150 ${
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
                              <span className="mt-1 text-xs font-bold text-[#14532D]">
                                {placed.label}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-display text-3xl font-extrabold text-[#EC4899]">
                                {emptySequenceIndices.length > 1 ? `${emptyOrderIdx + 1}º` : '?'}
                              </span>
                              <span className="mt-1 text-[11px] font-semibold text-[#57534E]">
                                Solte aqui
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Draggable Sequence Pool */}
                <div className="rounded-2xl border border-[#EFE7D4] bg-[#FFFBF2] p-5">
                  <p className="mb-3 text-xs font-bold text-[#57534E]">
                    Peças disponíveis (Faça pinça para pegar e arrastar):
                  </p>
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
                          className={`flex min-w-[132px] flex-col items-center justify-center rounded-2xl border-2 px-5 py-4 transition-transform duration-150 select-none ${
                            isHolding
                              ? 'scale-90 border-dashed border-[#D9CEB8] bg-white opacity-35'
                              : isHovered
                                ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] shadow-lg'
                                : hintTier >= 3 && isNextExpected
                                  ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3]'
                                  : `border-[#14532D]/30 ${item.bgClass}`
                          }`}
                        >
                          <span className="text-4xl leading-none">{item.emoji}</span>
                          <span className="mt-2 text-sm font-bold text-[#1C1917]">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* MODE 4: PINCH CHOICE (Visual Math / Anya Telepathy / Bond Visions / Spy Attention) */}
            {challenge.mode === 'pinch_choice' && (
              <div className="flex flex-col gap-6">
                {/* Telepathy Interactive Thought Cloud */}
                {challenge.telepathyThought && (
                  <div
                    ref={telepathyZoneRef}
                    className={`rounded-3xl border-2 p-6 text-center transition-colors ${
                      telepathyRevealed
                        ? 'border-[#EC4899] bg-[#FCE7F3]'
                        : 'border-dashed border-[#EC4899] bg-[#FFFBF2]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#9D174D]">
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {telepathyRevealed
                          ? `Pensamento de ${challenge.characterName} revelado!`
                          : 'Aponte o dedo aqui para ativar a Telepatia da Anya!'}
                      </span>
                    </div>
                    {telepathyRevealed ? (
                      <p className="mt-2 font-display text-xl font-bold text-[#1C1917]">
                        {challenge.telepathyThought}
                      </p>
                    ) : (
                      <div className="mt-2 flex items-center justify-center gap-3 text-4xl">
                        <span>{challenge.characterEmoji}</span>
                        <span>💭</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Visual Math / Logic Groups */}
                {challenge.visualGroups && challenge.visualGroups.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-[#EFE7D4] bg-[#FFFBF2] p-5">
                    {challenge.visualGroups.map((grp, gIdx) => (
                      <div key={grp.title} className="flex items-center gap-4">
                        <div className="rounded-2xl border border-[#D9CEB8] bg-white px-5 py-4 text-center">
                          <p className="text-xs font-bold text-[#57534E]">{grp.title}</p>
                          <div className="mt-2 flex max-w-[260px] flex-wrap justify-center gap-2">
                            {grp.tokens.map((tok, tIdx) => (
                              <div
                                key={tok.id}
                                className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-1 ${
                                  tok.crossedOut ? 'bg-[#FEE2E2]/70 opacity-50' : 'bg-[#FFFBF2]'
                                }`}
                              >
                                <span className="text-3xl leading-none">{tok.emoji}</span>
                                {tok.crossedOut && (
                                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-black text-[#DC2626]">
                                    ✕
                                  </span>
                                )}
                                {hintTier >= 2 && !tok.crossedOut && (
                                  <span className="mt-0.5 font-mono text-[11px] font-bold text-[#14532D] tabular-nums">
                                    {tIdx + 1}
                                  </span>
                                )}
                                {tok.label.length <= 12 &&
                                  (domain === 'logic' || tok.label === '?') && (
                                    <span className="mt-1 font-display text-xs font-bold text-[#1C1917]">
                                      {tok.label}
                                    </span>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {grp.operatorAfter && gIdx < challenge.visualGroups!.length - 1 && (
                          <span className="font-display text-4xl font-extrabold text-[#14532D]">
                            {grp.operatorAfter}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Large Pinchable Choice Cards */}
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
                        className={`flex min-h-[132px] flex-col items-center justify-center rounded-3xl border-3 p-5 text-center transition-transform duration-150 select-none ${
                          isHovered
                            ? 'scale-105 border-[#EC4899] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-lg'
                            : showHalo
                              ? 'animate-hint-halo border-[#EAB308] bg-[#FEF9C3] shadow-md'
                              : 'border-[#D9CEB8] bg-[#F6EFE0]'
                        }`}
                      >
                        <span className="text-4xl leading-none">{choice.emoji}</span>
                        <span className="mt-2 font-display text-2xl font-extrabold text-[#1C1917]">
                          {choice.label}
                        </span>
                        {choice.sublabel && (
                          <span className="mt-1 text-xs font-semibold text-[#57534E]">
                            {choice.sublabel}
                          </span>
                        )}
                        {isHovered && (
                          <span className="mt-2 text-xs font-bold text-[#EC4899]">
                            Faça Pinça para escolher!
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Stage Helper Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE7D4] pt-4">
            <button
              ref={hintBtnRef}
              type="button"
              onClick={activateManualHint}
              className={`inline-flex items-center gap-2 rounded-xl border-2 border-[#EAB308] bg-[#FEF9C3] px-4 py-2.5 text-sm font-bold text-[#78350F] transition-transform cursor-pointer ${
                hoveredTargetId === 'btn_hint' ? 'scale-105 ring-2 ring-[#EC4899]' : ''
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              <span>
                {hintTier === 0
                  ? 'Pedir Dica Visual (Pinça)'
                  : hintTier < 3
                    ? `Mais Dica (${hintTier}/3)`
                    : 'Dica Máxima Ativa'}
              </span>
            </button>

            <div className="flex items-center gap-3 text-xs font-semibold text-[#57534E]">
              <span className="font-mono text-[#14532D]">
                {tracking.handDetected
                  ? tracking.isPinching
                    ? 'Pinça ativa'
                    : 'Mão detectada'
                  : 'Mostre a mão para a câmera'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#EAB308] text-[#B45309]" />
                <span>Estrela Stella</span>
              </span>
            </div>
          </div>
        </section>

        {/* Optional Floating Corner Preview (never pushes the centered game stage!) */}
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
    </main>
  );
}
