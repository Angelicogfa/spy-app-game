export type GameScreen =
  | 'TITLE_MENU'
  | 'CALIBRATION'
  | 'MISSION_MAP'
  | 'PLAYING'
  | 'MISSION_VICTORY'
  | 'GUARDIAN_PANEL';

export type MissionDomain =
  | 'math'
  | 'routine'
  | 'emotions'
  | 'logic'
  | 'classification';

export type DifficultyLevel = 1 | 2 | 3;

export type InteractionMode =
  | 'drag_count'
  | 'drag_buckets'
  | 'sequence_order'
  | 'pinch_choice'
  | 'trace_connect'
  | 'open_palm_reveal';

export type CameraStatus =
  | 'idle'
  | 'loading_model'
  | 'requesting_camera'
  | 'ready'
  | 'permission_denied'
  | 'error';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingState {
  status: CameraStatus;
  errorMessage: string | null;
  handDetected: boolean;
  /** Viewport pixel coordinates (0..window.innerWidth, 0..window.innerHeight) */
  cursorX: number;
  cursorY: number;
  /** Normalized mirrored coordinates (0..1) */
  normX: number;
  normY: number;
  isPinching: boolean;
  /** True when fingers are clearly spread open (used for High-Five & Cloud Sweep) */
  isOpenPalm: boolean;
  pinchDistance: number;
  landmarks: NormalizedLandmark[] | null;
  fps: number;
}

export type CameraDisplayMode = 'hidden' | 'hand_only' | 'video';

export type GestureControlMode = 'pinch' | 'dwell';

export interface AccessibilitySettings {
  /** Normalized pinch start threshold (default 0.36; higher = easier to pinch) */
  pinchThreshold: number;
  /** EMA smoothing factor (0.15 = very smooth, 0.65 = very fast; default 0.35) */
  smoothingFactor: number;
  soundEnabled: boolean;
  narrationEnabled: boolean;
  /** Controls webcam preview visibility to prevent self-video distraction */
  cameraDisplayMode: CameraDisplayMode;
  /** 'pinch' = point + pinch, 'dwell' = point & hold ~1.2s without pinching */
  gestureControlMode: GestureControlMode;
}

export interface VisualToken {
  id: string;
  label: string;
  emoji: string;
  colorClass?: string;
  crossedOut?: boolean;
}

export interface DraggableItem {
  id: string;
  label: string;
  emoji: string;
  category: string;
  accentBg: string;
  accentBorder: string;
}

export interface DropZoneDef {
  id: string;
  label: string;
  subtitle?: string;
  emoji: string;
  acceptsCategory: string;
  targetCount?: number;
  accentBg: string;
  accentBorder: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  sublabel?: string;
  emoji: string;
  isCorrect: boolean;
  visualCount?: number;
}

export interface SequenceSlotItem {
  id: string;
  label: string;
  emoji: string;
  bgClass: string;
}

export interface TraceNode {
  id: string;
  label: string;
  emoji?: string;
  /** Percentage position inside the tracing canvas (10..90) */
  xPct: number;
  yPct: number;
}

export interface CloudRevealItem {
  id: string;
  xPct: number;
  yPct: number;
  size: 'md' | 'lg';
}

export interface MissionChallenge {
  id: string;
  domain: MissionDomain;
  level: DifficultyLevel;
  mode: InteractionMode;
  characterName: string;
  characterEmoji: string;
  sceneTag: string;
  prompt: string;
  narrationText: string;
  hintText: string;
  successMessage: string;
  /** Optional telepathy bubble revealed when pointing at the character */
  telepathyThought?: string;
  /** Visual illustration groups for math/emotion scenes */
  visualGroups?: {
    title: string;
    tokens: VisualToken[];
    operatorAfter?: '+' | '-' | '=';
  }[];
  /** For drag_count and drag_buckets */
  draggableItems?: DraggableItem[];
  dropZones?: DropZoneDef[];
  /** For drag_count specifically */
  targetTotalCount?: number;
  /** For sequence_order */
  sequencePromptItems?: (SequenceSlotItem | null)[];
  sequenceExpectedOrder?: string[];
  sequencePool?: SequenceSlotItem[];
  /** For pinch_choice and open_palm_reveal */
  choices?: ChoiceOption[];
  /** For trace_connect (air finger dot-to-dot tracing) */
  traceNodes?: TraceNode[];
  traceShapeTitle?: string;
  traceAccentColor?: string;
  /** For open_palm_reveal (sweep clouds away with open hand to uncover clue) */
  cloudsToClear?: CloudRevealItem[];
  revealedClueEmoji?: string;
  revealedClueTitle?: string;
  revealedClueText?: string;
}

export interface MissionMetadata {
  domain: MissionDomain;
  title: string;
  shortTitle: string;
  animeReference: string;
  skillLabel: string;
  description: string;
  characterGuide: string;
  imagePath: string;
  fallbackGradient: string;
  accentColor: string;
  badgeText: string;
}

export interface SkillStats {
  completedChallenges: number;
  firstTryCorrect: number;
  hintsUsed: number;
  totalTimeSec: number;
  sessionsCompleted: number;
}

export interface SessionRecord {
  id: string;
  timestamp: string;
  domain: MissionDomain;
  level: DifficultyLevel;
  starsEarned: number;
  firstTryCount: number;
  totalChallenges: number;
  hintsUsed: number;
  durationSec: number;
  successfulPinches: number;
}

export interface PlayerProgress {
  version: number;
  totalStellaStars: number;
  /** Best stars (0..3) keyed by `${domain}_${level}` */
  missionBestStars: Record<string, number>;
  skillStats: Record<MissionDomain, SkillStats>;
  gestureTelemetry: {
    successfulPinches: number;
    earlyDrops: number;
    totalMissionMinutes: number;
  };
  recentSessions: SessionRecord[];
  settings: AccessibilitySettings;
  hasCompletedCalibration: boolean;
  /** Current chapter index (0..4) in "Um Dia na Família Forger" story campaign */
  campaignStepIndex: number;
  /** How many full 5-chapter days have been completed */
  campaignCompletedCount: number;
}

export type ProfileAvatarId = 'anya' | 'loid' | 'yor' | 'bond';

export interface PlayerProfile {
  id: string;
  name: string;
  avatarId: ProfileAvatarId;
  createdAt: string;
  lastPlayedAt: string;
  progress: PlayerProgress;
}

export interface ProfilesStore {
  version: number;
  activeProfileId: string | null;
  profiles: PlayerProfile[];
}
