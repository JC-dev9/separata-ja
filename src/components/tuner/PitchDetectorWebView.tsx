import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { buildDetectorHtml, DetectorMessage } from '@/src/components/tuner/detector-html';
import { GUITAR_MAX_HZ, GUITAR_MIN_HZ, searchRangeFor } from '@/src/utils/pitch';

export type { DetectorMessage };

type Props = {
  onMessage: (msg: DetectorMessage) => void;
  /**
   * Corda a afinar. Quando definida, a procura fica restrita à volta dela e
   * tudo o resto no ambiente é ignorado. `null` = modo cromático.
   */
  targetFrequency?: number | null;
};

export function PitchDetectorWebView({ onMessage, targetFrequency }: Props) {
  const webRef = useRef<WebView>(null);

  // O HTML é construído uma única vez: mudar a gama depois faz-se por
  // injeção, senão o WebView recarregava e pedia o microfone outra vez.
  const html = useMemo(() => buildDetectorHtml(GUITAR_MIN_HZ, GUITAR_MAX_HZ), []);

  const range = useMemo(() => searchRangeFor(targetFrequency), [targetFrequency]);

  const applyRange = useCallback(() => {
    webRef.current?.injectJavaScript(
      `window.__setRange && window.__setRange(${range.minHz},${range.maxHz}); true;`,
    );
  }, [range]);

  useEffect(() => {
    applyRange();
  }, [applyRange]);

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as DetectorMessage;
        onMessage(msg);
      } catch {
        /* ignore malformed payloads */
      }
    },
    [onMessage],
  );

  // `onPermissionRequest` só existe no Android e não consta dos tipos do
  // react-native-webview; sem ela o WebView nunca recebe áudio no Android.
  const androidOnlyProps = {
    onPermissionRequest: (event: any) => {
      const ne = event?.nativeEvent;
      if (ne && typeof ne.grant === 'function') {
        ne.grant(ne.resources ?? ['android.webkit.resource.AUDIO_CAPTURE']);
      }
    },
  } as Record<string, unknown>;

  return (
    <WebView
      ref={webRef}
      {...androidOnlyProps}
      source={{ html, baseUrl: 'https://localhost' }}
      style={styles.hidden}
      containerStyle={styles.hidden}
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      allowsInlineMediaPlayback
      allowsProtectedMedia
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      onMessage={handleMessage}
      // Garante que a gama actual é aplicada mesmo que a página só fique
      // pronta depois de o utilizador já ter escolhido uma corda.
      onLoadEnd={applyRange}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
    top: -1000,
    left: -1000,
    backgroundColor: 'transparent',
  },
});
