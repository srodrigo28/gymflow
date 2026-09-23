import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { getAdminMetrics, type AdminMetrics } from '@/src/services/admin';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';

// Só para administradores: o número que decide quando o app deixa de ser 100% grátis.
export default function AdminScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const token = session?.token;

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setMetrics(await getAdminMetrics(token));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  const total = metrics?.users.total ?? 0;
  const goal = metrics?.freeUntilUsers ?? 200;
  const progress = Math.min(1, total / goal);

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.accent.primary]}
            onRefresh={refresh}
            refreshing={isRefreshing}
            tintColor={theme.accent.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/home'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Painel
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {metrics ? (
          <>
            <View
              accessibilityLabel={`${total} de ${goal} cadastros.`}
              accessible
              style={styles.goalCard}>
              <Text style={styles.goalLabel}>Cadastros</Text>
              <View style={styles.goalRow}>
                <Text style={styles.goalValue}>{total}</Text>
                <Text style={styles.goalTotal}>de {goal}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.goalNote}>
                {total >= goal
                  ? `Meta dos ${goal} atingida. Hora de decidir as campanhas de valor simbólico (22-campanhas.md).`
                  : `Até ${goal} cadastros o app segue 100% grátis. Faltam ${goal - total}.`}
              </Text>
            </View>

            <View style={styles.grid}>
              <Metric label="novos na semana" value={metrics.users.newThisWeek} />
              <Metric label="ativos na semana" value={metrics.users.activeThisWeek} />
              <Metric label="treinos na semana" value={metrics.workouts.finishedThisWeek} />
            </View>

            <Text style={styles.footnote}>
              Ativo é quem abriu o app nos últimos 7 dias. Atualizado às{' '}
              {new Date(metrics.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })};
              puxe a tela para atualizar.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const styles = useStyles();

  return (
    <View accessibilityLabel={`${value} ${label}`} accessible style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 560,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
    flex: 1,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  goalCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  goalLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  goalRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  goalValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    lineHeight: 54,
  },
  goalTotal: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 18,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  goalNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  metricValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.75,
  },
}));
