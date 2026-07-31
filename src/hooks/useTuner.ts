import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DetectorMessage } from '@/src/components/tuner/PitchDetectorWebView';
import { frequencyToPitch, PitchInfo } from '@/src/utils/pitch';
import { createStabilityGate } from '@/src/utils/pitch-stability';

export type PermissionState = 'undetermined' | 'granted' | 'denied';

export type DetectorErrorCode =
  | 'denied'
  | 'no-device'
  | 'busy'
  | 'unsupported'
  | 'detector-broken'
  | 'unknown';

export type TunerState = {
  permission: PermissionState;
  pitch: PitchInfo | null;
  level: number;
  ready: boolean;
  error: string | null;
  errorCode: DetectorErrorCode | null;
  hasSignal: boolean;
};

/**
 * Leituras do YIN abaixo desta confiança são descartadas.
 * Uma corda dedilhada dá tipicamente >0.9; a voz costuma ficar abaixo.
 */
const MIN_CONFIDENCE = 0.68;

/** Sem leituras aceites durante este tempo, o mostrador apaga-se. */
const HOLD_MS = 600;

export function useTuner(active: boolean) {
  const [state, setState] = useState<TunerState>({
    permission: 'undetermined',
    pitch: null,
    level: 0,
    ready: false,
    error: null,
    errorCode: null,
    hasSignal: false,
  });

  const gateRef = useRef(createStabilityGate());
  const decayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const current = await getRecordingPermissionsAsync();
        if (cancelled) return;
        if (current.granted) {
          setState((s) => ({ ...s, permission: 'granted' }));
          return;
        }
        const next = await requestRecordingPermissionsAsync();
        if (cancelled) return;
        setState((s) => ({
          ...s,
          permission: next.granted ? 'granted' : 'denied',
        }));
      } catch {
        if (!cancelled) setState((s) => ({ ...s, permission: 'denied' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (active) return;
    gateRef.current.reset();
    if (decayTimerRef.current) {
      clearTimeout(decayTimerRef.current);
      decayTimerRef.current = null;
    }
    setState((s) => ({ ...s, pitch: null, level: 0, hasSignal: false }));
  }, [active]);

  useEffect(() => {
    return () => {
      if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
    };
  }, []);

  const clearPitch = useCallback(() => {
    gateRef.current.reset();
    setState((s) => (s.pitch == null && !s.hasSignal ? s : { ...s, pitch: null, hasSignal: false }));
  }, []);

  const handleMessage = useCallback(
    (msg: DetectorMessage) => {
      if (msg.type === 'pitch') {
        // O YIN já rejeitou o que não é periódico; esta é a segunda porta,
        // para leituras periódicas mas fracas.
        if (msg.confidence < MIN_CONFIDENCE) {
          setState((s) => ({ ...s, level: msg.level, ready: true }));
          return;
        }

        // Só mostramos quando várias leituras seguidas concordam entre si:
        // é isso que separa uma corda a soar de uma sílaba falada.
        const stable = gateRef.current.push(msg.frequency);

        if (stable != null) {
          setState((s) => ({
            ...s,
            pitch: frequencyToPitch(stable),
            level: msg.level,
            hasSignal: true,
            ready: true,
          }));
        } else {
          setState((s) => ({ ...s, level: msg.level, ready: true }));
        }

        if (decayTimerRef.current) clearTimeout(decayTimerRef.current);
        // Nunca deixamos uma leitura velha no ecrã: é pior o utilizador achar
        // que está afinado com um valor obsoleto do que não ver nada.
        decayTimerRef.current = setTimeout(clearPitch, HOLD_MS);
        return;
      }

      if (msg.type === 'silence') {
        setState((s) => ({ ...s, level: msg.level }));
        return;
      }

      if (msg.type === 'ready') {
        setState((s) => ({ ...s, ready: true }));
        return;
      }

      if (msg.type === 'error') {
        setState((s) => ({ ...s, error: msg.error, errorCode: msg.code as DetectorErrorCode }));
      }
    },
    [clearPitch],
  );

  const requestPermission = useCallback(async () => {
    const next = await requestRecordingPermissionsAsync();
    setState((s) => ({
      ...s,
      permission: next.granted ? 'granted' : 'denied',
    }));
    return next.granted;
  }, []);

  return { ...state, handleMessage, requestPermission };
}
