import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  cents: number | null;
  active: boolean;
}

const RANGE_CENTS = 50;
const TRACK_HEIGHT = 4;
const INDICATOR_SIZE = 22;
const TICK_VALUES = [-50, -25, 0, 25, 50];

export const IN_TUNE_THRESHOLD = 5;
export const CLOSE_THRESHOLD = 15;

export function TunerNeedle({ cents, active }: Props) {
  const translate = useSharedValue(0);
  const opacity = useSharedValue(0);

  const clamped = cents == null ? 0 : Math.max(-RANGE_CENTS, Math.min(RANGE_CENTS, cents));
  const ratio = clamped / RANGE_CENTS;

  useEffect(() => {
    translate.value = withSpring(ratio, {
      damping: 18,
      stiffness: 140,
      mass: 0.6,
    });
  }, [ratio, translate]);

  useEffect(() => {
    opacity.value = withTiming(active && cents != null ? 1 : 0.25, {
      duration: 180,
    });
  }, [active, cents, opacity]);

  const indicatorColor = active && cents != null
    ? Math.abs(cents) <= IN_TUNE_THRESHOLD
      ? colors.inTune
      : Math.abs(cents) <= CLOSE_THRESHOLD
        ? colors.primary
        : colors.danger
    : colors.textDim;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translate.value * (TRACK_WIDTH / 2 - INDICATOR_SIZE / 2) },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.trackRow}>
        <View style={styles.track}>
          {TICK_VALUES.map((v) => (
            <View
              key={v}
              style={[
                styles.tick,
                v === 0 && styles.tickCenter,
                { left: `${((v + RANGE_CENTS) / (RANGE_CENTS * 2)) * 100}%` },
              ]}
            />
          ))}
          <View style={styles.zeroMarker} pointerEvents="none" />
          <Animated.View
            style={[
              styles.indicator,
              { backgroundColor: indicatorColor },
              indicatorStyle,
            ]}
          />
        </View>
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>−50</Text>
        <Text style={styles.scaleLabel}>0</Text>
        <Text style={styles.scaleLabel}>+50</Text>
      </View>
    </View>
  );
}

const TRACK_WIDTH = 280;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackRow: {
    width: TRACK_WIDTH,
    height: INDICATOR_SIZE + 8,
    justifyContent: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tick: {
    position: 'absolute',
    top: -6,
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    transform: [{ translateX: -0.5 }],
  },
  tickCenter: {
    height: 22,
    top: -9,
    width: 2,
    backgroundColor: colors.textMuted,
    transform: [{ translateX: -1 }],
  },
  zeroMarker: {
    position: 'absolute',
    left: '50%',
    top: -INDICATOR_SIZE / 2 - 2,
    width: INDICATOR_SIZE + 4,
    height: INDICATOR_SIZE + 4,
    marginLeft: -(INDICATOR_SIZE + 4) / 2,
    borderRadius: (INDICATOR_SIZE + 4) / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    top: -INDICATOR_SIZE / 2 + TRACK_HEIGHT / 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  scaleRow: {
    width: TRACK_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
