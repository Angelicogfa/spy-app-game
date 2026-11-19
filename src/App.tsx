import { useCallback, useState } from 'react';
import { CalibrationScreen } from './components/CalibrationScreen';
import { GuardianPanel } from './components/GuardianPanel';
import { HandCursor } from './components/HandCursor';
import { MissionArena, MissionCompletionPayload } from './components/MissionArena';
import { MissionMapScreen } from './components/MissionMapScreen';
import { MissionVictoryModal } from './components/MissionVictoryModal';
import { TitleScreen } from './components/TitleScreen';
import { TopBar } from './components/TopBar';
import { generateMissionChallenges } from './data/missions';
import { useHandTracking } from './hooks/useHandTracking';
import {
  AccessibilitySettings,
  CameraDisplayMode,
  DifficultyLevel,
  GameScreen,
  MissionChallenge,
  MissionDomain,
  PlayerProgress,
} from './types/game';
import { stopSpeaking } from './utils/audio';
import {
  createInitialProgress,
  loadProgress,
  recordMissionCompletion,
  saveProgress,
} from './utils/storage';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(1);
  const [activeDomain, setActiveDomain] = useState<MissionDomain>('math');
  const [activeChallenges, setActiveChallenges] = useState<MissionChallenge[]>([]);
  const [lastVictory, setLastVictory] = useState<{
    domain: MissionDomain;
    level: DifficultyLevel;
    starsEarned: number;
    firstTryCount: number;
    totalChallenges: number;
  } | null>(null);
  const [holdingCursorItem, setHoldingCursorItem] = useState<{
    label: string;
    emoji: string;
  } | null>(null);

  const { videoRef, state: handTracking, startCamera } = useHandTracking(progress.settings);

  const handleUpdateSettings = useCallback((nextSettings: AccessibilitySettings) => {
    setProgress((prev) => {
      const updated = { ...prev, settings: nextSettings };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        settings: { ...prev.settings, soundEnabled: !prev.settings.soundEnabled },
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleToggleNarration = useCallback(() => {
    setProgress((prev) => {
      const nextNarration = !prev.settings.narrationEnabled;
      if (!nextNarration) stopSpeaking();
      const updated = {
        ...prev,
        settings: { ...prev.settings, narrationEnabled: nextNarration },
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleChangeCameraDisplayMode = useCallback((mode: CameraDisplayMode) => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        settings: { ...prev.settings, cameraDisplayMode: mode },
      };
      saveProgress(updated);
      return updated;
    });
  }, []);

  const handleNavigate = useCallback(
    (nextScreen: GameScreen) => {
      stopSpeaking();
      setHoldingCursorItem(null);
      setScreen(nextScreen);
      if (
        (nextScreen === 'CALIBRATION' || nextScreen === 'MISSION_MAP') &&
        handTracking.status === 'idle'
      ) {
        startCamera();
      }
    },
    [handTracking.status, startCamera]
  );

  const handleStartFromTitle = useCallback(() => {
    if (handTracking.status === 'ready' && progress.hasCompletedCalibration) {
      handleNavigate('MISSION_MAP');
    } else {
      handleNavigate('CALIBRATION');
    }
  }, [handTracking.status, progress.hasCompletedCalibration, handleNavigate]);

  const handleCalibrationComplete = useCallback(() => {
    setProgress((prev) => {
      const updated = { ...prev, hasCompletedCalibration: true };
      saveProgress(updated);
      return updated;
    });
    setHoldingCursorItem(null);
    setScreen('MISSION_MAP');
  }, []);

  const handleStartMission = useCallback(
    (domain: MissionDomain, levelOverride?: DifficultyLevel) => {
      const targetLevel = levelOverride ?? selectedLevel;
      const generated = generateMissionChallenges(domain, targetLevel);
      setActiveDomain(domain);
      setActiveChallenges(generated);
      setHoldingCursorItem(null);
      setScreen('PLAYING');
    },
    [selectedLevel]
  );

  const handleMissionCompleted = useCallback((payload: MissionCompletionPayload) => {
    setHoldingCursorItem(null);
    setProgress((prev) => {
      const { updated, starsEarned } = recordMissionCompletion(prev, payload);
      setLastVictory({
        domain: payload.domain,
        level: payload.level,
        starsEarned,
        firstTryCount: payload.firstTryCount,
        totalChallenges: payload.totalChallenges,
      });
      return updated;
    });
    setScreen('MISSION_VICTORY');
  }, []);

  const handleResetProgress = useCallback(() => {
    const fresh = createInitialProgress();
    saveProgress(fresh);
    setProgress(fresh);
  }, []);

  const showHandCursor =
    screen === 'CALIBRATION' ||
    screen === 'MISSION_MAP' ||
    screen === 'PLAYING' ||
    screen === 'MISSION_VICTORY';

  return (
    <div className="min-h-screen bg-[#FFFBF2] text-[#1C1917]">
      {/* Persistent hidden video element keeps MediaPipe webcam stream alive seamlessly across screens */}
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden="true"
        className="pointer-events-none fixed h-px w-px opacity-0"
      />

      <TopBar
        currentScreen={screen}
        cameraReady={handTracking.status === 'ready'}
        onNavigate={handleNavigate}
      />

      {screen === 'TITLE_MENU' && (
        <TitleScreen
          progress={progress}
          cameraReady={handTracking.status === 'ready'}
          onStart={handleStartFromTitle}
        />
      )}

      {screen === 'CALIBRATION' && (
        <CalibrationScreen
          videoRef={videoRef}
          tracking={handTracking}
          settings={progress.settings}
          onStartCamera={startCamera}
          onCalibrationComplete={handleCalibrationComplete}
          onHoldingChange={setHoldingCursorItem}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
        />
      )}

      {screen === 'MISSION_MAP' && (
        <MissionMapScreen
          videoRef={videoRef}
          tracking={handTracking}
          progress={progress}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onSelectMission={(d) => handleStartMission(d)}
          onToggleSound={handleToggleSound}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
        />
      )}

      {screen === 'PLAYING' && activeChallenges.length > 0 && (
        <MissionArena
          key={`${activeDomain}_${selectedLevel}_${activeChallenges[0]?.id}`}
          domain={activeDomain}
          level={selectedLevel}
          challenges={activeChallenges}
          videoRef={videoRef}
          tracking={handTracking}
          settings={progress.settings}
          onExitToMap={() => handleNavigate('MISSION_MAP')}
          onToggleSound={handleToggleSound}
          onToggleNarration={handleToggleNarration}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
          onCompleteMission={handleMissionCompleted}
          onHoldingChange={setHoldingCursorItem}
        />
      )}

      {screen === 'MISSION_VICTORY' && lastVictory && (
        <MissionVictoryModal
          domain={lastVictory.domain}
          level={lastVictory.level}
          starsEarned={lastVictory.starsEarned}
          firstTryCount={lastVictory.firstTryCount}
          totalChallenges={lastVictory.totalChallenges}
          tracking={handTracking}
          settings={progress.settings}
          onReplay={() => handleStartMission(lastVictory.domain, lastVictory.level)}
          onNextMission={(nextDomain) => handleStartMission(nextDomain, lastVictory.level)}
          onBackToMap={() => handleNavigate('MISSION_MAP')}
        />
      )}

      {screen === 'GUARDIAN_PANEL' && (
        <GuardianPanel
          progress={progress}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onBack={() =>
            handleNavigate(handTracking.status === 'ready' ? 'MISSION_MAP' : 'TITLE_MENU')
          }
        />
      )}

      <HandCursor
        tracking={handTracking}
        visible={showHandCursor}
        holdingLabel={holdingCursorItem?.label}
        holdingEmoji={holdingCursorItem?.emoji}
      />
    </div>
  );
}
