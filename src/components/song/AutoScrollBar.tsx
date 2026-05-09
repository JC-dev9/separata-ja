import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  visible: boolean;
  playing: boolean;
  speed: number;
  bottomOffset: number;
  onTogglePlay: () => void;
  onSpeedChange: (v: number) => void;
  onClose: () => void;
}

export function AutoScrollBar({
  visible,
  playing,
  speed,
  bottomOffset,
  onTogglePlay,
  onSpeedChange,
  onClose,
}: Props) {
  const translateY = useSharedValue(120);

  useEffect(() => {
    if (visible) {
      translateY.value = 120;
      translateY.value = withTiming(0, { duration: 250 });
    } else {
      translateY.value = 120;
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrap, { bottom: bottomOffset }, animatedStyle]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        <Pressable
          onPress={onTogglePlay}
          style={({ pressed }) => [
            styles.playBtn,
            playing && styles.playBtnActive,
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={20}
            color={playing ? colors.background : colors.text}
          />
        </Pressable>

        <View style={styles.sliderWrap}>
          <MaterialCommunityIcons
            name="tortoise"
            size={20}
            color={speed < 0.25 ? colors.primary : colors.textMuted}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={speed}
            onValueChange={onSpeedChange}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <MaterialCommunityIcons
            name="rabbit"
            size={20}
            color={speed > 0.75 ? colors.primary : colors.textMuted}
          />
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    width: '100%',
    maxWidth: 460,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: colors.primary,
  },
  sliderWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
