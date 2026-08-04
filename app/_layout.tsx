import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/src/components/AnimatedSplash';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { loadSongs } from '@/src/data/songs';
import { hydrateFavorites } from '@/src/hooks/useFavorites';
import { colors } from '@/src/theme/colors';

// Warm caches off the critical render path.
loadSongs();
hydrateFavorites();

// O splash nativo fica de pé até a primeira renderização estar feita; a partir
// daí é o `AnimatedSplash` que segura a logo. Sem fade nativo para a troca
// entre os dois não dar salto.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false });

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  // A árvore já tem pixels no ecrã: podemos largar o splash nativo sem que
  // apareça um fundo em branco por baixo.
  const onLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
        <BottomSheetModalProvider>
          <ThemeProvider value={navTheme}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="song/[id]" options={{ title: '' }} />
              <Stack.Screen name="privacy" options={{ title: 'Privacidade' }} />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </BottomSheetModalProvider>
        {!splashDone && <AnimatedSplash onFinish={onSplashFinish} />}
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
