import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  EyeOff,
  Hand,
  Home,
  Lock,
  MessageSquare,
  Star,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AccessibilitySettings, CameraDisplayMode } from '../types/game';

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
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const HOLD_MS = 1300;

  const cancelHold = () => {
    if (holdTimerRef.current !== null) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = () => {
    holdStartRef.current = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - holdStartRef.current) / HOLD_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        cancelHold();
        onOpenGuardian();
      } else {
        holdTimerRef.current = requestAnimationFrame(tick);
      }
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelHold(), []);

  const camMode = settings.cameraDisplayMode;
  const cycleCameraMode = () => {
    const next: CameraDisplayMode =
      camMode === 'hidden' ? 'hand_only' : camMode === 'hand_only' ? 'video' : 'hidden';
    onChangeCameraDisplayMode(next);
  };

  return (
    <header className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-6">
      {/* Left Game Controls: Back + Stella Star Counter */}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            ref={backButtonRef}
            type="button"
            onClick={onBack}
            className={`game-btn-3d inline-flex items-center gap-2 rounded-2xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-3.5 py-2 font-display text-sm font-bold text-[#14532D] hover:bg-[#F6EFE0] cursor-pointer whitespace-nowrap ${
              backHovered ? 'scale-105 ring-4 ring-[#FBCFE8] border-[#EC4899]' : ''
            }`}
          >
            {backIcon === 'home' ? (
              <Home className="h-4 w-4 shrink-0" />
            ) : (
              <ArrowLeft className="h-4 w-4 shrink-0" />
            )}
            {backLabel && <span>{backLabel}</span>}
          </button>
        )}

        <div
          className="flex items-center gap-2 rounded-2xl border-2 border-[#EAB308] border-b-4 border-b-[#CA8A04] bg-[#FEF9C3] px-3.5 py-1.5 shadow-xs"
          title="Total de Estrelas Stella"
        >
          <Star className="h-5 w-5 fill-[#EAB308] text-[#B45309]" />
          <span className="font-display text-base font-extrabold text-[#78350F] tabular-nums">
            {totalStars}
          </span>
        </div>
      </div>

      {/* Center Slot: Stage Progress Stars or World Title */}
      {centerSlot && <div className="flex items-center justify-center">{centerSlot}</div>}

      {/* Right Game Utility Icons: Camera mode, Audio, Voice, Hold-for-Parents */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cycleCameraMode}
          className="game-btn-3d inline-flex items-center gap-1.5 rounded-2xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-3 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F6EFE0] cursor-pointer whitespace-nowrap"
          title="Alternar câmera: Oculta, Só Mão ou Vídeo"
        >
          {camMode === 'hidden' ? (
            <EyeOff className="h-4 w-4 text-[#14532D]" />
          ) : camMode === 'hand_only' ? (
            <Hand className="h-4 w-4 text-[#EC4899]" />
          ) : (
            <Video className="h-4 w-4 text-[#B45309]" />
          )}
          <span className="hidden sm:inline">
            {camMode === 'hidden' ? 'Câmera Oculta' : camMode === 'hand_only' ? 'Só Mão' : 'Vídeo'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          className="game-btn-3d flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#14532D] hover:bg-[#F6EFE0] cursor-pointer"
          title={settings.soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
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
          className={`game-btn-3d inline-flex h-10 items-center gap-1.5 rounded-2xl border-2 px-3 text-xs font-bold cursor-pointer whitespace-nowrap ${
            settings.narrationEnabled
              ? 'border-[#14532D] border-b-[#0D3B1E] bg-[#14532D] text-white'
              : 'border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] text-[#57534E]'
          }`}
          title="Ativar ou desativar narração em voz alta"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{settings.narrationEnabled ? 'Voz' : 'Mudo'}</span>
        </button>

        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenGuardian();
            }
          }}
          title="Segure para abrir a Área dos Pais"
          className="game-btn-3d relative overflow-hidden rounded-2xl border-2 border-[#D9CEB8] border-b-[#BFB195] bg-[#FFFDF7] px-3 py-2 text-xs font-bold text-[#57534E] hover:text-[#14532D] cursor-pointer select-none whitespace-nowrap"
        >
          <span
            className="pointer-events-none absolute inset-0 origin-left bg-[#EAB308]/40"
            style={{ transform: `scaleX(${holdProgress / 100})` }}
          />
          <span className="relative flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>{holdProgress > 0 ? 'Segure...' : 'Pais'}</span>
          </span>
        </button>
      </div>
    </header>
  );
}
