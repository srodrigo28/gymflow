import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { useSession } from '@/src/contexts/session-context';
import { getWeeklyPlan } from '@/src/services/ai';
import { ApiError } from '@/src/services/api';
import { startAiPlanSession } from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { AiPlanDay, AiWeeklyPlan } from '@/src/types/ai';
import type { PlanExercise } from '@/src/types/coaching';
import { saoPauloWeekday } from '@/src/utils/format';

// O que a tela guarda da resposta, com a conta de quem pediu: trocar de conta esconde o plano da anterior.
type Loaded = { kind: 'plan'; plan: AiWeeklyPlan; token: string } | { kind: 'limit'; message: string; token: string };

const weekdayNames = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function openSession(id: string) {
  router.push({ params: { id }, pathname: '/(app)/treino/sessao' });
}

// Um treino por vez, como no do personal: com outro em andamento, a pessoa decide. No navegador o Alert do
// React Native não aparece; lá vale a confirmação do próprio navegador.
function askAboutActiveSession(sessionId: string, title: string) {
  const heading = 'Você tem um treino em andamento';
  const message = `Termine ou descarte o treino atual para começar “${title}”. Ele continua de onde parou.`;

  if (Platform.OS === 'web') {
    if (window.confirm(`${heading}\n\n${message}`)) {
      openSession(sessionId);
    }

    return;
  }

  Alert.alert(heading, message, [
    { style: 'cancel', text: 'Agora não' },
    { onPress: () => openSession(sessionId), text: 'Ver treino em andamento' },
  ]);
}

// O dia do plano no formato da prescrição, que é o que monta a sessão. A carga sugerida fica de fora: as
// séries nascem com a carga da última vez, como no treino do personal, e a pessoa ajusta ali.
function toPlanExercises(day: AiPlanDay): PlanExercise[] {
  return day.exercises.map(({ exerciseId, kind, modality, muscle, name, note, reps, restSec, sets }) => ({
    exerciseId,
    kind,
    modality,
    muscle,
    name,
    note,
    reps,
    restSec,
    sets,
  }));
}

/**
 * "Treino de hoje pelo plano", no Treino (Fase 6): o dia de hoje (no relógio de São Paulo, o do servidor)
 * do plano da semana que a IA sugeriu, com "Começar" abrindo a sessão já montada. Sem treino hoje no plano,
 * mostra o próximo. Só aparece com a IA ligada no servidor e o consentimento da IA: sem a chave (503), sem
 * o consentimento (403) ou sem internet, fica em silêncio e valem as recomendações por regras.
 */
export function AiPlanToday() {
  const { session } = useSession();
  const token = session?.token;
  const consentAt = session?.user.aiConsentAt ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Um pedido por foco e nunca dois ao mesmo tempo: a primeira chamada da semana gera o plano, e gerar
  // custa. Quem sai e volta com um pedido ainda a caminho fica com a resposta dele.
  const pending = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !consentAt || pending.current) {
        return;
      }

      pending.current = true;

      void getWeeklyPlan(token)
        .then(
          (response): Loaded | null =>
            response.status === 'ok' && response.content ? { kind: 'plan', plan: response.content, token } : null,
          // Só o limite (429) tem o que dizer. O resto (503, 403, sem internet, plano recusado pelas regras)
          // fica em silêncio.
          (reason: unknown): Loaded | null =>
            reason instanceof ApiError && reason.status === 429 ? { kind: 'limit', message: reason.message, token } : null,
        )
        .then((next) => {
          pending.current = false;
          setLoaded(next);
        });
    }, [consentAt, token]),
  );

  // Consentimento retirado ou outra conta: some na hora, sem esperar o próximo pedido.
  if (!loaded || !consentAt || loaded.token !== token) {
    return null;
  }

  if (loaded.kind === 'limit') {
    return <LimitNote message={loaded.message} />;
  }

  const today = saoPauloWeekday();
  const days = [...loaded.plan.days].sort((a, b) => a.weekday - b.weekday);
  const todayPlan = days.find((day) => day.weekday === today && day.exercises.length > 0);

  if (todayPlan) {
    return <TodayCard day={todayPlan} safetyNotes={loaded.plan.safetyNotes} />;
  }

  return <NextDay day={days.find((day) => day.weekday > today)} today={today} />;
}

// Os cuidados da semana vão junto com o porquê: quem começa por aqui talvez nunca abra o plano inteiro.
function TodayCard({ day, safetyNotes }: { day: AiPlanDay; safetyNotes: string[] }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [showWhy, setShowWhy] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = day.exercises.map((exercise) => exercise.name);
  const summary =
    names.length > 3 ? `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}` : names.join(', ');

  async function start() {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const result = await startAiPlanSession(toPlanExercises(day));

      if (result.busy) {
        askAboutActiveSession(result.id, day.title);
      } else {
        openSession(result.id);
      }
    } catch {
      setError('Não foi possível montar o treino agora. Tente de novo.');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
          <MaterialCommunityIcons color={theme.domain.treino} name="creation" size={22} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.overline, { color: theme.domain.treino }]}>Treino de hoje pelo plano</Text>
          <Text style={styles.title}>{day.title}</Text>
          <Text style={styles.focus}>{day.focus}</Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.exercises}>
        {plural(names.length, 'exercício', 'exercícios')}: {summary}
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Começar ${day.title}, o treino de hoje pelo plano`}
          accessibilityRole="button"
          accessibilityState={{ busy: isStarting, disabled: isStarting }}
          disabled={isStarting}
          onPress={() => void start()}
          style={({ pressed }) => [styles.startButton, pressed ? styles.pressed : null]}>
          {isStarting ? (
            <ActivityIndicator color={theme.accent.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons color={theme.accent.onPrimary} name="play" size={14} />
              <Text style={styles.startText}>Começar</Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityHint={
            showWhy
              ? 'Esconde a explicação'
              : `Mostra por que o plano sugere este treino hoje${safetyNotes.length ? ' e os cuidados da semana' : ''}`
          }
          accessibilityLabel="Por que esse treino?"
          accessibilityRole="button"
          accessibilityState={{ expanded: showWhy }}
          hitSlop={8}
          onPress={() => setShowWhy((value) => !value)}
          style={({ pressed }) => [styles.whyButton, pressed ? styles.pressed : null]}>
          <Text style={styles.whyLabel}>Por que esse treino?</Text>
          <Ionicons color={theme.accent.primary} name={showWhy ? 'chevron-up' : 'chevron-down'} size={16} />
        </Pressable>
      </View>

      {showWhy ? (
        <View style={styles.whyBox}>
          <Text style={styles.why}>{day.why}</Text>
          {safetyNotes.length ? (
            <View style={styles.safety}>
              <Text style={styles.safetyTitle}>Cuidados da semana</Text>
              {safetyNotes.map((note, index) => (
                <Text key={`${index}-${note}`} style={styles.safetyNote}>
                  • {note}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.footnote}>Sugerido pela IA e conferido pelas regras do Gyn Flow antes de chegar aqui.</Text>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// Sem treino hoje no plano: o próximo da semana. Passado o último, o plano da semana seguinte chega na segunda.
// O toque abre Recomendações, onde está o plano inteiro.
function NextDay({ day, today }: { day: AiPlanDay | undefined; today: number }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const when = day ? (day.weekday === today + 1 ? 'amanhã' : weekdayNames[day.weekday]) : null;
  const text = day
    ? `Próximo pelo plano: ${when}, ${day.title}`
    : 'Sem mais treinos no plano desta semana. Na segunda chega o da próxima.';

  return (
    <Pressable
      accessibilityHint="Abre o plano da semana em Recomendações"
      accessibilityLabel={day ? `${text}. ${day.focus}` : text}
      accessibilityRole="button"
      onPress={() => router.push('/(app)/recomendacoes')}
      style={({ pressed }) => [styles.nextCard, pressed ? styles.pressed : null]}>
      <View style={[styles.nextIcon, { backgroundColor: withAlpha(theme.domain.treino, 0.16) }]}>
        <MaterialCommunityIcons color={theme.domain.treino} name="calendar-arrow-right" size={20} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.nextTitle}>{text}</Text>
        {day ? <Text style={styles.nextFocus}>{day.focus}</Text> : null}
      </View>
      <Ionicons color={theme.text.secondary} name="chevron-forward" size={20} />
    </Pressable>
  );
}

// O limite (o teto do mês da IA ou pedidos demais) numa linha discreta, com a mensagem pronta do servidor.
function LimitNote({ message }: { message: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLabel={message} accessible style={styles.limit}>
      <Ionicons color={theme.text.muted} name="information-circle-outline" size={16} style={styles.limitIcon} />
      <Text style={styles.limitText}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
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
  overline: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 17,
  },
  focus: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  exercises: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
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
  whyButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
  },
  whyLabel: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  whyBox: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  why: {
    color: theme.text.primary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  safety: {
    gap: 4,
  },
  safetyTitle: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  safetyNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  nextCard: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  nextIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  nextTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  nextFocus: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  limit: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  // Alinha o ícone com a primeira linha do texto ao lado.
  limitIcon: {
    marginTop: 1,
  },
  limitText: {
    color: theme.text.muted,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
}));
