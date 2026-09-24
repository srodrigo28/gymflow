import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { onWorkoutsRestored } from '@/src/services/sync';
import {
  getActiveSessionId,
  getDaysSinceMuscle,
  getPeriodSummary,
  listRecentSessions,
  startSession,
} from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { MuscleGroup, PeriodSummary, SessionSummary } from '@/src/types/training';
import { formatSessionDate, formatVolume, muscleLabel, startOfWeek } from '@/src/utils/format';

type MissingMuscle = { days: number; muscle: MuscleGroup };

// Grupos que esperamos ver na semana. O que passar de 7 dias vira aviso.
const trackedMuscles: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core'];

export default function TreinoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [week, setWeek] = useState<PeriodSummary | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [missing, setMissing] = useState<MissingMuscle[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const load = useCallback(async () => {
    const [active, summary, recent, sinceMuscle] = await Promise.all([
      getActiveSessionId(),
      getPeriodSummary(startOfWeek(), Date.now()),
      listRecentSessions(8),
      getDaysSinceMuscle(),
    ]);

    setActiveSessionId(active);
    setWeek(summary);
    setSessions(recent);

    const byMuscle = new Map(sinceMuscle.map((item) => [item.muscle, item.days]));
    setMissing(
      trackedMuscles
        .map((muscle) => ({ days: byMuscle.get(muscle) ?? Infinity, muscle }))
        .filter((item) => item.days > 7)
        .sort((a, b) => b.days - a.days),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Num aparelho novo, os treinos da conta podem chegar com a tela já aberta.
  useEffect(() => onWorkoutsRestored(() => void load()), [load]);

  async function handleStart() {
    setIsStarting(true);
    const id = await startSession();
    setIsStarting(false);
    router.push({ params: { id }, pathname: '/(app)/treino/sessao' });
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            Treino
          </Text>
          <Pressable
            accessibilityLabel="Compartilhar recorde ou resumo da semana"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/(app)/compartilhar')}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="share-social-outline" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="Ver histórico completo"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/(app)/treino/historico')}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="stats-chart" size={18} />
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel={activeSessionId ? 'Continuar treino em andamento' : 'Começar um treino agora'}
          accessibilityRole="button"
          disabled={isStarting}
          onPress={() =>
            activeSessionId
              ? router.push({ params: { id: activeSessionId }, pathname: '/(app)/treino/sessao' })
              : handleStart()
          }
          style={({ pressed }) => [styles.startCard, pressed ? styles.pressed : null]}>
          <View style={styles.startIcon}>
            <MaterialCommunityIcons
              color={theme.accent.onPrimary}
              name={activeSessionId ? 'play' : 'dumbbell'}
              size={26}
            />
          </View>
          <View style={styles.startText}>
            <Text style={styles.startTitle}>{activeSessionId ? 'Continuar treino' : 'Começar treino'}</Text>
            <Text style={styles.startSubtitle}>
              {activeSessionId ? 'Você tem um treino em andamento' : 'Registre série por série, mesmo sem internet'}
            </Text>
          </View>
          <Ionicons color={theme.text.secondary} name="chevron-forward" size={22} />
        </Pressable>

        <View style={styles.pills}>
          <SummaryPill label="Treinos" value={`${week?.sessionCount ?? 0}`} />
          <SummaryPill label="Volume" value={formatVolume(week?.volumeKg ?? 0)} />
          <SummaryPill label="Cardio" value={`${week?.cardioMinutes ?? 0} min`} />
        </View>
        <Text style={styles.pillsCaption}>Esta semana</Text>

        {missing.length ? (
          <View style={styles.missingCard}>
            <Text style={styles.sectionTitle}>O que está faltando</Text>
            <View style={styles.missingRow}>
              {missing.slice(0, 4).map((item) => (
                <View
                  key={item.muscle}
                  style={[styles.missingChip, { borderColor: withAlpha(theme.status.warning, 0.4) }]}>
                  <Text style={styles.missingName}>{muscleLabel(item.muscle)}</Text>
                  <Text style={[styles.missingDays, { color: theme.status.warning }]}>
                    {item.days === Infinity ? 'nunca' : `${item.days} dias`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Últimos treinos</Text>
        {sessions.length ? (
          sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionDate}>{formatSessionDate(session.startedAt)}</Text>
                {session.prCount ? (
                  <View style={[styles.prBadge, { backgroundColor: withAlpha(theme.domain.conquista, 0.18) }]}>
                    <Ionicons color={theme.domain.conquista} name="trophy" size={12} />
                    <Text style={[styles.prText, { color: theme.domain.conquista }]}>
                      {session.prCount} {session.prCount === 1 ? 'recorde' : 'recordes'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.sessionTitle}>
                {session.title
                  .split(' · ')
                  .map((muscle) => muscleLabel(muscle))
                  .join(' · ')}
              </Text>
              <Text style={styles.sessionMeta}>
                {session.exerciseCount} {session.exerciseCount === 1 ? 'exercício' : 'exercícios'} ·{' '}
                {session.setCount} {session.setCount === 1 ? 'série' : 'séries'} · {formatVolume(session.volumeKg)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Nenhum treino registrado ainda. O primeiro leva menos de um minuto para começar.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
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
  startCard: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
    padding: 16,
  },
  startIcon: {
    alignItems: 'center',
    backgroundColor: theme.accent.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  startText: {
    flex: 1,
    gap: 2,
  },
  startTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
  },
  startSubtitle: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  pills: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingVertical: 12,
  },
  pillValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  pillLabel: {
    ...typography.caption,
    color: theme.text.muted,
  },
  pillsCaption: {
    ...typography.caption,
    color: theme.text.muted,
    marginTop: -8,
    textAlign: 'center',
  },
  missingCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  missingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  missingChip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  missingName: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  missingDays: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  sessionCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  sessionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    ...typography.caption,
    color: theme.text.muted,
  },
  prBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  sessionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  sessionMeta: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
}));
