import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DetectorMessage } from '@/src/components/tuner/PitchDetectorWebView';
import { frequencyToPitch, PitchInfo } from '@/src/utils/pitch';

export type PermissionState = 'undetermined' | 'granted' | 'denied';

export type TunerState = {
  permission: PermissionState;
  pitch: PitchInfo | null;
  level: number;
  ready: boolean;
  error: string | null;
  hasSignal: boolean;
};

const SMOOTHING = 0.45;
const SIGNAL_THRESHOLD = 0.015;
const HOLD_MS = 500;

export function useTuner(active: boolean) {
  const [state, setState] = useState<TunerState>({
    permission: 'undetermined',
    pitch: null,
    level: 0,
    ready: false,
    error: null,
    hasSignal: false,
  });

  const smoothFreqRef = useRef(0);
  const lastPitchAtRef = useRef(0);
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
    smoothFreqRef.current = 0;
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

  const handleMessage = useCallback((msg: DetectorMessage) => {
    if (msg.type === 'pitch') {
      const prev = smoothFreqRef.current;
      const next =
        prev > 0 ? prev * (1 - SMOOTHING) + msg.frequency * SMOOTHING : msg.frequency;
      smoothFreqRef.current = next;
      lastPitchAtRef.current = Date.now();

      const pitch = frequencyToPitch(next);
      setState((s) => ({
        ...s,
        pitch,
        level: msg.level,
        hasSignal: msg.level >= SIGNAL_THRESHOLD,
        ready: true,
      }));

      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current);
      }
      decayTimerRef.current = setTimeout(() => {
        setState((s) => ({ ...s, hasSignal: false }));
      }, HOLD_MS);
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
      setState((s) => ({ ...s, error: msg.error }));
    }
  }, []);

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
