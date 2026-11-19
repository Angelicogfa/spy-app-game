import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, EyeOff, Hand, RefreshCw, Sparkles, Video } from 'lucide-react';
import { AccessibilitySettings, CameraDisplayMode, HandTrackingState } from '../types/game';
import { playChallengeSuccess, playPinchGrab, speakPtBr } from '../utils/audio';
import { CameraMirror } from './CameraMirror';

interface CalibrationScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracking: HandTrackingState;
  settings: AccessibilitySettings;
  onStartCamera: () => Promise<void>;
  onCalibrationComplete: () => void;
  onHoldingChange: (item: { label: string; emoji: string } | null) => void;
  onChangeCameraDisplayMode: (mode: CameraDisplayMode) => void;
}

export function CalibrationScreen({
  videoRef,
  tracking,
  settings,
  onStartCamera,
  onCalibrationComplete,
  onHoldingChange,
  onChangeCameraDisplayMode,
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

  // Auto-request camera on entering calibration screen
  useEffect(() => {
    if (tracking.status === 'idle') {
      onStartCamera();
    }
  }, [tracking.status, onStartCamera]);

  useEffect(() => {
    if (tracking.status === 'ready' && !calibrated) {
      speakPtBr(
        'Vamos treinar as mãos! Aponte para o amendoim gigante, faça pinça para pegar e solte dentro da mochila da Anya.',
        settings.narrationEnabled
      );
    }
  }, [tracking.status, calibrated, settings.narrationEnabled]);

  useEffect(() => {
    return () => onHoldingChange(null);
  }, [onHoldingChange]);

  // Process hand gesture collisions on calibration stage
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

    const isInside = (el: HTMLElement | null, pad = 16) => {
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
      const overPeanut = isInside(peanutRef.current, 24);
      const overBag = isInside(bagRef.current, 28);
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
            'Waku waku! Você dominou a pinça! Agora faça pinça no botão verde para ver as missões.',
            settings.narrationEnabled
          );
        }
      }
    } else {
      const overContinue = isInside(continueBtnRef.current, 16);
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
    <main className="mx-auto max-w-[960px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#57534E]">
            Etapa de Preparação · Somente a mão exibida na tela
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#14532D]">
            Treino de Mãos da Anya
          </h1>
        </div>

        {/* Camera Display Mode Toggle */}
        <div
          className="flex items-center gap-1 rounded-xl border border-[#D9CEB8] bg-[#F6EFE0] p-1"
          role="group"
          aria-label="Visibilidade da câmera"
        >
          <button
            type="button"
            onClick={() => onChangeCameraDisplayMode('hidden')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
              settings.cameraDisplayMode === 'hidden'
                ? 'bg-[#14532D] text-white'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>Câmera Oculta</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeCameraDisplayMode('hand_only')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
              settings.cameraDisplayMode === 'hand_only'
                ? 'bg-[#14532D] text-white'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Hand className="h-3.5 w-3.5" />
            <span>Só Mão</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeCameraDisplayMode('video')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer ${
              settings.cameraDisplayMode === 'video'
                ? 'bg-[#14532D] text-white'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Vídeo</span>
          </button>
        </div>
      </div>

      {/* Camera error or permission denied recovery */}
      {(tracking.status === 'permission_denied' || tracking.status === 'error') && (
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#DC2626]/30 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
            <Camera className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-[#1C1917]">
            Precisamos da sua webcam para jogar
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#57534E]">
            {tracking.errorMessage}
          </p>
          <div className="mt-6 rounded-2xl bg-[#F6EFE0] p-4 text-left text-xs leading-relaxed text-[#44403C]">
            <p className="font-semibold text-[#14532D]">Como liberar rapidamente:</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>Clique no ícone de câmera ou cadeado na barra de endereço do navegador.</li>
              <li>Selecione &ldquo;Permitir&rdquo; para o uso da Câmera.</li>
              <li>Clique no botão abaixo para ativar o rastreamento das mãos.</li>
            </ol>
          </div>
          <button
            type="button"
            onClick={() => onStartCamera()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1B6B3A] cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Tentar Ativar Câmera Novamente</span>
          </button>
        </div>
      )}

      {/* Loading MediaPipe model or requesting stream */}
      {(tracking.status === 'idle' ||
        tracking.status === 'loading_model' ||
        tracking.status === 'requesting_camera') && (
        <div className="mx-auto max-w-xl rounded-3xl border border-[#D9CEB8] bg-white p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7] text-[#14532D]">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-[#14532D]">
            {tracking.status === 'loading_model'
              ? 'Preparando o sensor de gestos MediaPipe...'
              : 'Abrindo a câmera...'}
          </h2>
          <p className="mt-2 text-sm text-[#57534E]">
            Quando o navegador pedir permissão de câmera, clique em &ldquo;Permitir&rdquo;
            para que possamos enxergar apenas sua mão.
          </p>
        </div>
      )}

      {/* Centered Active Calibration Playground */}
      {tracking.status === 'ready' && (
        <section className="mx-auto flex flex-col justify-between rounded-3xl border border-[#D9CEB8] bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#EFE7D4] pb-4">
            <div>
              <span className="text-xs font-semibold text-[#EC4899]">
                {calibrated ? 'Treino concluído!' : 'Passo 1 de 1 · Prática de Pinça'}
              </span>
              <h2 className="font-display text-2xl font-bold text-[#1C1917]">
                {calibrated
                  ? 'Waku waku! Suas mãos estão calibradas!'
                  : 'Pegue o amendoim com pinça e solte na mochila'}
              </h2>
            </div>
            {calibrated && <CheckCircle2 className="h-9 w-9 shrink-0 text-[#059669]" />}
          </div>

          {!calibrated ? (
            <div className="my-10 grid min-h-[300px] grid-cols-1 items-center gap-10 sm:grid-cols-2">
              {/* Draggable Giant Peanut */}
              <div className="flex flex-col items-center justify-center">
                <div
                  ref={peanutRef}
                  className={`flex h-48 w-48 flex-col items-center justify-center rounded-3xl border-4 transition-transform duration-150 ${
                    holdingPeanut
                      ? 'scale-90 border-dashed border-[#D9CEB8] bg-[#FFFBF2] opacity-40'
                      : hoveringPeanut
                        ? 'scale-105 border-[#EC4899] bg-[#FEF3C7] shadow-lg'
                        : 'animate-float-gentle border-[#F59E0B] bg-[#FEF3C7] shadow-sm'
                  }`}
                >
                  <span className="text-7xl leading-none">🥜</span>
                  <span className="mt-2 font-display text-base font-bold text-[#78350F]">
                    {holdingPeanut ? 'Segurando!' : 'Amendoim'}
                  </span>
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-[#57534E]">
                  1. Aponte aqui e junte polegar + indicador
                </p>
              </div>

              {/* Target Satchel */}
              <div className="flex flex-col items-center justify-center">
                <div
                  ref={bagRef}
                  className={`flex h-52 w-56 flex-col items-center justify-center rounded-3xl border-4 border-dashed transition-transform duration-150 ${
                    holdingPeanut && hoveringBag
                      ? 'scale-105 border-[#059669] bg-[#DCFCE7] shadow-lg'
                      : holdingPeanut
                        ? 'border-[#14532D] bg-[#F0FDF4]'
                        : 'border-[#14532D]/50 bg-[#F6EFE0]'
                  }`}
                >
                  <span className="text-7xl leading-none">🎒</span>
                  <span className="mt-2 font-display text-base font-bold text-[#14532D]">
                    Mochila da Anya
                  </span>
                  <span className="mt-0.5 text-xs text-[#57534E]">
                    {holdingPeanut && hoveringBag ? 'Solte a pinça agora!' : 'Solte o amendoim aqui'}
                  </span>
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-[#57534E]">
                  2. Leve até a mochila e abra os dedos
                </p>
              </div>
            </div>
          ) : (
            <div className="my-10 flex flex-col items-center justify-center text-center">
              <div className="animate-stella-pop flex h-28 w-28 items-center justify-center rounded-full bg-[#FEF9C3] text-6xl shadow-md">
                ⭐
              </div>
              <p className="mt-5 max-w-md text-base text-[#44403C]">
                Excelente! Agora você já sabe apontar e fazer pinça. Aponte e faça pinça
                no botão abaixo para escolher sua primeira missão!
              </p>

              <button
                ref={continueBtnRef}
                type="button"
                onClick={onCalibrationComplete}
                className={`mt-7 inline-flex items-center gap-3 rounded-2xl px-8 py-4 font-display text-lg font-bold text-white transition-transform duration-150 cursor-pointer ${
                  hoveringContinue
                    ? 'scale-105 bg-[#EC4899] ring-4 ring-[#FBCFE8] shadow-lg'
                    : 'bg-[#14532D] hover:bg-[#1B6B3A]'
                }`}
              >
                <span>Ir para o Mapa de Missões</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EFE7D4] pt-4 text-xs text-[#57534E]">
            <span>Levante sua mão aberta em frente à câmera — o vídeo fica oculto para evitar distrações.</span>
            <span className="font-mono font-semibold text-[#14532D] tabular-nums">
              {tracking.handDetected
                ? tracking.isPinching
                  ? 'Mão detectada · Pinça ativa'
                  : 'Mão detectada · Apontando'
                : 'Aguardando mão...'}
            </span>
          </div>
        </section>
      )}

      {/* Optional Floating Corner Preview (only rendered when user enables hand_only or video) */}
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
    </main>
  );
}
