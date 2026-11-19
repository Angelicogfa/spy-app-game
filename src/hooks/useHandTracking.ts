import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { AccessibilitySettings, HandTrackingState, NormalizedLandmark } from '../types/game';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const INITIAL_STATE: HandTrackingState = {
  status: 'idle',
  errorMessage: null,
  handDetected: false,
  cursorX: 0,
  cursorY: 0,
  normX: 0.5,
  normY: 0.5,
  isPinching: false,
  pinchDistance: 1,
  landmarks: null,
  fps: 0,
};

export interface UseHandTrackingReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: HandTrackingState;
  stateRef: React.RefObject<HandTrackingState>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useHandTracking(settings: AccessibilitySettings): UseHandTrackingReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const settingsRef = useRef<AccessibilitySettings>(settings);

  const smoothPosRef = useRef<{ x: number; y: number; initialized: boolean }>({
    x: 0.5,
    y: 0.5,
    initialized: false,
  });
  const isPinchingRef = useRef<boolean>(false);
  const lastVideoTimeRef = useRef<number>(-1);
  const frameCounterRef = useRef<{ count: number; lastTs: number; fps: number }>({
    count: 0,
    lastTs: performance.now(),
    fps: 0,
  });

  const [state, setState] = useState<HandTrackingState>(INITIAL_STATE);
  const stateRef = useRef<HandTrackingState>(INITIAL_STATE);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const updateState = useCallback((next: HandTrackingState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    smoothPosRef.current.initialized = false;
    isPinchingRef.current = false;
    updateState({ ...INITIAL_STATE, status: 'idle' });
  }, [updateState]);

  const runDetectionLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !landmarker || !streamRef.current) {
        return;
      }

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const now = performance.now();

        frameCounterRef.current.count += 1;
        if (now - frameCounterRef.current.lastTs >= 1000) {
          frameCounterRef.current.fps = frameCounterRef.current.count;
          frameCounterRef.current.count = 0;
          frameCounterRef.current.lastTs = now;
        }

        try {
          const result = landmarker.detectForVideo(video, now);
          const hand = result.landmarks && result.landmarks.length > 0 ? result.landmarks[0] : null;

          if (hand && hand.length >= 21) {
            const thumbTip = hand[4];
            const indexTip = hand[8];
            const wrist = hand[0];
            const middleMcp = hand[9];

            // Mirror X so hand movement matches screen like a mirror
            // Map active inner camera box (0.12..0.88) to full viewport (0..1) so children can reach edges comfortably!
            const rawMirrorX = 1 - indexTip.x;
            const rawY = indexTip.y;
            const mappedX = Math.min(1, Math.max(0, (rawMirrorX - 0.12) / 0.76));
            const mappedY = Math.min(1, Math.max(0, (rawY - 0.1) / 0.8));

            const alpha = settingsRef.current.smoothingFactor;
            if (!smoothPosRef.current.initialized) {
              smoothPosRef.current.x = mappedX;
              smoothPosRef.current.y = mappedY;
              smoothPosRef.current.initialized = true;
            } else {
              smoothPosRef.current.x += (mappedX - smoothPosRef.current.x) * alpha;
              smoothPosRef.current.y += (mappedY - smoothPosRef.current.y) * alpha;
            }

            // Palm-normalized pinch distance so distance from webcam doesn't break pinch
            const palmScale = Math.max(
              Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y),
              0.08
            );
            const rawPinchDist = Math.hypot(
              thumbTip.x - indexTip.x,
              thumbTip.y - indexTip.y
            );
            const normalizedPinch = rawPinchDist / palmScale;

            const startThreshold = settingsRef.current.pinchThreshold;
            const releaseThreshold = startThreshold + 0.13; // Hysteresis prevents accidental drops

            if (!isPinchingRef.current && normalizedPinch < startThreshold) {
              isPinchingRef.current = true;
            } else if (isPinchingRef.current && normalizedPinch > releaseThreshold) {
              isPinchingRef.current = false;
            }

            const mirroredLandmarks: NormalizedLandmark[] = hand.map((lm) => ({
              x: 1 - lm.x,
              y: lm.y,
              z: lm.z,
            }));

            updateState({
              status: 'ready',
              errorMessage: null,
              handDetected: true,
              normX: smoothPosRef.current.x,
              normY: smoothPosRef.current.y,
              cursorX: smoothPosRef.current.x * window.innerWidth,
              cursorY: smoothPosRef.current.y * window.innerHeight,
              isPinching: isPinchingRef.current,
              pinchDistance: normalizedPinch,
              landmarks: mirroredLandmarks,
              fps: frameCounterRef.current.fps,
            });
          } else {
            isPinchingRef.current = false;
            if (stateRef.current.handDetected || stateRef.current.status !== 'ready') {
              updateState({
                ...stateRef.current,
                status: 'ready',
                errorMessage: null,
                handDetected: false,
                isPinching: false,
                landmarks: null,
                fps: frameCounterRef.current.fps,
              });
            }
          }
        } catch {
          // Ignore transient frame inference errors
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [updateState]);

  const startCamera = useCallback(async () => {
    if (streamRef.current && stateRef.current.status === 'ready') {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateState({
        ...INITIAL_STATE,
        status: 'error',
        errorMessage:
          'Este navegador não oferece suporte à câmera. Use Chrome, Edge ou Safari atualizado em conexão segura.',
      });
      return;
    }

    try {
      // 1. Load MediaPipe HandLandmarker model (cached after first load)
      if (!landmarkerRef.current) {
        updateState({
          ...INITIAL_STATE,
          status: 'loading_model',
        });

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        try {
          landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        } catch {
          // Graceful fallback to CPU delegate if WebGL/GPU delegate is unavailable
          landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        }
      }

      // 2. Request Webcam stream
      updateState({
        ...INITIAL_STATE,
        status: 'requesting_camera',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error('Elemento de vídeo não encontrado.');
      }

      video.srcObject = stream;
      await video.play();

      updateState({
        ...INITIAL_STATE,
        status: 'ready',
      });

      runDetectionLoop();
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      if (
        errorObj?.name === 'NotAllowedError' ||
        errorObj?.name === 'PermissionDeniedError'
      ) {
        updateState({
          ...INITIAL_STATE,
          status: 'permission_denied',
          errorMessage:
            'A permissão da câmera foi recusada. Libere o acesso à webcam no cadeado da barra do navegador e clique em tentar novamente.',
        });
      } else if (errorObj?.name === 'NotFoundError') {
        updateState({
          ...INITIAL_STATE,
          status: 'error',
          errorMessage:
            'Nenhuma webcam foi encontrada neste dispositivo. Conecte uma câmera para jogar com gestos das mãos.',
        });
      } else {
        updateState({
          ...INITIAL_STATE,
          status: 'error',
          errorMessage:
            errorObj?.message ||
            'Não foi possível iniciar o rastreamento das mãos. Verifique a câmera e tente novamente.',
        });
      }
    }
  }, [runDetectionLoop, updateState]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    state,
    stateRef,
    startCamera,
    stopCamera,
  };
}
