import {
  AccessibilitySettings,
  DifficultyLevel,
  MissionDomain,
  PlayerProgress,
  SessionRecord,
  SkillStats,
} from '../types/game';

const STORAGE_KEY = 'operacao_stella_progress_v1';

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
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return createInitialProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const initial = createInitialProgress();
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
    };
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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
  };

  saveProgress(updated);
  return { updated, starsEarned };
}

export function exportProgressJson(progress: PlayerProgress): void {
  const blob = new Blob([JSON.stringify(progress, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-operacao-stella-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
