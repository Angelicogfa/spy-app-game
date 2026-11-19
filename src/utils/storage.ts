import {
  AccessibilitySettings,
  DifficultyLevel,
  MissionDomain,
  PlayerProfile,
  PlayerProgress,
  ProfileAvatarId,
  ProfilesStore,
  SessionRecord,
  SkillStats,
} from '../types/game';

const LEGACY_STORAGE_KEY = 'operacao_stella_progress_v1';
const PROFILES_STORAGE_KEY = 'operacao_stella_profiles_v2';

const createEmptySkillStats = (): SkillStats => ({
  completedChallenges: 0,
  firstTryCorrect: 0,
  hintsUsed: 0,
  totalTimeSec: 0,
  sessionsCompleted: 0,
});

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  pinchThreshold: 0.38,
  smoothingFactor: 0.34,
  soundEnabled: true,
  narrationEnabled: true,
  cameraDisplayMode: 'hidden',
  gestureControlMode: 'pinch',
};

export function createInitialProgress(): PlayerProgress {
  return {
    version: 1,
    totalStellaStars: 0,
    missionBestStars: {},
    skillStats: {
      math: createEmptySkillStats(),
      routine: createEmptySkillStats(),
      emotions: createEmptySkillStats(),
      logic: createEmptySkillStats(),
      classification: createEmptySkillStats(),
    },
    gestureTelemetry: {
      successfulPinches: 0,
      earlyDrops: 0,
      totalMissionMinutes: 0,
    },
    recentSessions: [],
    settings: { ...DEFAULT_SETTINGS },
    hasCompletedCalibration: false,
    campaignStepIndex: 0,
    campaignCompletedCount: 0,
  };
}

export function normalizeProgress(parsed?: Partial<PlayerProgress> | null): PlayerProgress {
  const initial = createInitialProgress();
  if (!parsed || typeof parsed !== 'object') return initial;
  return {
    ...initial,
    ...parsed,
    skillStats: {
      ...initial.skillStats,
      ...(parsed.skillStats || {}),
    },
    gestureTelemetry: {
      ...initial.gestureTelemetry,
      ...(parsed.gestureTelemetry || {}),
    },
    settings: {
      ...initial.settings,
      ...(parsed.settings || {}),
    },
    recentSessions: Array.isArray(parsed.recentSessions) ? parsed.recentSessions : [],
    campaignStepIndex:
      typeof parsed.campaignStepIndex === 'number'
        ? Math.max(0, Math.min(4, parsed.campaignStepIndex))
        : 0,
    campaignCompletedCount:
      typeof parsed.campaignCompletedCount === 'number' ? parsed.campaignCompletedCount : 0,
  };
}

export function createPlayerProfile(
  name: string,
  avatarId: ProfileAvatarId,
  initialProgress?: Partial<PlayerProgress>
): PlayerProfile {
  const now = new Date().toISOString();
  return {
    id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Agente Estrela',
    avatarId,
    createdAt: now,
    lastPlayedAt: now,
    progress: normalizeProgress(initialProgress),
  };
}

export function loadProfilesStore(): ProfilesStore {
  if (typeof window === 'undefined') {
    return { version: 2, activeProfileId: null, profiles: [] };
  }

  try {
    const rawV2 = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<ProfilesStore>;
      const profiles: PlayerProfile[] = Array.isArray(parsed.profiles)
        ? parsed.profiles.map((p) => ({
            id: p.id || `prof_${Math.random().toString(36).slice(2, 8)}`,
            name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Agente Estrela',
            avatarId: (['anya', 'loid', 'yor', 'bond'].includes(p.avatarId)
              ? p.avatarId
              : 'anya') as ProfileAvatarId,
            createdAt: p.createdAt || new Date().toISOString(),
            lastPlayedAt: p.lastPlayedAt || new Date().toISOString(),
            progress: normalizeProgress(p.progress),
          }))
        : [];
      const activeProfileId =
        parsed.activeProfileId && profiles.some((p) => p.id === parsed.activeProfileId)
          ? parsed.activeProfileId
          : profiles[0]?.id || null;
      return { version: 2, activeProfileId, profiles };
    }

    // Migrate legacy v1 progress seamlessly into the first profile so no child loses stars
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1) as Partial<PlayerProgress>;
      const migrated = createPlayerProfile('Agente Estrela', 'anya', parsedV1);
      const store: ProfilesStore = {
        version: 2,
        activeProfileId: migrated.id,
        profiles: [migrated],
      };
      saveProfilesStore(store);
      return store;
    }
  } catch {
    // Fallback to empty store
  }

  return { version: 2, activeProfileId: null, profiles: [] };
}

export function saveProfilesStore(store: ProfilesStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordMissionCompletion(
  current: PlayerProgress,
  params: {
    domain: MissionDomain;
    level: DifficultyLevel;
    firstTryCount: number;
    totalChallenges: number;
    hintsUsed: number;
    durationSec: number;
    successfulPinches: number;
    earlyDrops: number;
    advanceCampaign?: boolean;
  }
): { updated: PlayerProgress; starsEarned: number } {
  const {
    domain,
    level,
    firstTryCount,
    totalChallenges,
    hintsUsed,
    durationSec,
    successfulPinches,
    earlyDrops,
    advanceCampaign = false,
  } = params;

  // Always reward effort generously for ASD encouragement (1 to 3 Stella Stars)
  const ratio = totalChallenges > 0 ? firstTryCount / totalChallenges : 1;
  const starsEarned = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;

  const key = `${domain}_${level}`;
  const prevBest = current.missionBestStars[key] || 0;
  const newBest = Math.max(prevBest, starsEarned);
  const starDelta = Math.max(0, newBest - prevBest);

  const prevSkill = current.skillStats[domain];
  const updatedSkill: SkillStats = {
    completedChallenges: prevSkill.completedChallenges + totalChallenges,
    firstTryCorrect: prevSkill.firstTryCorrect + firstTryCount,
    hintsUsed: prevSkill.hintsUsed + hintsUsed,
    totalTimeSec: prevSkill.totalTimeSec + durationSec,
    sessionsCompleted: prevSkill.sessionsCompleted + 1,
  };

  const session: SessionRecord = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    domain,
    level,
    starsEarned,
    firstTryCount,
    totalChallenges,
    hintsUsed,
    durationSec,
    successfulPinches,
  };

  let nextCampaignStep = current.campaignStepIndex ?? 0;
  let nextCampaignCompleted = current.campaignCompletedCount ?? 0;
  if (advanceCampaign) {
    if (nextCampaignStep >= 4) {
      nextCampaignStep = 0;
      nextCampaignCompleted += 1;
    } else {
      nextCampaignStep += 1;
    }
  }

  const updated: PlayerProgress = {
    ...current,
    totalStellaStars: current.totalStellaStars + starDelta,
    missionBestStars: {
      ...current.missionBestStars,
      [key]: newBest,
    },
    skillStats: {
      ...current.skillStats,
      [domain]: updatedSkill,
    },
    gestureTelemetry: {
      successfulPinches: current.gestureTelemetry.successfulPinches + successfulPinches,
      earlyDrops: current.gestureTelemetry.earlyDrops + earlyDrops,
      totalMissionMinutes: Number(
        (current.gestureTelemetry.totalMissionMinutes + durationSec / 60).toFixed(1)
      ),
    },
    recentSessions: [session, ...current.recentSessions].slice(0, 30),
    campaignStepIndex: nextCampaignStep,
    campaignCompletedCount: nextCampaignCompleted,
  };

  return { updated, starsEarned };
}

export function exportProfileJson(profile: PlayerProfile): void {
  const payload = {
    type: 'operacao_stella_profile_export',
    exportedAt: new Date().toISOString(),
    profile,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'jogador';
  link.href = url;
  link.download = `sessao-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseImportedProfileJson(rawText: string): PlayerProfile | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    // Format 1: New exported profile bundle
    if (parsed && parsed.profile && typeof parsed.profile === 'object') {
      const p = parsed.profile as Partial<PlayerProfile>;
      const avatarId = (['anya', 'loid', 'yor', 'bond'].includes(String(p.avatarId))
        ? p.avatarId
        : 'anya') as ProfileAvatarId;
      return createPlayerProfile(
        typeof p.name === 'string' && p.name.trim() ? p.name : 'Sessão Importada',
        avatarId,
        p.progress
      );
    }
    // Format 2: Legacy raw PlayerProgress JSON
    if (parsed && typeof parsed.totalStellaStars === 'number') {
      return createPlayerProfile(
        'Sessão Importada',
        'anya',
        parsed as Partial<PlayerProgress>
      );
    }
    return null;
  } catch {
    return null;
  }
}
