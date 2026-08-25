import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme/colors';

const MARK = require('../../assets/images/splash-icon.png');
const LOGO = require('../../assets/images/splash-logo.png');

// Geometria medida nos próprios ficheiros — é o que permite a marca aterrar
// exactamente por cima da marca da logo completa em vez de "saltar" para lá.
const MARK_BOX = 200; // igual a `imageWidth` do expo-splash-screen em app.json
const MARK_FILL = 840 / 1024; // altura desenhada dentro de splash-icon.png
const LOGO_ASPECT = 1732 / 430; // splash-logo.png
const LOGO_MARK_FILL = 430 / 1732; // altura da marca ÷ largura da logo completa
const LOGO_MARK_CENTER = 186 / 1732; // a marca ocupa as colunas 0–372 de 1732

const HOLD_MS = 150; // continua o splash nativo antes de mexer
const MORPH_MS = 900; // a marca encolhe com calma para o sítio dela na logo completa
const SETTLE_MS = 900; // logo completa parada, a dar tempo a ler o nome
const OUT_MS = 340;

const OUT_DELAY = HOLD_MS + MORPH_MS + SETTLE_MS;

// O cross-fade fica para o fim do morph: assim vê-se a marca a viajar inteira
// e a troca acontece já com as duas alinhadas, sem imagem dupla pelo caminho.
const MARK_FADE = [0.6, 0.95] as const;
const LOGO_FADE = [0.55, 0.95] as const;

interface Props {
  /** Chamado quando a animação acaba — o overlay já não é preciso. */
  onFinish: () => void;
}

/**
 * Pega no splash nativo (só a marca) e resolve-o na logo completa com o nome,
 * antes de dissolver na app.
 *
 * No Android 12+ o ecrã nativo é desenhado pela SplashScreen API, que impõe o
 * seu próprio tamanho de ícone e ignora o `imageWidth`; aí o arranque da
 * animação não encaixa ao pixel, mas o cross-fade disfarça a diferença.
 */
export function AnimatedSplash({ onFinish }: Props) {
  const { width } = useWindowDimensions();

  const logoWidth = Math.min(300, width * 0.72);
  const markScale = (logoWidth * LOGO_MARK_FILL) / (MARK_BOX * MARK_FILL);
  const markShift = (LOGO_MARK_CENTER - 0.5) * logoWidth;

  const progress = useSharedValue(0); // 0 = marca sozinha, 1 = logo completa
  const fade = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      HOLD_MS,
      withTiming(1, { duration: MORPH_MS, easing: Easing.inOut(Easing.cubic) }),
    );
    fade.value = withDelay(
      OUT_DELAY,
      withTiming(0, { duration: OUT_MS, easing: Easing.out(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, [progress, fade, onFinish]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  // A marca encolhe e desliza até coincidir com a marca da logo completa,
  // desaparecendo só no fim do percurso.
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, MARK_FADE, [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: markShift * progress.value },
      { scale: 1 - (1 - markScale) * progress.value },
    ],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, LOGO_FADE, [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      // Engole os toques: por baixo já está a lista de músicas e um toque às
      // cegas durante o splash abriria a música errada.
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
    >
      <Animated.View style={[styles.mark, markStyle]}>
        <Image source={MARK} style={styles.markImage} contentFit="contain" />
      </Animated.View>
      <Animated.View style={logoStyle}>
        <Image
          source={LOGO}
          style={{ width: logoWidth, height: logoWidth / LOGO_ASPECT }}
          contentFit="contain"
          accessibilityLabel="Separata JA"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Absoluto para as duas camadas ficarem sobrepostas no centro do ecrã.
  mark: {
    position: 'absolute',
  },
  markImage: {
    width: MARK_BOX,
    height: MARK_BOX,
  },
});
