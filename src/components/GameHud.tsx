import {
  ArrowLeft,
  EyeOff,
  Hand,
  Home,
  MessageSquare,
  Star,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AccessibilitySettings, CameraDisplayMode } from '../types/game';
import { GuardianHoldButton } from './GuardianHoldButton';

interface GameHudProps {
  totalStars: number;
  settings: AccessibilitySettings;
  backLabel?: string;
  backIcon?: 'home' | 'back';
  backButtonRef?: React.RefObject<HTMLButtonElement | null>;
  backHovered?: boolean;
  centerSlot?: React.ReactNode;
  onBack?: () => void;
  onToggleSound: () => void;
  onToggleNarration: () => void;
  onChangeCameraDisplayMode: (mode: CameraDisplayMode) => void;
  onOpenGuardian: () => void;
}

export function GameHud({
  totalStars,
  settings,
  backLabel,
  backIcon = 'home',
  backButtonRef,
  backHovered = false,
  centerSlot,
  onBack,
  onToggleSound,
  onToggleNarration,
  onChangeCameraDisplayMode,
  onOpenGuardian,
}: GameHudProps) {
  const camMode = settings.cameraDisplayMode;
  const cycleCameraMode = () => {
    const next: CameraDisplayMode =
      camMode === 'hidden' ? 'hand_only' : camMode === 'hand_only' ? 'video' : 'hidden';
    onChangeCameraDisplayMode(next);
  };

  return (
    <header className="mx-auto flex w-full max-w-[1160px] shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-5">
      {/* Left Game Controls: Back + Stella Star Counter */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            ref={backButtonRef}
            type="button"
            onClick={onBack}
            className={`game-btn-3d inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-3 font-display text-xs font-bold text-[#14532D] hover:bg-[#F6EFE0] cursor-pointer whitespace-nowrap ${
              backHovered ? 'scale-105 ring-4 ring-[#FBCFE8] border-[#EC4899]' : ''
            }`}
          >
            {backIcon === 'home' ? (
              <Home className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            )}
            {backLabel && <span>{backLabel}</span>}
          </button>
        )}

        <div
          className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-[#EAB308] border-b-4 border-b-[#CA8A04] bg-[#FEF9C3] px-3 shadow-xs"
          title="Total de Estrelas Stella"
        >
          <Star className="h-4 w-4 fill-[#EAB308] text-[#B45309]" />
          <span className="font-display text-sm font-extrabold text-[#78350F] tabular-nums">
            {totalStars}
          </span>
        </div>
      </div>

      {/* Center Slot: Stage Progress Stars or Level Picker */}
      {centerSlot && <div className="flex items-center justify-center">{centerSlot}</div>}

      {/* Right Game Utility Icons: Camera mode, Audio, Voice, Parents */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={cycleCameraMode}
          className="game-btn-3d inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-2.5 text-xs font-bold text-[#1C1917] hover:bg-[#F6EFE0] cursor-pointer whitespace-nowrap"
          title="Alternar câmera: Oculta, Só Mão ou Vídeo"
        >
          {camMode === 'hidden' ? (
            <EyeOff className="h-3.5 w-3.5 text-[#14532D]" />
          ) : camMode === 'hand_only' ? (
            <Hand className="h-3.5 w-3.5 text-[#EC4899]" />
          ) : (
            <Video className="h-3.5 w-3.5 text-[#B45309]" />
          )}
          <span className="hidden sm:inline">
            {camMode === 'hidden' ? 'Câmera Oculta' : camMode === 'hand_only' ? 'Só Mão' : 'Vídeo'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          className={`game-btn-3d flex h-9 w-9 items-center justify-center rounded-xl border-2 cursor-pointer ${
            !settings.soundEnabled && !settings.narrationEnabled
              ? 'border-[#DC2626] border-b-[#991B1B] bg-[#FEE2E2] text-[#DC2626]'
              : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#14532D] hover:bg-[#F6EFE0]'
          }`}
          title={
            settings.soundEnabled || settings.narrationEnabled
              ? 'Silenciar tudo (Mudo)'
              : 'Reativar som e voz'
          }
          aria-label={
            settings.soundEnabled || settings.narrationEnabled
              ? 'Silenciar tudo'
              : 'Reativar som e voz'
          }
        >
          {settings.soundEnabled || settings.narrationEnabled ? (
            <Volume2 className="h-4 w-4 text-[#14532D]" />
          ) : (
            <VolumeX className="h-4 w-4 text-[#DC2626]" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleNarration}
          className={`game-btn-3d inline-flex h-9 items-center gap-1 rounded-xl border-2 px-2.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
            settings.narrationEnabled
              ? 'border-[#14532D] border-b-[#0D3B1E] bg-[#14532D] text-white'
              : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#57534E]'
          }`}
          title={
            settings.narrationEnabled
              ? 'Desativar narração em voz alta'
              : 'Ativar narração em voz alta'
          }
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{settings.narrationEnabled ? 'Voz' : 'Sem Voz'}</span>
        </button>

        <GuardianHoldButton variant="hud" onOpenGuardian={onOpenGuardian} />
      </div>
    </header>
  );
}
