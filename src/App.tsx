import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalibrationScreen } from './components/CalibrationScreen';
import { GuardianPanel } from './components/GuardianPanel';
import { HandCursor } from './components/HandCursor';
import { MissionArena, MissionCompletionPayload } from './components/MissionArena';
import { MissionMapScreen } from './components/MissionMapScreen';
import { MissionVictoryModal } from './components/MissionVictoryModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TitleScreen } from './components/TitleScreen';
import { generateMissionChallenges } from './data/missions';
import { useHandTracking } from './hooks/useHandTracking';
import {
  AccessibilitySettings,
  CameraDisplayMode,
  DifficultyLevel,
  GameScreen,
  MissionChallenge,
  MissionDomain,
  PlayerProfile,
  ProfileAvatarId,
  ProfilesStore,
} from './types/game';
import { stopAllAudio, stopSpeaking, syncAudioPreferences } from './utils/audio';
import {
  createInitialProgress,
  createPlayerProfile,
  loadProfilesStore,
  recordMissionCompletion,
  saveProfilesStore,
} from './utils/storage';

export default function App() {
  const [profilesStore, setProfilesStore] = useState<ProfilesStore>(() => loadProfilesStore());
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [guardianReturnScreen, setGuardianReturnScreen] = useState<GameScreen>('TITLE_MENU');
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(1);
  const [activeDomain, setActiveDomain] = useState<MissionDomain>('math');
  const [activeIsCampaign, setActiveIsCampaign] = useState<boolean>(false);
  const [activeCampaignChapterIdx, setActiveCampaignChapterIdx] = useState<number | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<MissionChallenge[]>([]);
  const [lastVictory, setLastVictory] = useState<{
    domain: MissionDomain;
    level: DifficultyLevel;
    starsEarned: number;
    firstTryCount: number;
    totalChallenges: number;
    isCampaign: boolean;
    completedCampaignChapterIdx: number;
  } | null>(null);
  const [holdingCursorItem, setHoldingCursorItem] = useState<{
    label: string;
    emoji: string;
  } | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  const activeProfile = useMemo<PlayerProfile | null>(() => {
    if (profilesStore.profiles.length === 0) return null;
    return (
      profilesStore.profiles.find((p) => p.id === profilesStore.activeProfileId) ||
      profilesStore.profiles[0]
    );
  }, [profilesStore]);

  const fallbackProfile = useMemo<PlayerProfile>(
    () => createPlayerProfile('Agente Estrela', 'anya'),
    []
  );
  const progress = activeProfile?.progress ?? fallbackProfile.progress;

  useEffect(() => {
    syncAudioPreferences(progress.settings.soundEnabled, progress.settings.narrationEnabled);
  }, [progress.settings.soundEnabled, progress.settings.narrationEnabled]);

  const { videoRef, state: handTracking, startCamera } = useHandTracking(progress.settings);

  const updateActiveProfile = useCallback(
    (updater: (profile: PlayerProfile) => PlayerProfile) => {
      setProfilesStore((prev) => {
        const now = new Date().toISOString();
        const targetId = prev.activeProfileId || prev.profiles[0]?.id;
        if (!targetId) {
          const created = updater(createPlayerProfile('Agente Estrela', 'anya'));
          const nextStore: ProfilesStore = {
            version: 2,
            activeProfileId: created.id,
            profiles: [{ ...created, lastPlayedAt: now }],
          };
          saveProfilesStore(nextStore);
          return nextStore;
        }
        const nextProfiles = prev.profiles.map((p) =>
          p.id === targetId ? { ...updater(p), lastPlayedAt: now } : p
        );
        const nextStore: ProfilesStore = {
          ...prev,
          activeProfileId: targetId,
          profiles: nextProfiles,
        };
        saveProfilesStore(nextStore);
        return nextStore;
      });
    },
    []
  );

  const handleSelectProfile = useCallback((profileId: string) => {
    setProfilesStore((prev) => {
      if (!prev.profiles.some((p) => p.id === profileId)) return prev;
      const now = new Date().toISOString();
      const nextStore: ProfilesStore = {
        ...prev,
        activeProfileId: profileId,
        profiles: prev.profiles.map((p) =>
          p.id === profileId ? { ...p, lastPlayedAt: now } : p
        ),
      };
      saveProfilesStore(nextStore);
      return nextStore;
    });
  }, []);

  const handleCreateProfile = useCallback((name: string, avatarId: ProfileAvatarId) => {
    const newProfile = createPlayerProfile(name, avatarId);
    setProfilesStore((prev) => {
      const nextStore: ProfilesStore = {
        version: 2,
        activeProfileId: newProfile.id,
        profiles: [newProfile, ...prev.profiles],
      };
      saveProfilesStore(nextStore);
      return nextStore;
    });
  }, []);

  const handleImportProfile = useCallback((imported: PlayerProfile) => {
    setProfilesStore((prev) => {
      const nextStore: ProfilesStore = {
        version: 2,
        activeProfileId: imported.id,
        profiles: [imported, ...prev.profiles],
      };
      saveProfilesStore(nextStore);
      return nextStore;
    });
  }, []);

  const handleDeleteProfile = useCallback((profileId: string) => {
    setProfilesStore((prev) => {
      const remaining = prev.profiles.filter((p) => p.id !== profileId);
      const nextActive =
        prev.activeProfileId === profileId ? remaining[0]?.id || null : prev.activeProfileId;
      const nextStore: ProfilesStore = {
        version: 2,
        activeProfileId: nextActive,
        profiles: remaining,
      };
      saveProfilesStore(nextStore);
      return nextStore;
    });
  }, []);

  const handleUpdateSettings = useCallback(
    (nextSettings: AccessibilitySettings) => {
      updateActiveProfile((prof) => ({
        ...prof,
        progress: { ...prof.progress, settings: nextSettings },
      }));
    },
    [updateActiveProfile]
  );

  const handleToggleSound = useCallback(() => {
    const isAnyAudioOn = progress.settings.soundEnabled || progress.settings.narrationEnabled;
    if (isAnyAudioOn) {
      stopAllAudio();
    } else {
      syncAudioPreferences(true, true);
    }
    updateActiveProfile((prof) => {
      const nextEnabled = !isAnyAudioOn;
      return {
        ...prof,
        progress: {
          ...prof.progress,
          settings: {
            ...prof.progress.settings,
            soundEnabled: nextEnabled,
            narrationEnabled: nextEnabled,
          },
        },
      };
    });
  }, [progress.settings.soundEnabled, progress.settings.narrationEnabled, updateActiveProfile]);

  const handleToggleNarration = useCallback(() => {
    const nextNarration = !progress.settings.narrationEnabled;
    if (!nextNarration) {
      stopSpeaking();
    }
    updateActiveProfile((prof) => ({
      ...prof,
      progress: {
        ...prof.progress,
        settings: {
          ...prof.progress.settings,
          narrationEnabled: nextNarration,
        },
      },
    }));
  }, [progress.settings.narrationEnabled, updateActiveProfile]);

  const handleChangeCameraDisplayMode = useCallback(
    (mode: CameraDisplayMode) => {
      updateActiveProfile((prof) => ({
        ...prof,
        progress: {
          ...prof.progress,
          settings: {
            ...prof.progress.settings,
            cameraDisplayMode: mode,
          },
        },
      }));
    },
    [updateActiveProfile]
  );

  const handleNavigate = useCallback(
    (nextScreen: GameScreen) => {
      stopSpeaking();
      setHoldingCursorItem(null);
      setDwellProgress(0);
      setScreen((current) => {
        if (nextScreen === 'GUARDIAN_PANEL' && current !== 'GUARDIAN_PANEL') {
          setGuardianReturnScreen(current);
        }
        return nextScreen;
      });
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
    updateActiveProfile((prof) => ({
      ...prof,
      progress: { ...prof.progress, hasCompletedCalibration: true },
    }));
    setHoldingCursorItem(null);
    setDwellProgress(0);
    setScreen('MISSION_MAP');
  }, [updateActiveProfile]);

  const handleStartMission = useCallback(
    (domain: MissionDomain, levelOverride?: DifficultyLevel, isCampaign = false) => {
      const targetLevel = levelOverride ?? selectedLevel;
      const generated = generateMissionChallenges(domain, targetLevel);
      setActiveDomain(domain);
      setActiveIsCampaign(isCampaign);
      setActiveCampaignChapterIdx(isCampaign ? progress.campaignStepIndex ?? 0 : null);
      setActiveChallenges(generated);
      setHoldingCursorItem(null);
      setDwellProgress(0);
      setScreen('PLAYING');
    },
    [selectedLevel, progress.campaignStepIndex]
  );

  const handleMissionCompleted = useCallback(
    (payload: MissionCompletionPayload) => {
      setHoldingCursorItem(null);
      setDwellProgress(0);
      const completedIdx = activeCampaignChapterIdx ?? progress.campaignStepIndex ?? 0;

      updateActiveProfile((prof) => {
        const { updated, starsEarned } = recordMissionCompletion(prof.progress, {
          ...payload,
          advanceCampaign: activeIsCampaign,
        });
        setLastVictory({
          domain: payload.domain,
          level: payload.level,
          starsEarned,
          firstTryCount: payload.firstTryCount,
          totalChallenges: payload.totalChallenges,
          isCampaign: activeIsCampaign,
          completedCampaignChapterIdx: completedIdx,
        });
        return { ...prof, progress: updated };
      });
      setScreen('MISSION_VICTORY');
    },
    [activeIsCampaign, activeCampaignChapterIdx, progress.campaignStepIndex, updateActiveProfile]
  );

  const handleResetProgress = useCallback(() => {
    updateActiveProfile((prof) => ({
      ...prof,
      progress: {
        ...createInitialProgress(),
        settings: prof.progress.settings,
      },
    }));
  }, [updateActiveProfile]);

  const showHandCursor =
    screen === 'CALIBRATION' ||
    screen === 'MISSION_MAP' ||
    screen === 'PLAYING' ||
    screen === 'MISSION_VICTORY';

  return (
    <div className="game-canvas-bg min-h-screen text-[#1C1917]">
      {/* Persistent hidden video element keeps MediaPipe webcam stream alive seamlessly across game screens */}
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden="true"
        className="pointer-events-none fixed h-px w-px opacity-0"
      />

      {screen === 'TITLE_MENU' && (
        <TitleScreen
          profiles={profilesStore.profiles}
          activeProfile={activeProfile}
          cameraReady={handTracking.status === 'ready'}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
          onImportProfile={handleImportProfile}
          onDeleteProfile={handleDeleteProfile}
          onStart={handleStartFromTitle}
          onOpenGuardian={() => handleNavigate('GUARDIAN_PANEL')}
        />
      )}

      {screen === 'CALIBRATION' && (
        <CalibrationScreen
          totalStars={progress.totalStellaStars}
          videoRef={videoRef}
          tracking={handTracking}
          settings={progress.settings}
          onStartCamera={startCamera}
          onCalibrationComplete={handleCalibrationComplete}
          onHoldingChange={setHoldingCursorItem}
          onDwellProgressChange={setDwellProgress}
          onToggleSound={handleToggleSound}
          onToggleNarration={handleToggleNarration}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
          onBackHome={() => handleNavigate('TITLE_MENU')}
          onOpenGuardian={() => handleNavigate('GUARDIAN_PANEL')}
        />
      )}

      {screen === 'MISSION_MAP' && (
        <MissionMapScreen
          videoRef={videoRef}
          tracking={handTracking}
          progress={progress}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onSelectMission={(d, isCamp) => handleStartMission(d, undefined, Boolean(isCamp))}
          onDwellProgressChange={setDwellProgress}
          onToggleSound={handleToggleSound}
          onToggleNarration={handleToggleNarration}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
          onBackHome={() => handleNavigate('TITLE_MENU')}
          onOpenGuardian={() => handleNavigate('GUARDIAN_PANEL')}
        />
      )}

      {screen === 'PLAYING' && activeChallenges.length > 0 && (
        <MissionArena
          key={`${activeDomain}_${selectedLevel}_${activeChallenges[0]?.id}`}
          totalStars={progress.totalStellaStars}
          domain={activeDomain}
          level={selectedLevel}
          challenges={activeChallenges}
          campaignChapterIndex={activeCampaignChapterIdx}
          videoRef={videoRef}
          tracking={handTracking}
          settings={progress.settings}
          onExitToMap={() => handleNavigate('MISSION_MAP')}
          onToggleSound={handleToggleSound}
          onToggleNarration={handleToggleNarration}
          onChangeCameraDisplayMode={handleChangeCameraDisplayMode}
          onOpenGuardian={() => handleNavigate('GUARDIAN_PANEL')}
          onCompleteMission={handleMissionCompleted}
          onHoldingChange={setHoldingCursorItem}
          onDwellProgressChange={setDwellProgress}
        />
      )}

      {screen === 'MISSION_VICTORY' && lastVictory && (
        <MissionVictoryModal
          domain={lastVictory.domain}
          level={lastVictory.level}
          starsEarned={lastVictory.starsEarned}
          firstTryCount={lastVictory.firstTryCount}
          totalChallenges={lastVictory.totalChallenges}
          isCampaign={lastVictory.isCampaign}
          completedCampaignChapterIdx={lastVictory.completedCampaignChapterIdx}
          tracking={handTracking}
          settings={progress.settings}
          onDwellProgressChange={setDwellProgress}
          onReplay={() =>
            handleStartMission(lastVictory.domain, lastVictory.level, lastVictory.isCampaign)
          }
          onNextMission={(nextDomain, nextIsCamp) =>
            handleStartMission(nextDomain, lastVictory.level, Boolean(nextIsCamp))
          }
          onBackToMap={() => handleNavigate('MISSION_MAP')}
        />
      )}

      {screen === 'GUARDIAN_PANEL' && (
        <GuardianPanel
          profile={activeProfile ?? fallbackProfile}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onBack={() => handleNavigate(guardianReturnScreen)}
        />
      )}

      <HandCursor
        tracking={handTracking}
        visible={showHandCursor}
        holdingLabel={holdingCursorItem?.label}
        holdingEmoji={holdingCursorItem?.emoji}
        dwellProgress={dwellProgress}
      />

      <OfflineIndicator />
    </div>
  );
}
