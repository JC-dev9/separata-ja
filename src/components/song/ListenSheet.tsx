import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Linking from 'expo-linking';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  songTitle: string;
}

export interface ListenSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const ListenSheet = forwardRef<ListenSheetHandle, Props>(function ListenSheet(
  { songTitle },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const searchUri = useMemo(
    () => `https://m.youtube.com/results?search_query=${encodeURIComponent(songTitle)}`,
    [songTitle],
  );

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  // Block YouTube's attempts to escape the WebView and open the native app.
  const onShouldStartLoadWithRequest = useCallback((req: WebViewNavigation) => {
    const url = req.url || '';
    if (
      url.startsWith('vnd.youtube://') ||
      url.startsWith('vnd.youtube:') ||
      url.startsWith('intent://') ||
      url.startsWith('youtube://')
    ) {
      return false;
    }
    return true;
  }, []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['90%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="logo-youtube" size={20} color="#FF0033" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Ouvir música</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {songTitle}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => Linking.openURL(searchUri)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir no YouTube"
          style={styles.headerBtn}
        >
          <Ionicons name="open-outline" size={18} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => webRef.current?.reload()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Recarregar"
          style={styles.headerBtn}
        >
          <Ionicons name="refresh" size={18} color={colors.text} />
        </Pressable>
      </BottomSheetView>

      <View style={styles.webWrap}>
        <WebView
          ref={webRef}
          source={{ uri: searchUri }}
          style={styles.web}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          setSupportMultipleWindows={false}
          userAgent="Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
        />
        {loading ? (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface },
  handle: { backgroundColor: colors.border, width: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  web: { flex: 1, backgroundColor: '#fff' },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
