import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import {
  AccessibilitySettings,
  CameraDisplayMode,
  HandTrackingState,
} from '../types/game';
import { playChallengeSuccess, playPinchGrab, speakPtBr } from '../utils/audio';
import { CameraMirror } from './CameraMirror';
import { GameHud } from './GameHud';

interface CalibrationScreenProps {
  totalStars: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  settings: AccessibilitySettings;
  onStartCamera: () => Promise<void>;
  onCalibrationComplete: () => void;
  onHoldingChange: (item: { label: string; emoji: string } | null) => void;
  onToggleSound: () => void;
  onToggleNarration: () => void;
  onChangeCameraDisplayMode: (mode: CameraDisplayMode) => void;
  onBackHome: () => void;
  onOpenGuardian: () => void;
}

export function CalibrationScreen({
  totalStars,
  videoRef,
  tracking,
  settings,
  onStartCamera,
  onCalibrationComplete,
  onHoldingChange,
  onToggleSound,
  onToggleNarration,
  onChangeCameraDisplayMode,
  onBackHome,
  onOpenGuardian,
}: CalibrationScreenProps) {
  const [holdingPeanut, setHoldingPeanut] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [hoveringPeanut, setHoveringPeanut] = useState(false);
  const [hoveringBag, setHoveringBag] = useState(false);
  const [hoveringContinue, setHoveringContinue] = useState(false);

  const peanutRef = useRef<HTMLDivElement | null>(null);
  const bagRef = useRef<HTMLDivElement | null>(null);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevPinchRef = useRef(false);

  useEffect(() => {
    if (tracking.status === 'idle') {
      onStartCamera();
    }
  }, [tracking.status, onStartCamera]);

  useEffect(() => {
    if (tracking.status === 'ready' && !calibrated) {
      speakPtBr(
        'Treino secreto! Aponte para o amendoim, faça pinça para pegar e solte na mochila da Anya.',
        settings.narrationEnabled
      );
    }
  }, [tracking.status, calibrated, settings.narrationEnabled]);

  useEffect(() => {
    return () => onHoldingChange(null);
  }, [onHoldingChange]);

  useEffect(() => {
    if (tracking.status !== 'ready' || !tracking.handDetected) {
      setHoveringPeanut(false);
      setHoveringBag(false);
      setHoveringContinue(false);
      if (holdingPeanut) {
        setHoldingPeanut(false);
        onHoldingChange(null);
      }
      prevPinchRef.current = false;
      return;
    }

    const { cursorX, cursorY, isPinching } = tracking;
    const justPinched = isPinching && !prevPinchRef.current;
    const justReleased = !isPinching && prevPinchRef.current;
    prevPinchRef.current = isPinching;

    const isInside = (el: HTMLElement | null, pad = 20) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        cursorX >= r.left - pad &&
        cursorX <= r.right + pad &&
        cursorY >= r.top - pad &&
        cursorY <= r.bottom + pad
      );
    };

    if (!calibrated) {
      const overPeanut = isInside(peanutRef.current, 26);
      const overBag = isInside(bagRef.current, 30);
      setHoveringPeanut(overPeanut);
      setHoveringBag(overBag);

      if (!holdingPeanut && overPeanut && justPinched) {
        setHoldingPeanut(true);
        onHoldingChange({ label: 'Amendoim', emoji: '🥜' });
        playPinchGrab(settings.soundEnabled);
      } else if (holdingPeanut && justReleased) {
        setHoldingPeanut(false);
        onHoldingChange(null);
        if (overBag) {
          setCalibrated(true);
          playChallengeSuccess(settings.soundEnabled);
          speakPtBr(
            'Waku waku! Muito bem! Faça pinça no botão verde para começar as missões!',
            settings.narrationEnabled
          );
        }
      }
    } else {
      const overContinue = isInside(continueBtnRef.current, 18);
      setHoveringContinue(overContinue);
      if (overContinue && justPinched) {
        playPinchGrab(settings.soundEnabled);
        onCalibrationComplete();
      }
    }
  }, [
    tracking,
    calibrated,
    holdingPeanut,
    settings.soundEnabled,
    settings.narrationEnabled,
    onCalibrationComplete,
    onHoldingChange,
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <GameHud
        totalStars={totalStars}
        settings={settings}
        backLabel="Início"
        backIcon="home"
        onBack={onBackHome}
        onToggleSound={onToggleSound}
        onToggleNarration={onToggleNarration}
        onChangeCameraDisplayMode={onChangeCameraDisplayMode}
        onOpenGuardian={onOpenGuardian}
        centerSlot={
          <div className="rounded-2xl border-2 border-[#D9CEB8] bg-[#FFFDF7] px-5 py-1.5 font-display text-base font-extrabold text-[#14532D] shadow-xs">
            Fase 0 · Treino da Mão
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-[920px] flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6">
        {(tracking.status === 'permission_denied' || tracking.status === 'error') && (
          <div className="game-board-frame w-full max-w-xl p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
              <Camera className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-[#1C1917]">
              Precisamos ativar a câmera
            </h2>
            <p className="mt-2 text-sm text-[#57534E]">{tracking.errorMessage}</p>
            <button
              type="button"
              onClick={() => onStartCamera()}
              className="game-btn-3d mt-6 inline-flex items-center gap-2 rounded-2xl border-2 border-[#14532D] border-b-[#0D3B1E] bg-[#14532D] px-6 py-3 font-display text-base font-bold text-white cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {(tracking.status === 'idle' ||
          tracking.status === 'loading_model' ||
          tracking.status === 'requesting_camera') && (
          <div className="game-board-frame w-full max-w-lg p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DCFCE7] text-[#14532D]">
              <Sparkles className="h-10 w-10 animate-pulse" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold text-[#14532D]">
              {tracking.status === 'loading_model'
                ? 'Preparando a mão mágica...'
                : 'Liberando a câmera...'}
            </h2>
            <p className="mt-2 text-sm text-[#57534E]">
              Clique em &ldquo;Permitir&rdquo; se o navegador pedir acesso à câmera.
            </p>
          </div>
        )}

        {tracking.status === 'ready' && (
          <section className="game-board-frame flex w-full flex-col items-center justify-between p-6 text-center sm:p-10">
            <div className="flex items-center gap-3">
              {calibrated && <CheckCircle2 className="h-8 w-8 text-[#059669]" />}
              <h1 className="font-display text-2xl font-extrabold text-[#14532D] sm:text-3xl">
                {calibrated
                  ? 'Waku waku! Mão pronta para jogar!'
                  : 'Pegue o amendoim e solte na mochila!'}
              </h1>
            </div>

            {!calibrated ? (
              <div className="my-10 grid w-full max-w-2xl grid-cols-1 items-center gap-10 sm:grid-cols-2">
                {/* Tactile Giant Peanut Token */}
                <div className="flex flex-col items-center">
                  <div
                    ref={peanutRef}
                    className={`game-token-3d flex h-52 w-52 flex-col items-center justify-center rounded-[2rem] ${
                      holdingPeanut
                        ? 'scale-90 border-dashed border-[#D9CEB8] bg-[#F6EFE0] opacity-40'
                        : hoveringPeanut
                          ? 'scale-105 border-[#EC4899] border-b-[#9D174D] bg-[#FEF3C7] shadow-xl'
                          : 'animate-float-gentle border-[#F59E0B] border-b-[#B45309] bg-[#FEF3C7] shadow-md'
                    }`}
                  >
                    <span className="text-8xl leading-none">🥜</span>
                    <span className="mt-2 font-display text-lg font-extrabold text-[#78350F]">
                      {holdingPeanut ? 'Segurando!' : 'Amendoim'}
                    </span>
                  </div>
                  <span className="mt-3 text-xs font-bold text-[#57534E]">
                    1. Junte os dedos (Pinça)
                  </span>
                </div>

                {/* Recessed Target Satchel */}
                <div className="flex flex-col items-center">
                  <div
                    ref={bagRef}
                    className={`flex h-56 w-60 flex-col items-center justify-center rounded-[2rem] border-4 border-dashed transition-transform duration-150 ${
                      holdingPeanut && hoveringBag
                        ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                        : holdingPeanut
                          ? 'border-[#14532D] bg-[#F0FDF4]'
                          : 'border-[#BFB195] bg-[#F4EFE0] shadow-inner'
                    }`}
                  >
                    <span className="text-8xl leading-none">🎒</span>
                    <span className="mt-2 font-display text-lg font-extrabold text-[#14532D]">
                      Mochila da Anya
                    </span>
                    <span className="mt-0.5 text-xs font-semibold text-[#57534E]">
                      {holdingPeanut && hoveringBag ? 'Solte agora!' : 'Solte aqui'}
                    </span>
                  </div>
                  <span className="mt-3 text-xs font-bold text-[#57534E]">
                    2. Abra os dedos para soltar
                  </span>
                </div>
              </div>
            ) : (
              <div className="my-10 flex flex-col items-center">
                <div className="animate-stella-pop flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#B45309] bg-[#FEF9C3] text-7xl shadow-md">
                  ⭐
                </div>

                <button
                  ref={continueBtnRef}
                  type="button"
                  onClick={onCalibrationComplete}
                  className={`game-btn-3d mt-8 inline-flex items-center gap-3 rounded-3xl border-3 border-[#86EFAC] border-b-[7px] border-b-[#0D3B1E] bg-[#14532D] px-10 py-5 font-display text-2xl font-extrabold text-white cursor-pointer ${
                    hoveringContinue
                      ? 'scale-105 border-[#FBCFE8] border-b-[#9D174D] bg-[#EC4899] ring-4 ring-[#FBCFE8] shadow-xl'
                      : 'hover:bg-[#1B6B3A]'
                  }`}
                >
                  <span>ESCOLHER MISSÃO</span>
                  <ArrowRight className="h-6 w-6" />
                </button>
              </div>
            )}

            <div className="rounded-full bg-[#F4EFE0] px-4 py-1.5 font-mono text-xs font-bold text-[#14532D]">
              {tracking.handDetected
                ? tracking.isPinching
                  ? 'Mão na tela · Pinça ativa'
                  : 'Mão na tela · Apontando'
                : 'Levante sua mão aberta em frente à câmera'}
            </div>
          </section>
        )}
      </main>

      {tracking.status === 'ready' && settings.cameraDisplayMode !== 'hidden' && (
        <div className="fixed bottom-4 right-4 z-40 w-64">
          <CameraMirror
            videoRef={videoRef}
            tracking={tracking}
            displayMode={settings.cameraDisplayMode}
            onChangeDisplayMode={onChangeCameraDisplayMode}
            compact
          />
        </div>
      )}
    </div>
  );
}
