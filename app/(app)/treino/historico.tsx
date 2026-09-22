import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { getPeriodSummary } from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { PeriodSummary } from '@/src/types/training';
import { formatVolume, muscleLabel, startOfMonth, startOfWeek } from '@/src/utils/format';

type Period = 'semana' | 'mes';

export default function HistoricoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<Period>('semana');
  const [summary, setSummary] = useState<PeriodSummary | null>(null);

  useEffect(() => {
    const from = period === 'semana' ? startOfWeek() : startOfMonth();
    void getPeriodSummary(from, Date.now()).then(setSummary);
  }, [period]);

  const maxVolume = Math.max(...(summary?.byMuscle.map((item) => item.volumeKg) ?? [0]), 1);

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/treino'))}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Histórico
          </Text>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          {(['semana', 'mes'] as Period[]).map((item) => (
            <Pressable
              accessibilityRole="tab"
              aria-selected={period === item}
              key={item}
              onPress={() => setPeriod(item)}
              style={({ pressed }) => [
                styles.tab,
                period === item ? styles.tabActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.tabText, period === item ? styles.tabTextActive : null]}>
                {item === 'semana' ? 'Esta semana' : 'Este mês'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pills}>
          <Pill label="Treinos" value={`${summary?.sessionCount ?? 0}`} />
          <Pill label="Volume" value={formatVolume(summary?.volumeKg ?? 0)} />
          <Pill label="Cardio" value={`${summary?.cardioMinutes ?? 0} min`} />
        </View>

        <Text style={styles.sectionTitle}>Volume por grupo muscular</Text>
        {summary?.byMuscle.length ? (
          summary.byMuscle.map((item) => (
            <View key={item.muscle} style={styles.barRow}>
              <Text style={styles.barLabel}>{muscleLabel(item.muscle)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: withAlpha(theme.domain.treino, 0.85),
                      width: `${Math.max((item.volumeKg / maxVolume) * 100, 4)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{formatVolume(item.volumeKg)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Ainda não há treinos neste período. Registre um treino para ver o volume por grupo.
          </Text>
        )}

        {summary?.byMuscle.length ? (
          <Text style={styles.footnote}>
            Volume é carga × repetições das séries concluídas. Serve para comparar semanas, não para comparar
            com outras pessoas.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
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
  },
  tabs: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    borderRadius: radius.pill,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: theme.accent.primary,
  },
  tabText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  tabTextActive: {
    color: theme.accent.onPrimary,
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
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  barLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    width: 78,
  },
  barTrack: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flex: 1,
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  barValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: 64,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
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
