import { Ionicons } from '@expo/vector-icons';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/theme/colors';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Última linha de defesa: apanha erros de render em toda a árvore e mostra um
 * ecrã de recuperação em vez do ecrã branco/crash nativo.
 *
 * Em dev mostramos a stack para depurar; em produção só a mensagem, porque a
 * stack não ajuda o utilizador e pode expor detalhes internos.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sem serviço de crash reporting ligado: em dev deixamos rasto na consola.
    // Quando houver Sentry/Bugsnag, é aqui que se reporta.
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.title}>Algo correu mal</Text>
          <Text style={styles.hint}>
            Ocorreu um erro inesperado. Podes tentar continuar — se o problema
            persistir, fecha e volta a abrir a aplicação.
          </Text>

          {__DEV__ ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugText} selectable>
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ''}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            onPress={this.reset}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  debugBox: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  debugText: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
