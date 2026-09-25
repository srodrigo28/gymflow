import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { useSession } from '@/src/contexts/session-context';
import {
  loadMyPlans,
  planTarget,
  planWeekday,
  readSavedPlans,
  restLabel,
  weekdayLabel,
} from '@/src/services/student-coaching';
import { getActiveSessionId, getSession, startPlanSession } from '@/src/services/training';
import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';
import type { PlanDay, TrainingPlan } from '@/src/types/coaching';
import { formatShortDate } from '@/src/utils/format';

// O treino em andamento, quando ele veio de uma prescrição: o dia dele mostra "Continuar".
type ActivePlanSession = { id: string; planDay: number; planId: string };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function openSession(id: string) {
  router.push({ params: { id }, pathname: '/(app)/treino/sessao' });
}

// Um treino por vez: com outro em andamento, a pessoa decide. No navegador o Alert do React Native não
// aparece; lá vale a confirmação do próprio navegador.
function askAboutActiveSession(sessionId: string, day: PlanDay) {
  const title = 'Você tem um treino em andamento';
  const message = `Termine ou descarte o treino atual para começar “${day.title}”. Ele continua de onde parou.`;

  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      openSession(sessionId);
    }

    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: 'Agora não' },
    { onPress: () => openSession(sessionId), text: 'Ver treino em andamento' },
  ]);
}

/**
 * "Prescrito pelo seu personal", no Treino (Fase 5): as prescrições ativas e os dias de cada uma. Começar
 * abre a sessão já montada com os exercícios do dia. Sem internet, vale a última lista carregada neste
 * aparelho (services/student-coaching.ts). Quem não tem prescrição não vê a seção.
 */
export function PrescribedPlans() {
  const styles = useStyles();
  const { session } = useSession();
  const token = session?.token;
  const userId = session?.user.id;
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  // Quando a lista na tela é a cópia do aparelho (a API não respondeu): a data dela.
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const [active, setActive] = useState<ActivePlanSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    // A cópia primeiro: a lista aparece na hora, e a da API chega por cima.
    const [saved, activeId] = await Promise.all([
      readSavedPlans(userId),
      getActiveSessionId().catch(() => null),
    ]);
    const activeSession = activeId ? await getSession(activeId).catch(() => null) : null;

    if (saved) {
      setPlans(saved.plans);
    }

    setActive(
      activeSession?.planId !== undefined && activeSession.planDay !== undefined
        ? { id: activeSession.id, planDay: activeSession.planDay, planId: activeSession.planId }
        : null,
    );

    if (!token) {
      return;
    }

    try {
      const fresh = await loadMyPlans(token, userId);
      setPlans(fresh.plans);
      setCopyFrom(fresh.offline ? fresh.savedAt : null);
    } catch {
      // Sem internet e sem cópia: não há o que mostrar, e quem não tem personal nem vê a seção.
    }
  }, [token, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!plans.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Prescrito pelo seu personal
      </Text>
      {copyFrom ? (
        <Text accessibilityLiveRegion="polite" style={styles.offline}>
          Sem conexão: esta é a lista guardada neste aparelho em {formatShortDate(copyFrom)}. Dá para treinar
          normalmente; o treino sobe quando a internet voltar.
        </Text>
      ) : null}
      {plans.map((plan) => (
        <PlanCard active={active} key={plan.id} onError={setError} plan={plan} />
      ))}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type PlanCardProps = {
  active: ActivePlanSession | null;
  onError: (message: string | null) => void;
  plan: TrainingPlan;
};

function PlanCard({ active, onError, plan }: PlanCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const today = planWeekday();
  // O dia aberto para ver os exercícios, pela posição.
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [startingDay, setStartingDay] = useState<number | null>(null);

  async function start(dayIndex: number) {
    const day = plan.days[dayIndex];

    if (!day || startingDay !== null) {
      return;
    }

    // Este dia já está em andamento: é só voltar para ele.
    if (active && active.planId === plan.id && active.planDay === dayIndex) {
      openSession(active.id);
      return;
    }

    setStartingDay(dayIndex);
    onError(null);

    try {
      const result = await startPlanSession(plan.id, dayIndex, day.exercises);

      if (result.busy) {
        askAboutActiveSession(result.id, day);
      } else {
        openSession(result.id);
      }
    } catch {
      onError('Não foi possível montar o treino agora. Tente de novo.');
    } finally {
      setStartingDay(null);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
          <MaterialCommunityIcons color={theme.domain.treino} name="clipboard-text-outline" size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planMeta}>por {plan.coach.name}</Text>
        </View>
      </View>

      {plan.note ? <Text style={styles.planNote}>{plan.note}</Text> : null}

      {plan.days.map((day, index) => {
        const isOpen = openDay === index;
        const isActive = active?.planId === plan.id && active.planDay === index;
        const isToday = day.weekday === today;
        const when = day.weekday === null ? null : isToday ? 'hoje' : weekdayLabel(day.weekday);
        const count = plural(day.exercises.length, 'exercício', 'exercícios');
        const names = day.exercises.map((exercise) => exercise.name);
        const summary =
          names.length > 3 ? `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}` : names.join(', ');

        return (
          <View key={`${day.title}-${index}`} style={styles.day}>
            <View style={styles.dayRow}>
              <Pressable
                accessibilityHint={isOpen ? 'Esconde os exercícios do dia' : 'Mostra os exercícios e os alvos do dia'}
                accessibilityLabel={[day.title, when, count].filter(Boolean).join(', ')}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                hitSlop={4}
                onPress={() => setOpenDay(isOpen ? null : index)}
                style={({ pressed }) => [styles.dayMain, pressed ? styles.pressed : null]}>
                <View style={styles.dayTitleRow}>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                  {when ? (
                    <View
                      style={[styles.chip, isToday ? { backgroundColor: withAlpha(theme.accent.primary, 0.18) } : null]}>
                      <Text style={[styles.chipText, isToday ? { color: theme.accent.primary } : null]}>{when}</Text>
                    </View>
                  ) : null}
                  <Ionicons color={theme.text.muted} name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} />
                </View>
                <Text numberOfLines={isOpen ? undefined : 2} style={styles.dayMeta}>
                  {count}: {summary}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`${isActive ? 'Continuar' : 'Começar'} ${day.title}, de ${plan.name}`}
                accessibilityRole="button"
                accessibilityState={{ busy: startingDay === index, disabled: startingDay !== null }}
                disabled={startingDay !== null}
                onPress={() => void start(index)}
                style={({ pressed }) => [styles.startButton, pressed ? styles.pressed : null]}>
                {startingDay === index ? (
                  <ActivityIndicator color={theme.accent.onPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons color={theme.accent.onPrimary} name="play" size={14} />
                    <Text style={styles.startText}>{isActive ? 'Continuar' : 'Começar'}</Text>
                  </>
                )}
              </Pressable>
            </View>

            {isOpen ? (
              <View style={styles.exerciseList}>
                {day.exercises.map((exercise, position) => (
                  <View key={`${exercise.exerciseId}-${position}`} style={styles.exercise}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseTarget}>{planTarget(exercise)}</Text>
                    </View>
                    {exercise.restSec !== null ? (
                      <Text style={styles.exerciseMeta}>
                        {exercise.restSec > 0 ? `Descanso: ${restLabel(exercise.restSec)}` : 'Sem descanso'}
                      </Text>
                    ) : null}
                    {exercise.note ? <Text style={styles.exerciseNote}>{exercise.note}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  offline: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  planName: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  planMeta: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  planNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  day: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  dayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dayMain: {
    flex: 1,
    gap: 4,
  },
  dayTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  chip: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  dayMeta: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 112,
    paddingHorizontal: 14,
  },
  startText: {
    color: theme.accent.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  exerciseList: {
    gap: 8,
  },
  exercise: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exerciseHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  exerciseName: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  exerciseTarget: {
    color: theme.domain.treino,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  exerciseMeta: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  exerciseNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.75,
  },
}));
