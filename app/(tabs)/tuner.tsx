import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { setAudioModeAsync } from 'expo-audio';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PitchDetectorWebView } from '@/src/components/tuner/PitchDetectorWebView';
import {
  CLOSE_THRESHOLD,
  IN_TUNE_THRESHOLD,
  TunerNeedle,
} from '@/src/components/tuner/TunerNeedle';
import { TunerStrings } from '@/src/components/tuner/TunerStrings';
import { useTuner } from '@/src/hooks/useTuner';
import { colors, radius, spacing } from '@/src/theme/colors';
import { STANDARD_GUITAR_TUNING } from '@/src/utils/pitch';

export default function TunerScreen() {
  const isFocused = useIsFocused();
  const tuner = useTuner(isFocused);
  const [selectedString, setSelectedString] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }).catch(() => {});
    return () => {
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => {});
    };
  }, [isFocused]);

  const selectedTarget = useMemo(
    () =>
      selectedString
        ? STANDARD_GUITAR_TUNING.find((s) => s.name === selectedString) ?? null
        : null,
    [selectedString],
  );

  const view = useMemo(() => {
    if (!tuner.pitch) {
      return {
        noteLabel: selectedTarget?.name ?? '—',
        frequencyLabel: selectedTarget
          ? `${selectedTarget.frequency.toFixed(1)} Hz`
          : '',
        cents: null as number | null,
        active: false,
      };
    }
    if (selectedTarget) {
      const cents = Math.round(
        1200 * Math.log2(tuner.pitch.frequency / selectedTarget.frequency),
      );
      return {
        noteLabel: selectedTarget.name,
        frequencyLabel: `${tuner.pitch.frequency.toFixed(1)} Hz`,
        cents,
        active: tuner.hasSignal,
      };
    }
    return {
      noteLabel: tuner.pitch.fullName,
      frequencyLabel: `${tuner.pitch.frequency.toFixed(1)} Hz`,
      cents: tuner.pitch.cents,
      active: tuner.hasSignal,
    };
  }, [tuner.pitch, tuner.hasSignal, selectedTarget]);

  const status = describeStatus(tuner, view.cents, view.active);

  const noteColor =
    view.active && view.cents != null
      ? Math.abs(view.cents) <= IN_TUNE_THRESHOLD
        ? colors.inTune
        : Math.abs(view.cents) <= CLOSE_THRESHOLD
          ? colors.text
          : colors.text
      : colors.textDim;

  if (tuner.permission === 'denied') {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="mic-off-outline" size={36} color={colors.textDim} />
          <Text style={styles.deniedTitle}>Microfone bloqueado</Text>
          <Text style={styles.deniedHint}>
            Para usar o afinador, permite o acesso ao microfone nas definições
            do sistema.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.settingsBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsBtnText}>Abrir definições</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => tuner.requestPermission()}
          >
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.body}>
        <View style={styles.modeRow}>
          <ModeChip
            label="Cromático"
            active={selectedString == null}
            onPress={() => setSelectedString(null)}
          />
          <ModeChip
            label="Por corda"
            active={selectedString != null}
            onPress={() => setSelectedString('E2')}
          />
        </View>

        <View style={styles.display}>
          <Text
            style={[styles.note, { color: noteColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {view.noteLabel}
          </Text>
          <Text style={styles.frequency}>
            {view.frequencyLabel || ' '}
          </Text>
          {view.active && view.cents != null ? (
            <Text
              style={[
                styles.centsLabel,
                Math.abs(view.cents) <= IN_TUNE_THRESHOLD && {
                  color: colors.inTune,
                },
              ]}
            >
              {view.cents > 0 ? `+${view.cents}` : view.cents} cents
            </Text>
          ) : (
            <Text style={styles.centsLabel}> </Text>
          )}
        </View>

        <TunerNeedle cents={view.active ? view.cents : null} active={view.active} />

        <TunerStrings
          activeStringName={
            view.active && tuner.pitch ? tuner.pitch.closestString.name : null
          }
          selectedStringName={selectedString}
          onSelectString={setSelectedString}
        />

        <Text style={styles.status}>{status}</Text>
      </View>

      {isFocused && tuner.permission === 'granted' ? (
        <PitchDetectorWebView onMessage={tuner.handleMessage} />
      ) : null}
    </SafeAreaView>
  );
}

function describeStatus(
  tuner: ReturnType<typeof useTuner>,
  cents: number | null,
  active: boolean,
): string {
  if (tuner.error) return tuner.error;
  if (tuner.permission === 'undetermined') return 'A pedir permissão…';
  if (!tuner.ready) return 'A iniciar microfone…';
  if (!active) return 'Toca uma corda';
  if (cents == null) return ' ';
  const abs = Math.abs(cents);
  if (abs <= IN_TUNE_THRESHOLD) return 'Afinada';
  if (cents < 0) return abs > CLOSE_THRESHOLD ? 'Muito grave' : 'Grave';
  return abs > CLOSE_THRESHOLD ? 'Muito aguda' : 'Aguda';
}

interface ModeChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModeChip({ label, active, onPress }: ModeChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.text,
  },
  display: {
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 140,
    justifyContent: 'center',
  },
  note: {
    fontSize: 96,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  frequency: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  centsLabel: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
    height: 18,
  },
  status: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  deniedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  deniedHint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  settingsBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  settingsBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  retryBtn: {
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
