import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Cloud, Hand, Lightbulb, Sparkles, Star, X } from 'lucide-react';
import { CAMPAIGN_CHAPTERS } from '../data/campaign';
import { MISSION_BRIEFINGS } from '../data/characters';
import { getMissionMeta } from '../data/missions';
import { useDwellSelect } from '../hooks/useDwellSelect';
import { useHandAutoScroll } from '../hooks/useHandAutoScroll';
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
  playCloudSweep,
  playGentleEncourage,
  playItemDrop,
  playPinchGrab,
  playSoftHover,
  playTelepathySparkle,
  playTraceConnectNote,
  resolveVoiceId,
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
  campaignChapterIndex?: number | null;
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
  onDwellProgressChange?: (pct: number) => void;
}

export function MissionArena({
  totalStars,
  domain,
  level,
  challenges,
  campaignChapterIndex = null,
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
  onDwellProgressChange,
}: MissionArenaProps) {
  const missionMeta = useMemo(() => getMissionMeta(domain), [domain]);
  const isDwellMode = settings.gestureControlMode === 'dwell';

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
  const [traceCount, setTraceCount] = useState<number>(0);
  const [clearedCloudIds, setClearedCloudIds] = useState<string[]>([]);
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
  const traceNodeRefs = useRef<Record<string, HTMLElement | null>>({});
  const cloudRefs = useRef<Record<string, HTMLElement | null>>({});
  const telepathyZoneRef = useRef<HTMLDivElement | null>(null);
  const hintBtnRef = useRef<HTMLButtonElement | null>(null);
  const undoBtnRef = useRef<HTMLButtonElement | null>(null);
  const backBtnRef = useRef<HTMLButtonElement | null>(null);
  const introStartBtnRef = useRef<HTMLButtonElement | null>(null);
  const replayAudioBtnRef = useRef<HTMLButtonElement | null>(null);
  const arenaScrollRef = useRef<HTMLDivElement | null>(null);

  useHandAutoScroll({
    containerRef: arenaScrollRef,
    tracking,
    speedPxPerSec: 230,
  });

  const prevPinchRef = useRef<boolean>(false);
  const lastHoveredRef = useRef<string | null>(null);
  const advancingRef = useRef<boolean>(false);
  const advanceTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const holdingSourceRef = useRef<'hand' | 'pointer' | null>(null);

  const dismissFeedback = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedback(null);
  }, []);

  const showFeedback = useCallback(
    (type: 'encourage' | 'success', message: string) => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
      setFeedback({ type, message });
      if (type === 'encourage') {
        feedbackTimerRef.current = window.setTimeout(() => {
          setFeedback((curr) => (curr?.type === 'encourage' ? null : curr));
          feedbackTimerRef.current = null;
        }, 3800);
      }
    },
    []
  );

  const challenge = challenges[stepIndex];
  const briefing = MISSION_BRIEFINGS[domain];
  const activeVoiceId = useMemo(
    () => (challenge ? resolveVoiceId(challenge.characterName) : briefing.host),
    [challenge, briefing.host]
  );

  const totalClouds = challenge?.cloudsToClear?.length ?? 0;
  const allCloudsCleared =
    challenge?.mode === 'open_palm_reveal' ? clearedCloudIds.length >= totalClouds : true;

  const handleDismissIntro = useCallback(() => {
    stopSpeaking();
    startTimeRef.current = Date.now();
    setShowIntro(false);
  }, []);

  const narrationEnabledRef = useRef(settings.narrationEnabled);
  narrationEnabledRef.current = settings.narrationEnabled;

  // Speak the character's animated mission introduction when entering the mission
  useEffect(() => {
    if (!showIntro) return;
    speakPtBr(briefing.narration, narrationEnabledRef.current, briefing.host);
    return () => {
      stopSpeaking();
    };
  }, [showIntro, briefing.narration, briefing.host]);

  useEffect(() => {
    if (showIntro) return;
    setHintTier(0);
    setHadMissThisStep(false);
    dismissFeedback();
    setTelepathyRevealed(false);
    setHoldingDragId(null);
    setHoldingSeqId(null);
    holdingSourceRef.current = null;
    setPlacedByZone({});
    setFilledSlots({});
    setTraceCount(0);
    setClearedCloudIds([]);
    setHoveredTargetId(null);
    lastHoveredRef.current = null;
    advancingRef.current = false;
    onHoldingChange(null);
    onDwellProgressChange?.(0);

    if (challenge) {
      speakPtBr(
        challenge.narrationText,
        narrationEnabledRef.current,
        resolveVoiceId(challenge.characterName)
      );
    }
    return () => {
      stopSpeaking();
    };
  }, [
    showIntro,
    stepIndex,
    challenge,
    onHoldingChange,
    onDwellProgressChange,
    dismissFeedback,
  ]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      onHoldingChange(null);
      onDwellProgressChange?.(0);
    };
  }, [onHoldingChange, onDwellProgressChange]);

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
      onDwellProgressChange?.(0);
      if (!hadMissThisStep) {
        firstTryCountRef.current += 1;
      }
      showFeedback('success', msg);
      playChallengeSuccess(settings.soundEnabled);
      speakPtBr(msg, settings.narrationEnabled, activeVoiceId);

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
      activeVoiceId,
      stepIndex,
      challenges.length,
      domain,
      level,
      onCompleteMission,
      onDwellProgressChange,
      showFeedback,
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
      showFeedback('encourage', msg);
      playGentleEncourage(settings.soundEnabled);
      speakPtBr(msg, settings.narrationEnabled, activeVoiceId);
    },
    [challenge, settings.soundEnabled, settings.narrationEnabled, activeVoiceId, showFeedback]
  );

  const activateManualHint = useCallback(() => {
    hintsUsedRef.current += 1;
    setHintTier((prev) => Math.min(3, prev + 1) as 0 | 1 | 2 | 3);
    if (challenge?.telepathyThought) {
      setTelepathyRevealed(true);
    }
    if (challenge) {
      showFeedback('encourage', `Dica: ${challenge.hintText}`);
      playTelepathySparkle(settings.soundEnabled);
      speakPtBr(challenge.hintText, settings.narrationEnabled, activeVoiceId);
    }
  }, [challenge, settings.soundEnabled, settings.narrationEnabled, activeVoiceId, showFeedback]);

  const handleUndoLastDrag = useCallback(() => {
    const zoneIds = Object.keys(placedByZone);
    for (const zId of zoneIds) {
      if (placedByZone[zId] && placedByZone[zId].length > 0) {
        const nextList = placedByZone[zId].slice(0, -1);
        const nextMap = {
          ...placedByZone,
          [zId]: nextList,
        };
        setPlacedByZone(nextMap);
        dismissFeedback();
        playItemDrop(settings.soundEnabled);

        if (challenge?.mode === 'drag_count') {
          const targetTotal =
            challenge.targetTotalCount ||
            challenge.dropZones?.find((z) => z.id === zId)?.targetCount ||
            1;
          const totalNow = Object.values(nextMap).reduce((acc, arr) => acc + arr.length, 0);
          if (totalNow === targetTotal) {
            triggerStepVictory(challenge.successMessage);
          }
        }
        return;
      }
    }
  }, [placedByZone, settings.soundEnabled, dismissFeedback, challenge, triggerStepVictory]);

  // Connect next trace node (works by hovering fingertip in the air OR clicking/tapping)
  const handleConnectTraceNode = useCallback(
    (nodeIdx: number) => {
      if (!challenge || advancingRef.current || challenge.mode !== 'trace_connect') return;
      const nodes = challenge.traceNodes || [];
      if (nodeIdx !== traceCount || nodeIdx >= nodes.length) return;

      const nextCount = traceCount + 1;
      setTraceCount(nextCount);
      successfulPinchesRef.current += 1;
      playTraceConnectNote(nodeIdx, settings.soundEnabled);

      if (nextCount >= nodes.length) {
        triggerStepVictory(challenge.successMessage);
      }
    },
    [challenge, traceCount, settings.soundEnabled, triggerStepVictory]
  );

  // Clear one cloud in open_palm_reveal mode
  const handleClearCloud = useCallback(
    (cloudId: string) => {
      if (!challenge || advancingRef.current || challenge.mode !== 'open_palm_reveal') return;
      if (clearedCloudIds.includes(cloudId)) return;

      const nextCleared = [...clearedCloudIds, cloudId];
      setClearedCloudIds(nextCleared);
      successfulPinchesRef.current += 1;
      playCloudSweep(settings.soundEnabled);

      const expectedClouds = challenge.cloudsToClear?.length ?? 0;
      if (nextCleared.length >= expectedClouds) {
        playTelepathySparkle(settings.soundEnabled);
        if (challenge.revealedClueText) {
          speakPtBr(
            `Pista revelada! ${challenge.revealedClueText}`,
            settings.narrationEnabled,
            activeVoiceId
          );
        }
      }
    },
    [challenge, clearedCloudIds, settings.soundEnabled, settings.narrationEnabled, activeVoiceId]
  );

  // Drop currently held drag item into a target zone (shared by pinch-release, dwell-drop, and click)
  const handleDropDragIntoZone = useCallback(
    (zoneId: string) => {
      if (!challenge || !holdingDragId) return;
      const zones = challenge.dropZones || [];
      const targetZone = zones.find((z) => z.id === zoneId);
      const item = (challenge.draggableItems || []).find((i) => i.id === holdingDragId);
      setHoldingDragId(null);
      holdingSourceRef.current = null;
      onHoldingChange(null);

      if (!item || !targetZone) {
        earlyDropsRef.current += 1;
        return;
      }

      if (challenge.mode === 'drag_count') {
        const currentCount = (placedByZone[targetZone.id] || []).length;
        const nextList = [...(placedByZone[targetZone.id] || []), item];
        const nextMap = { ...placedByZone, [targetZone.id]: nextList };
        setPlacedByZone(nextMap);
        playItemDrop(settings.soundEnabled);

        const targetTotal = challenge.targetTotalCount || targetZone.targetCount || 1;
        if (currentCount + 1 === targetTotal) {
          triggerStepVictory(challenge.successMessage);
        } else if (currentCount + 1 > targetTotal) {
          triggerGentleMiss(`Passou de ${targetTotal}! Selecione "Tirar 1".`);
        } else {
          dismissFeedback();
        }
      } else {
        const currentList = placedByZone[targetZone.id] || [];
        const matchesCategory = targetZone.acceptsCategory === item.category;
        const hasCapacity = !targetZone.targetCount || currentList.length < targetZone.targetCount;

        if (matchesCategory && hasCapacity) {
          const nextMap = {
            ...placedByZone,
            [targetZone.id]: [...currentList, item],
          };
          setPlacedByZone(nextMap);
          dismissFeedback();
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
    },
    [
      challenge,
      holdingDragId,
      placedByZone,
      settings.soundEnabled,
      onHoldingChange,
      dismissFeedback,
      triggerStepVictory,
      triggerGentleMiss,
    ]
  );

  // Drop currently held sequence item into a slot (shared by pinch-release, dwell-drop, and click)
  const handleDropSeqIntoSlot = useCallback(
    (slotIdx: number) => {
      if (!challenge || !holdingSeqId) return;
      const pool = challenge.sequencePool || [];
      const seqItem = pool.find((s) => s.id === holdingSeqId);
      setHoldingSeqId(null);
      holdingSourceRef.current = null;
      onHoldingChange(null);

      if (!seqItem) {
        earlyDropsRef.current += 1;
        return;
      }

      const orderPosition = emptySequenceIndices.indexOf(slotIdx);
      const expectedId = challenge.sequenceExpectedOrder?.[orderPosition];

      if (expectedId === seqItem.id) {
        const nextFilled = { ...filledSlots, [slotIdx]: seqItem };
        setFilledSlots(nextFilled);
        dismissFeedback();
        playItemDrop(settings.soundEnabled);

        if (Object.keys(nextFilled).length >= emptySequenceIndices.length) {
          triggerStepVictory(challenge.successMessage);
        }
      } else {
        triggerGentleMiss(`Quase! Veja a ordem certinha: ${challenge.hintText}`);
      }
    },
    [
      challenge,
      holdingSeqId,
      emptySequenceIndices,
      filledSlots,
      settings.soundEnabled,
      onHoldingChange,
      dismissFeedback,
      triggerStepVictory,
      triggerGentleMiss,
    ]
  );

  // Unified target activation for pinch, dwell ("Modo Só Apontar"), and mouse/touch clicks
  const activateTarget = useCallback(
    (targetId: string, source: 'hand' | 'pointer' = 'hand') => {
      if (advancingRef.current) return;

      if (targetId === 'btn_intro_start') {
        successfulPinchesRef.current += 1;
        playPinchGrab(settings.soundEnabled);
        handleDismissIntro();
        return;
      }
      if (targetId === 'btn_back') {
        successfulPinchesRef.current += 1;
        playPinchGrab(settings.soundEnabled);
        onExitToMap();
        return;
      }
      if (targetId === 'btn_hint') {
        successfulPinchesRef.current += 1;
        activateManualHint();
        return;
      }
      if (targetId === 'btn_replay_audio' && challenge) {
        successfulPinchesRef.current += 1;
        playSoftHover(settings.soundEnabled);
        speakPtBr(challenge.narrationText, true, activeVoiceId);
        return;
      }
      if (targetId === 'btn_undo') {
        successfulPinchesRef.current += 1;
        handleUndoLastDrag();
        return;
      }

      if (!challenge) return;

      if (targetId.startsWith('choice_')) {
        const choiceId = targetId.slice('choice_'.length);
        const ch = (challenge.choices || []).find((c) => c.id === choiceId);
        if (!ch) return;
        successfulPinchesRef.current += 1;
        if (ch.isCorrect) {
          triggerStepVictory(challenge.successMessage);
        } else {
          triggerGentleMiss();
        }
        return;
      }

      if (targetId.startsWith('drag_')) {
        const dragId = targetId.slice('drag_'.length);
        if (source === 'pointer' && holdingDragId === dragId) {
          setHoldingDragId(null);
          holdingSourceRef.current = null;
          onHoldingChange(null);
          return;
        }
        const item = remainingDragItems.find((i) => i.id === dragId);
        if (!item) return;
        dismissFeedback();
        successfulPinchesRef.current += 1;
        holdingSourceRef.current = source;
        setHoldingDragId(item.id);
        onHoldingChange({ label: item.label, emoji: item.emoji });
        playPinchGrab(settings.soundEnabled);
        return;
      }

      if (targetId.startsWith('zone_')) {
        const zoneId = targetId.slice('zone_'.length);
        handleDropDragIntoZone(zoneId);
        return;
      }

      if (targetId.startsWith('seq_')) {
        const seqId = targetId.slice('seq_'.length);
        if (source === 'pointer' && holdingSeqId === seqId) {
          setHoldingSeqId(null);
          holdingSourceRef.current = null;
          onHoldingChange(null);
          return;
        }
        const item = (challenge.sequencePool || []).find((s) => s.id === seqId);
        if (!item || usedSeqIds.has(item.id)) return;
        dismissFeedback();
        successfulPinchesRef.current += 1;
        holdingSourceRef.current = source;
        setHoldingSeqId(item.id);
        onHoldingChange({ label: item.label, emoji: item.emoji });
        playPinchGrab(settings.soundEnabled);
        return;
      }

      if (targetId.startsWith('slot_')) {
        const slotIdx = Number(targetId.slice('slot_'.length));
        if (!Number.isNaN(slotIdx)) {
          handleDropSeqIntoSlot(slotIdx);
        }
      }
    },
    [
      challenge,
      activeVoiceId,
      holdingDragId,
      holdingSeqId,
      remainingDragItems,
      usedSeqIds,
      settings.soundEnabled,
      dismissFeedback,
      handleDismissIntro,
      onExitToMap,
      activateManualHint,
      handleUndoLastDrag,
      triggerStepVictory,
      triggerGentleMiss,
      onHoldingChange,
      handleDropDragIntoZone,
      handleDropSeqIntoSlot,
    ]
  );

  // Dwell Selection ("Modo Só Apontar") — holds cursor steady for ~1.15s to activate target
  useDwellSelect({
    enabled:
      isDwellMode &&
      tracking.status === 'ready' &&
      tracking.handDetected &&
      !advancingRef.current &&
      hoveredTargetId !== null,
    hoveredId: hoveredTargetId,
    durationMs: 1150,
    onProgress: onDwellProgressChange,
    onTrigger: activateTarget,
  });

  // Real-time webcam hand-gesture interaction loop
  useEffect(() => {
    if (!challenge || advancingRef.current) return;

    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveredTargetId(null);
      if ((holdingDragId || holdingSeqId) && holdingSourceRef.current === 'hand') {
        earlyDropsRef.current += 1;
        setHoldingDragId(null);
        setHoldingSeqId(null);
        holdingSourceRef.current = null;
        onHoldingChange(null);
      }
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching, isOpenPalm } = tracking;
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
      speakPtBr(challenge.telepathyThought, settings.narrationEnabled, activeVoiceId);
    }

    let hovered: string | null = null;

    if (showIntro) {
      if (isInside(introStartBtnRef.current, 18)) {
        hovered = 'btn_intro_start';
        if (justPinched) {
          activateTarget('btn_intro_start');
          return;
        }
      } else if (isInside(backBtnRef.current, 12)) {
        hovered = 'btn_back';
        if (justPinched) {
          activateTarget('btn_back');
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
          activateTarget('btn_hint');
          return;
        }
      } else if (isInside(replayAudioBtnRef.current, 14)) {
        hovered = 'btn_replay_audio';
        if (justPinched) {
          activateTarget('btn_replay_audio');
          return;
        }
      } else if (isInside(undoBtnRef.current, 12)) {
        hovered = 'btn_undo';
        if (justPinched) {
          activateTarget('btn_undo');
          return;
        }
      } else if (isInside(backBtnRef.current, 12)) {
        hovered = 'btn_back';
        if (justPinched) {
          activateTarget('btn_back');
          return;
        }
      }
    }

    if (challenge.mode === 'trace_connect') {
      const nodes = challenge.traceNodes || [];
      const nextNode = nodes[traceCount];
      if (nextNode && isInside(traceNodeRefs.current[nextNode.id], 34)) {
        handleConnectTraceNode(traceCount);
      }
    } else if (challenge.mode === 'open_palm_reveal') {
      if (!allCloudsCleared) {
        const clouds = challenge.cloudsToClear || [];
        for (const cloud of clouds) {
          if (clearedCloudIds.includes(cloud.id)) continue;
          if (isInside(cloudRefs.current[cloud.id], 26)) {
            if (isOpenPalm || isDwellMode || justPinched) {
              handleClearCloud(cloud.id);
              break;
            }
          }
        }
      } else {
        for (const ch of challenge.choices || []) {
          if (isInside(choiceRefs.current[ch.id], 14)) {
            hovered = `choice_${ch.id}`;
            if (justPinched) {
              activateTarget(hovered);
            }
            break;
          }
        }
      }
    } else if (challenge.mode === 'pinch_choice') {
      for (const ch of challenge.choices || []) {
        if (isInside(choiceRefs.current[ch.id], 14)) {
          hovered = `choice_${ch.id}`;
          if (justPinched) {
            activateTarget(hovered);
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
              activateTarget(hovered);
            }
            break;
          }
        }
      } else {
        let targetZoneId: string | null = null;
        for (const z of zones) {
          if (isInside(dropZoneRefs.current[z.id], 26)) {
            hovered = `zone_${z.id}`;
            targetZoneId = z.id;
            break;
          }
        }

        // In pinch mode, releasing fingers drops the item. In dwell mode, dwelling or pinching on the zone drops it.
        if (!isDwellMode && justReleased) {
          if (targetZoneId) {
            handleDropDragIntoZone(targetZoneId);
          } else {
            earlyDropsRef.current += 1;
            setHoldingDragId(null);
            onHoldingChange(null);
          }
        } else if (isDwellMode && justPinched && targetZoneId) {
          handleDropDragIntoZone(targetZoneId);
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
              activateTarget(hovered);
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

        if (!isDwellMode && justReleased) {
          if (hoveredSlotIdx !== null) {
            handleDropSeqIntoSlot(hoveredSlotIdx);
          } else {
            earlyDropsRef.current += 1;
            setHoldingSeqId(null);
            onHoldingChange(null);
          }
        } else if (isDwellMode && justPinched && hoveredSlotIdx !== null) {
          handleDropSeqIntoSlot(hoveredSlotIdx);
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
    activeVoiceId,
    isDwellMode,
    telepathyRevealed,
    holdingDragId,
    holdingSeqId,
    remainingDragItems,
    filledSlots,
    usedSeqIds,
    emptySequenceIndices,
    traceCount,
    clearedCloudIds,
    allCloudsCleared,
    settings.soundEnabled,
    settings.narrationEnabled,
    activateTarget,
    handleConnectTraceNode,
    handleClearCloud,
    handleDropDragIntoZone,
    handleDropSeqIntoSlot,
    onHoldingChange,
  ]);

  if (!challenge) return null;

  const totalCountPlaced =
    challenge.mode === 'drag_count'
      ? Object.values(placedByZone).reduce((acc, l) => acc + l.length, 0)
      : 0;

  const camMode = settings.cameraDisplayMode;
  const campaignChapter =
    campaignChapterIndex !== null && campaignChapterIndex !== undefined
      ? CAMPAIGN_CHAPTERS[campaignChapterIndex]
      : null;

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
          <div className="flex h-9 items-center gap-2 rounded-xl border-2 border-[#D9CEB8] bg-[#FFFDF7] px-3 shadow-xs">
            {campaignChapter && (
              <span className="hidden items-center gap-1 rounded-md bg-[#FEF9C3] px-1.5 py-0.5 font-display text-[11px] font-extrabold text-[#B45309] md:inline-flex">
                <BookOpen className="h-3 w-3" />
                <span>Cap. {campaignChapter.index + 1}/5</span>
              </span>
            )}
            <span className="hidden font-display text-xs font-extrabold text-[#14532D] sm:inline">
              {missionMeta.shortTitle}
            </span>
            <div
              className="flex items-center gap-1"
              aria-label={`Etapa ${stepIndex + 1} de ${challenges.length}`}
            >
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

      {/* CENTERED FULL-HEIGHT GAME BOARD (Zero Scroll on Desktop, Scrollable on Small Screens) */}
      <main className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col px-4 pb-3 pt-1 sm:px-5">
        <section className="game-board-frame relative flex min-h-0 flex-1 flex-col justify-between p-4 sm:p-5">
          {showIntro ? (
            <MissionIntroCutscene
              domain={domain}
              startButtonRef={introStartBtnRef}
              startHovered={hoveredTargetId === 'btn_intro_start'}
              onReplayIntro={() => speakPtBr(briefing.narration, true, briefing.host)}
              onStartMission={handleDismissIntro}
            />
          ) : (
            <>
              {/* Animated Character Narrator Strip */}
              <CharacterNarrator
                characterName={challenge.characterName}
                domain={domain}
                prompt={challenge.prompt}
                mood={narratorMood}
                replayButtonRef={replayAudioBtnRef}
                replayHovered={hoveredTargetId === 'btn_replay_audio'}
                onReplayAudio={() => speakPtBr(challenge.narrationText, true, activeVoiceId)}
              />

              {/* MAXIMIZED PLAYABLE GAME SURFACE */}
              <div
                ref={arenaScrollRef}
                className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto overscroll-contain py-2.5 md:justify-center"
              >
                {/* MODE 1: DRAG COUNT */}
                {challenge.mode === 'drag_count' && challenge.dropZones && (
                  <div className="grid h-full grid-cols-1 items-center gap-5 md:grid-cols-12">
                    <div className="flex h-full items-center justify-center rounded-3xl border-2 border-[#EFE7D4] bg-[#FAF6EB] p-4 md:col-span-7">
                      <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4">
                        {remainingDragItems.map((item, idx) => {
                          const isHolding = holdingDragId === item.id;
                          const isPointerSelected =
                            isHolding && holdingSourceRef.current === 'pointer';
                          const isHovered = hoveredTargetId === `drag_${item.id}`;
                          return (
                            <div
                              key={item.id}
                              ref={(el) => {
                                dragItemRefs.current[item.id] = el;
                              }}
                              onClick={() => activateTarget(`drag_${item.id}`, 'pointer')}
                              className={`game-token-3d flex h-20 flex-col items-center justify-center rounded-2xl select-none cursor-pointer sm:h-24 ${
                                isPointerSelected
                                  ? '-translate-y-1 scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-lg'
                                  : isHolding
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
                            onClick={() => holdingDragId && handleDropDragIntoZone(zone.id)}
                            className={`flex h-full min-h-[220px] flex-1 flex-col items-center justify-center rounded-[2rem] border-4 border-dashed p-4 text-center shadow-inner transition-transform duration-150 cursor-pointer ${
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
                          const isPointerSelected =
                            isHolding && holdingSourceRef.current === 'pointer';
                          const isHovered = hoveredTargetId === `drag_${item.id}`;
                          return (
                            <div
                              key={item.id}
                              ref={(el) => {
                                dragItemRefs.current[item.id] = el;
                              }}
                              onClick={() => activateTarget(`drag_${item.id}`, 'pointer')}
                              className={`game-token-3d flex min-w-[104px] flex-col items-center justify-center rounded-2xl px-3.5 py-2.5 select-none cursor-pointer ${
                                isPointerSelected
                                  ? '-translate-y-1 scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-lg'
                                  : isHolding
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
                            onClick={() => holdingDragId && handleDropDragIntoZone(zone.id)}
                            className={`flex min-h-[155px] flex-col items-center justify-center rounded-[1.8rem] border-4 border-dashed p-4 text-center shadow-inner transition-transform duration-150 cursor-pointer ${
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
                              onClick={() => !placed && holdingSeqId && handleDropSeqIntoSlot(idx)}
                              className={`flex h-28 w-28 flex-col items-center justify-center rounded-3xl border-4 border-dashed p-2 text-center transition-transform duration-150 cursor-pointer sm:h-32 sm:w-32 ${
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
                        const isPointerSelected =
                          isHolding && holdingSourceRef.current === 'pointer';
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
                            onClick={() => activateTarget(`seq_${item.id}`, 'pointer')}
                            className={`game-token-3d flex min-w-[132px] flex-col items-center justify-center rounded-2xl px-4 py-3 select-none cursor-pointer ${
                              isPointerSelected
                                ? '-translate-y-1 scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-lg'
                                : isHolding
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
                        onClick={() => {
                          if (!telepathyRevealed) {
                            setTelepathyRevealed(true);
                            playTelepathySparkle(settings.soundEnabled);
                            speakPtBr(
                              challenge.telepathyThought!,
                              settings.narrationEnabled,
                              activeVoiceId
                            );
                          }
                        }}
                        className={`rounded-3xl border-3 px-5 py-3.5 text-center transition-colors cursor-pointer ${
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
                            onClick={() => activateTarget(`choice_${choice.id}`)}
                            className={`game-token-3d flex min-h-[124px] flex-col items-center justify-center rounded-[1.6rem] p-4 text-center select-none cursor-pointer ${
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

                {/* MODE 5: TRACE CONNECT (Air Finger Tracing / Dot-to-Dot) */}
                {challenge.mode === 'trace_connect' && challenge.traceNodes && (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9CEB8] bg-[#FAF6EB] px-3.5 py-1 font-display text-xs font-extrabold text-[#14532D]">
                        <Sparkles className="h-3.5 w-3.5 text-[#EC4899]" />
                        <span>
                          {challenge.traceShapeTitle || 'Ligue os pontos no ar com o dedo!'}
                        </span>
                      </span>
                      <span className="rounded-full bg-[#DCFCE7] px-3 py-1 font-mono text-xs font-extrabold text-[#14532D] tabular-nums">
                        {traceCount} / {challenge.traceNodes.length}
                      </span>
                    </div>

                    <div className="relative h-[270px] w-full max-w-[720px] overflow-hidden rounded-[2rem] border-3 border-[#DFD4BC] bg-gradient-to-b from-[#FFFDF7] to-[#F4EFE0] shadow-inner sm:h-[320px]">
                      {/* SVG Guiding & Connected Trail */}
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        {/* Subtle full dotted guide path */}
                        {challenge.traceNodes.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#D9CEB8"
                            strokeWidth="1.2"
                            strokeDasharray="2.5 2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={challenge.traceNodes
                              .map((n) => `${n.xPct},${n.yPct}`)
                              .join(' ')}
                          />
                        )}

                        {/* Next-step glowing guide arrow segment */}
                        {traceCount > 0 && traceCount < challenge.traceNodes.length && (
                          <line
                            x1={challenge.traceNodes[traceCount - 1].xPct}
                            y1={challenge.traceNodes[traceCount - 1].yPct}
                            x2={challenge.traceNodes[traceCount].xPct}
                            y2={challenge.traceNodes[traceCount].yPct}
                            stroke="#EC4899"
                            strokeWidth="1.5"
                            strokeDasharray="2 2"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Completed solid glowing path */}
                        {traceCount > 1 && (
                          <polyline
                            fill="none"
                            stroke={challenge.traceAccentColor || '#059669'}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={challenge.traceNodes
                              .slice(0, traceCount)
                              .map((n) => `${n.xPct},${n.yPct}`)
                              .join(' ')}
                          />
                        )}
                      </svg>

                      {/* Interactive Star Nodes */}
                      {challenge.traceNodes.map((node, idx) => {
                        const isConnected = idx < traceCount;
                        const isNext = idx === traceCount;
                        return (
                          <button
                            key={node.id}
                            ref={(el) => {
                              traceNodeRefs.current[node.id] = el;
                            }}
                            type="button"
                            onClick={() => handleConnectTraceNode(idx)}
                            style={{
                              left: `${node.xPct}%`,
                              top: `${node.yPct}%`,
                            }}
                            className={`absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 font-display transition-all duration-200 cursor-pointer select-none sm:h-20 sm:w-20 ${
                              isConnected
                                ? 'scale-95 border-[#059669] bg-[#DCFCE7] text-[#14532D] shadow-md'
                                : isNext
                                  ? 'animate-hint-halo z-20 scale-110 border-[#EC4899] bg-[#FCE7F3] text-[#9D174D] ring-4 ring-[#FBCFE8] shadow-xl'
                                  : 'border-[#D9CEB8] bg-[#FFFDF7] text-[#78716C] opacity-75'
                            }`}
                          >
                            <span className="text-xl leading-none sm:text-2xl">
                              {isConnected ? '⭐' : node.emoji || '✨'}
                            </span>
                            <span className="mt-0.5 text-sm font-extrabold leading-none sm:text-base">
                              {node.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-center text-xs font-bold text-[#57534E]">
                      Passe o dedo no ar sobre o círculo rosa piscando — sem precisar fazer pinça!
                    </p>
                  </div>
                )}

                {/* MODE 6: OPEN PALM REVEAL (Sweep Clouds with Open Hand + Answer) */}
                {challenge.mode === 'open_palm_reveal' && (
                  <div className="flex flex-col justify-center gap-4">
                    {/* Reveal Stage with Sweepable Clouds */}
                    <div className="relative flex min-h-[168px] flex-col items-center justify-center overflow-hidden rounded-[1.8rem] border-3 border-[#DFD4BC] bg-gradient-to-b from-[#F0FDF4] to-[#FAF6EB] px-5 py-4 text-center shadow-inner">
                      {/* Underlying Clue Card */}
                      <div
                        className={`transition-all duration-300 ${
                          allCloudsCleared ? 'scale-100 opacity-100' : 'scale-95 opacity-35 blur-[2px]'
                        }`}
                      >
                        <span className="text-5xl leading-none">
                          {challenge.revealedClueEmoji || '✨'}
                        </span>
                        <h3 className="mt-1.5 font-display text-lg font-extrabold text-[#14532D] sm:text-xl">
                          {challenge.revealedClueTitle || 'Pista Secreta Revelada!'}
                        </h3>
                        <p className="mx-auto mt-1 max-w-lg text-sm font-bold text-[#1C1917] sm:text-base">
                          {challenge.revealedClueText}
                        </p>
                      </div>

                      {/* Interactive Clouds Overlay */}
                      {!allCloudsCleared && (
                        <div className="absolute inset-0">
                          {(challenge.cloudsToClear || []).map((cloud) => {
                            const isCleared = clearedCloudIds.includes(cloud.id);
                            if (isCleared) return null;
                            const sizeClass =
                              cloud.size === 'lg'
                                ? 'h-24 w-36 text-5xl'
                                : 'h-20 w-32 text-4xl';
                            return (
                              <button
                                key={cloud.id}
                                ref={(el) => {
                                  cloudRefs.current[cloud.id] = el;
                                }}
                                type="button"
                                onClick={() => handleClearCloud(cloud.id)}
                                style={{
                                  left: `${cloud.xPct}%`,
                                  top: `${cloud.yPct}%`,
                                }}
                                className={`animate-float-gentle absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#93C5FD] bg-white/95 shadow-lg transition-transform hover:scale-105 cursor-pointer select-none ${sizeClass}`}
                                aria-label="Espantar nuvem com a mão aberta"
                              >
                                <span aria-hidden="true">☁️</span>
                              </button>
                            );
                          })}

                          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#059669]/40 bg-[#DCFCE7]/95 px-3.5 py-1 font-display text-xs font-extrabold text-[#14532D] shadow-xs whitespace-nowrap">
                            <Hand className="h-3.5 w-3.5 text-[#059669]" />
                            <span>
                              Abra a mão e passe nas nuvens ({clearedCloudIds.length}/{totalClouds})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Choices appear cleanly once clouds are cleared */}
                    {allCloudsCleared ? (
                      <div
                        className={`grid grid-cols-1 gap-4 ${
                          (challenge.choices || []).length === 2
                            ? 'sm:grid-cols-2'
                            : 'sm:grid-cols-3'
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
                              onClick={() => activateTarget(`choice_${choice.id}`)}
                              className={`game-token-3d flex min-h-[116px] flex-col items-center justify-center rounded-[1.6rem] p-4 text-center select-none cursor-pointer ${
                                isHovered
                                  ? '-translate-y-1 scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FCE7F3] ring-4 ring-[#FBCFE8] shadow-xl'
                                  : showHalo
                                    ? 'animate-hint-halo border-[#EAB308] border-b-[#B45309] bg-[#FEF9C3] shadow-md'
                                    : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FAF6EB]'
                              }`}
                            >
                              <span className="text-4xl leading-none">{choice.emoji}</span>
                              <span className="mt-1.5 font-display text-lg font-extrabold text-[#1C1917] sm:text-xl">
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
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D9CEB8] bg-[#FAF6EB]/80 px-4 py-3 text-center text-sm font-bold text-[#57534E]">
                        <Cloud className="h-4 w-4 text-[#059669]" />
                        <span>Limpe todas as nuvens acima para liberar as respostas!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Non-overlapping, Auto-dismissing & Closable Feedback Banner */}
              {feedback && (
                <div
                  className={`mt-1.5 flex shrink-0 items-center justify-between gap-2.5 rounded-2xl border-2 px-4 py-2 font-display text-xs font-extrabold shadow-sm sm:text-sm ${
                    feedback.type === 'success'
                      ? 'border-[#059669] bg-[#DCFCE7] text-[#14532D]'
                      : 'border-[#EAB308] bg-[#FEF9C3] text-[#78350F]'
                  }`}
                  role="status"
                >
                  <div className="flex items-center gap-2">
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669] sm:h-5 sm:w-5" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0 text-[#B45309] sm:h-5 sm:w-5" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                  {feedback.type === 'encourage' && (
                    <button
                      type="button"
                      onClick={dismissFeedback}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#EAB308] bg-white/80 text-[#78350F] hover:bg-white cursor-pointer"
                      aria-label="Fechar aviso"
                      title="Fechar aviso"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

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
                  {holdingDragId || holdingSeqId
                    ? holdingSourceRef.current === 'pointer'
                      ? 'Item selecionado · Clique no quadro de destino'
                      : 'Segurando item · Solte no quadro'
                    : tracking.handDetected
                      ? tracking.isOpenPalm
                        ? 'Mão aberta'
                        : tracking.isPinching
                          ? 'Pinça ativa'
                          : isDwellMode
                            ? 'Só Apontar · Pare no alvo'
                            : 'Mão na tela'
                      : 'Levante a mão ou clique para jogar'}
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
