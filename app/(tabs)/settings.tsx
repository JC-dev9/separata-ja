import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InstrumentToggle } from '@/src/components/settings/InstrumentToggle';
import { SettingsRow } from '@/src/components/settings/SettingsRow';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { resetSettings } from '@/src/hooks/resetSettings';
import { useChordDictionaryCollapsed } from '@/src/hooks/useChordDictionaryCollapsed';
import { useDefaultInstrument } from '@/src/hooks/useDefaultInstrument';
import { clearAllFavorites, useFavorites } from '@/src/hooks/useFavorites';
import { MAX_FONT, MIN_FONT, useFontSize } from '@/src/hooks/useFontSize';
import { clearAllOverrides, useOverrideCount } from '@/src/hooks/useSongOverride';
import { colors, radius, spacing } from '@/src/theme/colors';

const PREVIEW = 'O Senhor é o meu pastor, nada me faltará.';
const VERSION = Constants.expoConfig?.version ?? '—';

type UpdateStatus = 'idle' | 'checking' | 'downloading';

export default function SettingsScreen() {
  const { fontSize, setFontSize } = useFontSize();
  const { collapsed, setCollapsed } = useChordDictionaryCollapsed();
  const { instrument, setInstrument } = useDefaultInstrument();
  const { favorites } = useFavorites();
  const overrideCount = useOverrideCount();

  // O valor da preferência só muda no fim do gesto; durante o arrasto quem manda
  // é este estado, para não gravarmos no disco a cada frame do dedo.
  const [draftFontSize, setDraftFontSize] = useState<number | null>(null);
  const shownFontSize = draftFontSize ?? fontSize;

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  /**
   * Confirma, executa, e diz o que aconteceu.
   *
   * Uma limpeza falhada é o caso em que ficar calado é pior: em memória o ecrã
   * já mostra tudo vazio, mas o disco não mudou e o arranque seguinte traz os
   * dados de volta. O utilizador tem de saber disso agora.
   */
  const confirmClear = useCallback(
    (title: string, message: string, action: () => Promise<boolean>, done: string) => {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            action().then((ok) => {
              if (ok) return showToast(done);
              Alert.alert(
                'Não foi possível apagar',
                'Os dados continuam guardados no dispositivo e vão reaparecer quando voltares a abrir a aplicação.',
              );
            });
          },
        },
      ]);
    },
    [showToast],
  );

  const onClearOverrides = useCallback(
    () =>
      confirmClear(
        'Apagar edições?',
        `As tuas alterações a ${overrideCount === 1 ? '1 música' : `${overrideCount} músicas`} são descartadas e o texto original volta. Não há como desfazer.`,
        clearAllOverrides,
        'Edições apagadas.',
      ),
    [confirmClear, overrideCount],
  );

  const onClearFavorites = useCallback(
    () =>
      confirmClear(
        'Limpar favoritos?',
        'A tua lista de favoritos fica vazia. Não há como desfazer.',
        clearAllFavorites,
        'Favoritos apagados.',
      ),
    [confirmClear],
  );

  const onResetSettings = useCallback(() => {
    Alert.alert(
      'Repor definições?',
      'O tamanho do texto, o instrumento e o dicionário de acordes voltam aos valores originais. Os teus favoritos e edições não são afectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Repor',
          style: 'destructive',
          onPress: () => {
            resetSettings().then((ok) => {
              setDraftFontSize(null);
              if (ok) return showToast('Definições repostas.');
              Alert.alert(
                'Não foi possível repor',
                'As definições vão voltar aos valores anteriores quando abrires a aplicação de novo.',
              );
            });
          },
        },
      ],
    );
  }, [showToast]);

  // A única chamada de rede da aplicação. Fora de uma build com EAS Update
  // configurado, `Updates.isEnabled` é falso e `checkForUpdateAsync` lança — por
  // isso a linha nem chega a ser tocável.
  const onCheckUpdates = useCallback(() => {
    if (status !== 'idle') return;
    setStatus('checking');
    Updates.checkForUpdateAsync()
      .then((result) => {
        if (!result.isAvailable) {
          Alert.alert('Estás actualizado', 'Já tens a versão mais recente.');
          return;
        }
        setStatus('downloading');
        return Updates.fetchUpdateAsync().then(() => {
          Alert.alert('Actualização pronta', 'Queres reiniciar agora para a aplicar?', [
            { text: 'Mais tarde', style: 'cancel' },
            { text: 'Reiniciar', onPress: () => void Updates.reloadAsync() },
          ]);
        });
      })
      .catch(() => {
        Alert.alert(
          'Não foi possível verificar',
          'Confirma a ligação à internet e tenta de novo.',
        );
      })
      .finally(() => setStatus('idle'));
  }, [status]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection title="Leitura">
          <View style={styles.fontBlock}>
            <View style={styles.fontHeader}>
              <Text style={styles.fontLabel}>Tamanho do texto</Text>
              <Text style={styles.fontValue}>{shownFontSize}</Text>
            </View>
            <Slider
              accessibilityLabel="Tamanho do texto das músicas"
              minimumValue={MIN_FONT}
              maximumValue={MAX_FONT}
              step={1}
              value={fontSize}
              onValueChange={setDraftFontSize}
              onSlidingComplete={(value) => {
                setFontSize(value);
                setDraftFontSize(null);
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={[styles.preview, { fontSize: shownFontSize }]}>{PREVIEW}</Text>
          </View>

          <SettingsRow
            icon="musical-notes-outline"
            label="Instrumento"
            description="Em que instrumento os acordes abrem"
            right={<InstrumentToggle value={instrument} onChange={setInstrument} />}
          />

          <SettingsRow
            icon="grid-outline"
            label="Dicionário recolhido"
            description="Também podes recolhê-lo dentro de qualquer música — é a mesma definição."
            right={
              <Switch
                value={collapsed}
                onValueChange={setCollapsed}
                accessibilityLabel="Abrir as músicas com o dicionário de acordes recolhido"
                trackColor={{ false: colors.border, true: colors.primaryDim }}
                thumbColor={collapsed ? colors.primary : colors.textMuted}
              />
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Gestão de dados"
          footer="Nada disto sai do teu telemóvel — apagar aqui apaga mesmo."
        >
          <SettingsRow
            icon="create-outline"
            label="Apagar edições de músicas"
            description={
              overrideCount === 0
                ? 'Nenhuma música editada'
                : overrideCount === 1
                  ? '1 música editada'
                  : `${overrideCount} músicas editadas`
            }
            onPress={onClearOverrides}
            disabled={overrideCount === 0}
            destructive
          />
          <SettingsRow
            icon="heart-outline"
            label="Limpar favoritos"
            description={
              favorites.size === 0
                ? 'Nenhum favorito'
                : favorites.size === 1
                  ? '1 favorito'
                  : `${favorites.size} favoritos`
            }
            onPress={onClearFavorites}
            disabled={favorites.size === 0}
            destructive
          />
          <SettingsRow
            icon="refresh-outline"
            label="Repor definições"
            description="Não afecta favoritos nem edições"
            onPress={onResetSettings}
            destructive
          />
        </SettingsSection>

        <SettingsSection title="Sobre">
          <SettingsRow icon="information-circle-outline" label="Versão" value={VERSION} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Política de privacidade"
            onPress={() => router.push('/privacy')}
          />
          <SettingsRow
            icon="cloud-download-outline"
            label="Procurar actualizações"
            description={Updates.isEnabled ? undefined : 'Indisponível em desenvolvimento'}
            disabled={!Updates.isEnabled || status !== 'idle'}
            onPress={onCheckUpdates}
            right={
              status === 'idle' ? undefined : (
                <ActivityIndicator size="small" color={colors.primary} />
              )
            }
          />
        </SettingsSection>

        {toast ? (
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  fontBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fontHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fontLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  fontValue: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  // Sem lineHeight fixo: o entrelinhamento tem de crescer com o tamanho escolhido,
  // senão a pré-visualização mente sobre como a música vai ficar.
  preview: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  toast: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  toastText: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
});
