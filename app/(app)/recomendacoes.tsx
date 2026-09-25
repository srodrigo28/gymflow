import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AiConsentCard } from '@/src/components/ai/AiConsentCard';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import {
  getAiStatus,
  getMonthlySummary,
  getWeeklyPlan,
  readSavedWeeklyPlan,
  regenerateWeeklyPlan,
  saveAiPreferences,
} from '@/src/services/ai';
import { ApiError } from '@/src/services/api';
import { getRecommendations, type Recommendation } from '@/src/services/recommendations';
import { planTarget, planWeekday, restLabel } from '@/src/services/student-coaching';
import { getTrainingPreferences } from '@/src/services/training-preferences';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha, type DomainName } from '@/src/theme';
import type {
  AiDocumentStatus,
  AiMonthlySummary,
  AiMonthlySummaryResponse,
  AiPlanDay,
  AiPlanExercise,
  AiStatus,
  AiWeeklyPlan,
  AiWeeklyPlanResponse,
} from '@/src/types/ai';
import { formatNumber, formatShortDate, monthLabel, parseDayKey, saoPauloWeekKey, shiftDayKey } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const toneIcon: Record<DomainName, IconName> = {
  agua: 'cup-water',
  alimentacao: 'food-apple-outline',
  conquista: 'trophy-outline',
  mente: 'head-heart-outline',
  sono: 'sleep',
  treino: 'dumbbell',
};

// --- Recomendações com IA (Fase 6: 22-estrategia.md, seção 2.5, Estágio 3) -------------------------------
// A IA sugere e explica; as regras do servidor conferem cada resposta antes de ela chegar aqui. Sem a chave
// no servidor (503 IA_NAO_CONFIGURADA) ou sem o consentimento, a tela fica só com as regras, como antes.

type Failure = { canRetry: boolean; message: string; state: 'error' };

// loading: esperando (gerar pode levar alguns segundos); ready: a resposta do servidor, que ainda pode ser
// `rejected` ou `empty`.
type Section<T> = { state: 'loading' } | { data: T; state: 'ready' } | Failure;

// 0 = segunda … 6 = domingo, como o plano conta.
const weekdayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// O plano guardado no aparelho, no formato da resposta da API: só para consulta, sem pedir outro.
function savedPlanResponse(plan: AiWeeklyPlan): AiWeeklyPlanResponse {
  return { canRegenerate: false, content: plan, generatedAt: null, message: null, reason: null, status: 'ok' };
}

// Como a tela fica quando uma rota da IA responde que ela não está ligada.
const AI_OFF: AiStatus = { capUsd: 0, configured: false, consentAt: null, model: '', spentUsd: 0 };

const PLAN_LOADING = 'Montando o seu plano, pode levar alguns segundos.';
const REJECTED_FALLBACK =
  'A resposta da IA não passou nas regras de segurança e foi descartada. Siga as recomendações por regras.';

function isAiOff(error: unknown) {
  return error instanceof ApiError && error.status === 503 && error.code === 'IA_NAO_CONFIGURADA';
}

// Um pedido à IA em andamento vale também para a próxima visita: sair e voltar enquanto ela escreve não gera,
// nem conta no teto do mês, um segundo plano ou resumo.
const pendingRequests = new Map<string, Promise<unknown>>();

function once<T>(key: string, request: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key) as Promise<T> | undefined;

  if (pending) {
    return pending;
  }

  const next = request();
  const clear = () => {
    pendingRequests.delete(key);
  };

  pendingRequests.set(key, next);
  next.then(clear, clear);

  return next;
}

// A mensagem é a do servidor, pronta para a tela. Sem rede ou com o servidor fora do ar, tentar de novo
// resolve; com o teto do mês (429) ou sem o consentimento (403), não.
function toFailure(error: unknown): Failure {
  return {
    canRetry: !(error instanceof ApiError) || error.status === 0 || error.status >= 500,
    message: error instanceof Error ? error.message : 'Não foi possível carregar agora. Tente de novo daqui a pouco.',
    state: 'error',
  };
}

// As escolhas de treino ficam no aparelho; vão para a IA antes de ela montar um plano. Se não der para
// mandar, o plano sai sem elas, só com o histórico de treino.
async function sendTrainingPreferences(token: string, userId: string) {
  try {
    const { categories, equipment, focusMuscles, location } = await getTrainingPreferences(userId);
    await saveAiPreferences(token, { categories, equipment, focusMuscles, location });
  } catch {
    // Segue sem elas.
  }
}

/** 0.04 → "US$ 0,04". Abaixo de um centavo, não arredonda para zero. */
function usdLabel(value: number) {
  return value > 0 && value < 0.01 ? 'menos de US$ 0,01' : `US$ ${formatNumber(value, 2)}`;
}

// O custo é do Gyn Flow (o app é gratuito); a linha diz quanto do teto do mês já foi.
function usageLine({ capUsd, spentUsd }: AiStatus) {
  const reachedCap = spentUsd >= capUsd ? ' Chegou ao teto: a IA descansa até o mês virar.' : '';

  return `Uso da IA neste mês: ${usdLabel(spentUsd)} de ${usdLabel(capUsd)}.${reachedCap} O custo é do Gyn Flow, sem cobrança para você.`;
}

/** 42.5 → "42,5 kg"; 40 → "40 kg". */
function kgLabel(value: number) {
  return `${String(Math.round(value * 100) / 100).replace('.', ',')} kg`;
}

/** "2026-09-21" → "21 a 27 set"; entre dois meses, "28 set a 4 out". */
function weekRangeLabel(weekKey: string) {
  const start = parseDayKey(weekKey);
  const end = parseDayKey(shiftDayKey(weekKey, 6));
  const from = start.getMonth() === end.getMonth() ? String(start.getDate()) : formatShortDate(start.getTime());

  return `${from} a ${formatShortDate(end.getTime())}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Cardio e tempo numa série só: a duração basta ("20 min"). O resto, séries × repetições ("3 × 8-12").
function isSingleBout(exercise: AiPlanExercise) {
  return exercise.kind !== 'forca' && exercise.sets === 1;
}

function exerciseTarget(exercise: AiPlanExercise) {
  return isSingleBout(exercise) ? exercise.reps : planTarget(exercise);
}

function exerciseMeta(exercise: AiPlanExercise) {
  const load = typeof exercise.targetWeightKg === 'number' ? `Carga sugerida: ${kgLabel(exercise.targetWeightKg)}` : null;
  const rest =
    typeof exercise.restSec === 'number'
      ? exercise.restSec > 0
        ? `Descanso: ${restLabel(exercise.restSec)}`
        : 'Sem descanso'
      : null;

  return [load, rest].filter(Boolean).join(' · ');
}

// O que o leitor de tela fala do exercício, numa frase só.
function exerciseDescription(exercise: AiPlanExercise) {
  const target = isSingleBout(exercise)
    ? exercise.reps
    : `${exercise.sets} ${exercise.sets === 1 ? 'série' : 'séries'} de ${exercise.reps}`;

  return [`${exercise.name}: ${target}`, exerciseMeta(exercise), exercise.note].filter(Boolean).join('. ');
}

// O estado da IA e o que ela gerou. O estado vem a cada visita (a chave pode ter chegado ao servidor, e o
// custo do mês muda); o plano e o resumo, quando a IA está ligada e há consentimento.
function useAiRecommendations() {
  const { refreshAccount, session } = useSession();
  const token = session?.token;
  const userId = session?.user.id;
  const consentAt = session?.user.aiConsentAt ?? null;
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [plan, setPlan] = useState<Section<AiWeeklyPlanResponse> | null>(null);
  const [summary, setSummary] = useState<Section<AiMonthlySummaryResponse> | null>(null);
  const [planAttempt, setPlanAttempt] = useState(0);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  // As escolhas de treino vão uma vez por visita e por consentimento: retirar apaga as que estavam no
  // servidor, e ao aceitar de novo elas vão outra vez. Guardar o envio, e não só um "já foi", faz o pedido
  // do plano sempre esperar por ele.
  const preferencesSent = useRef<{ consentAt: string; done: Promise<void> } | null>(null);
  const isOn = Boolean(consentAt && status?.configured);
  // Sem rede na chegada, quem já aceitou vê o plano desta semana guardado no aparelho, só para consulta.
  const [savedPlan, setSavedPlan] = useState<AiWeeklyPlan | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setStatus(await getAiStatus(token));
      setStatusFailed(false);
    } catch (error) {
      // Sem rede, fica o último estado que chegou.
      if (isAiOff(error)) {
        setStatus(AI_OFF);
      } else {
        setStatusFailed(true);
      }
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus]),
  );

  useEffect(() => {
    if (status || !statusFailed || !consentAt || !userId) {
      setSavedPlan(null);
      return;
    }

    let isActive = true;

    void readSavedWeeklyPlan(userId).then((saved) => {
      if (isActive) {
        setSavedPlan(saved && saved.weekKey === saoPauloWeekKey() ? saved : null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [consentAt, status, statusFailed, userId]);

  // Uma rota da IA respondeu 503: a chave saiu do servidor, e a tela volta a ficar só com as regras.
  const markOff = useCallback(() => {
    setStatus((current) => (current ? { ...current, configured: false } : AI_OFF));
  }, []);

  useEffect(() => {
    // Sem a IA, nada do que ela gerou fica na tela (retirar o consentimento apaga tudo no servidor).
    if (!isOn || !consentAt || !token || !userId) {
      setPlan(null);
      return;
    }

    let isActive = true;
    let sent = preferencesSent.current;

    if (!sent || sent.consentAt !== consentAt) {
      sent = { consentAt, done: sendTrainingPreferences(token, userId) };
      preferencesSent.current = sent;
    }

    const preferences = sent.done;
    setPlan({ state: 'loading' });
    setRegenerateError(null);

    once(`plan:${userId}:${consentAt}`, () => preferences.then(() => getWeeklyPlan(token, userId)))
      .then((data) => {
        if (isActive) {
          setPlan({ data, state: 'ready' });
          // Gerar agora muda o custo do mês.
          void loadStatus();
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (isAiOff(error)) {
          markOff();
        } else {
          // 403: o consentimento pode ter saído em outro aparelho. A conta é conferida de novo, e a tela passa
          // a mostrar o convite no lugar do erro.
          if (error instanceof ApiError && error.status === 403) {
            void refreshAccount();
          }

          setPlan(toFailure(error));
        }
      });

    return () => {
      isActive = false;
    };
  }, [consentAt, isOn, loadStatus, markOff, planAttempt, refreshAccount, token, userId]);

  useEffect(() => {
    if (!isOn || !consentAt || !token || !userId) {
      setSummary(null);
      return;
    }

    let isActive = true;
    setSummary({ state: 'loading' });

    once(`summary:${userId}:${consentAt}`, () => getMonthlySummary(token))
      .then((data) => {
        if (isActive) {
          setSummary({ data, state: 'ready' });
          void loadStatus();
        }
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (isAiOff(error)) {
          markOff();
        } else {
          if (error instanceof ApiError && error.status === 403) {
            void refreshAccount();
          }

          setSummary(toFailure(error));
        }
      });

    return () => {
      isActive = false;
    };
  }, [consentAt, isOn, loadStatus, markOff, refreshAccount, summaryAttempt, token, userId]);

  const regenerate = useCallback(async () => {
    if (!token || !userId) {
      return;
    }

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      // O plano novo respeita as escolhas de treino de agora, mesmo que tenham mudado nesta visita.
      const data = await once(`regenerate:${userId}:${consentAt}`, async () => {
        await sendTrainingPreferences(token, userId);

        return regenerateWeeklyPlan(token, userId);
      });

      setPlan({ data, state: 'ready' });
      void loadStatus();
    } catch (error) {
      if (isAiOff(error)) {
        markOff();
      } else {
        setRegenerateError(error instanceof Error ? error.message : 'Não foi possível pedir outro plano agora.');

        // Já saiu um plano hoje (AI_DAILY_LIMIT) ou o teto do mês chegou (AI_CAP): pedir de novo daria o mesmo.
        if (error instanceof ApiError && error.status === 429) {
          setPlan((current) =>
            current?.state === 'ready' ? { ...current, data: { ...current.data, canRegenerate: false } } : current,
          );
        }
      }
    } finally {
      setIsRegenerating(false);
    }
  }, [consentAt, loadStatus, markOff, token, userId]);

  return {
    consentAt,
    isOn,
    isRegenerating,
    plan,
    regenerate,
    regenerateError,
    retryPlan: () => setPlanAttempt((attempt) => attempt + 1),
    retrySummary: () => setSummaryAttempt((attempt) => attempt + 1),
    savedPlan,
    status,
    statusFailed,
    summary,
  };
}

export default function RecomendacoesScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const userId = session?.user.id;
  const consentAt = session?.user.bodyDataConsentAt ?? null;
  const ai = useAiRecommendations();

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        return;
      }

      let isActive = true;
      getRecommendations({ consentAt, userId })
        .then((list) => {
          if (isActive) {
            setItems(list);
          }
        })
        .catch(() => {
          if (isActive) {
            setItems([]);
          }
        });

      return () => {
        isActive = false;
      };
    }, [consentAt, userId]),
  );

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
            Recomendações
          </Text>
        </View>

        {/* O estado da IA fica no topo. Sem a chave no servidor, uma linha discreta e nenhuma seção de IA; com
            ela e sem o consentimento, o convite; com os dois, o plano da semana e o resumo do mês. */}
        {ai.status && !ai.status.configured ? (
          <AiNote
            icon="information-outline"
            text="As recomendações com IA ainda não estão ligadas; estas vêm das suas regras e dos seus dados."
          />
        ) : null}

        {/* Sem rede logo na chegada, quem já aceitou fica sabendo por que o plano não apareceu, ou vê o plano
            desta semana guardado no aparelho. */}
        {!ai.status && ai.statusFailed && ai.consentAt ? (
          <AiNote
            icon="cloud-off-outline"
            text={
              ai.savedPlan
                ? 'Sem conexão agora: este é o plano da semana guardado no aparelho.'
                : 'O plano com IA não carregou agora; estas sugestões vêm das suas regras e dos seus dados.'
            }
          />
        ) : null}

        {!ai.isOn && ai.savedPlan ? (
          <>
            <WeeklyPlanSection
              isRegenerating={false}
              onRegenerate={() => undefined}
              onRetry={() => undefined}
              plan={{ data: savedPlanResponse(ai.savedPlan), state: 'ready' }}
              regenerateError={null}
            />
            <Text accessibilityRole="header" style={[styles.sectionTitle, styles.rulesTitle]}>
              Recomendações por regras
            </Text>
          </>
        ) : null}

        {ai.status?.configured && !ai.consentAt ? <AiConsentCard /> : null}

        {ai.isOn ? (
          <>
            <WeeklyPlanSection
              isRegenerating={ai.isRegenerating}
              onRegenerate={() => void ai.regenerate()}
              onRetry={ai.retryPlan}
              plan={ai.plan}
              regenerateError={ai.regenerateError}
            />
            <MonthlySummarySection onRetry={ai.retrySummary} summary={ai.summary} />
            <Text accessibilityRole="header" style={[styles.sectionTitle, styles.rulesTitle]}>
              Recomendações por regras
            </Text>
          </>
        ) : null}

        <Text style={styles.intro}>
          Sugestões a partir do que você registrou aqui e respondeu no questionário. São regras simples,
          calculadas no seu aparelho: nada sai dele e nenhuma IA entra nesta etapa.
        </Text>

        {items === null ? null : items.length ? (
          items.map((item) => <RecommendationCard item={item} key={item.id} />)
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons color={theme.accent.primary} name="check-decagram-outline" size={28} />
            <Text style={styles.emptyTitle}>Tudo em dia</Text>
            <Text style={styles.emptyText}>
              Nada a sugerir agora. Volte depois do próximo treino ou da próxima pesagem.
            </Text>
          </View>
        )}

        {/* Com o consentimento dado, o cartão fica no fim, para retirar quando quiser, mesmo com a IA desligada
            no servidor. */}
        {ai.consentAt ? <AiConsentCard /> : null}

        <Text style={styles.footnote}>
          Isto não substitui a orientação de um profissional de saúde ou de educação física. Em caso de
          dor, tontura ou mal-estar, pare e procure ajuda.
        </Text>

        {ai.isOn && ai.status ? <Text style={styles.usage}>{usageLine(ai.status)}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const color = theme.domain[item.tone];

  return (
    <View accessibilityLabel={`${item.title}. ${item.body}`} accessible style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.16) }]}>
          <MaterialCommunityIcons color={color} name={toneIcon[item.tone]} size={20} />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardBody}>{item.body}</Text>
      {item.action ? (
        <Button
          accessibilityLabel={item.action.label}
          onPress={() => router.push(item.action!.href)}
          title={item.action.label}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

// Uma linha discreta sobre o estado da IA, sem cara de erro.
function AiNote({ icon, text }: { icon: IconName; text: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLabel={text} accessible style={styles.aiNote}>
      <MaterialCommunityIcons color={theme.text.muted} name={icon} size={16} style={styles.aiNoteIcon} />
      <Text style={styles.aiNoteText}>{text}</Text>
    </View>
  );
}

// Gerar pode levar mais de 30 segundos: o aviso diz isso em vez de deixar só a rodinha girando.
function LoadingLine({ text }: { text: string }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View accessibilityLabel={text} accessibilityLiveRegion="polite" accessible style={styles.loadingLine}>
      <ActivityIndicator color={theme.accent.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

function ErrorCard({ failure: { canRetry, message }, onRetry }: { failure: Failure; onRetry: () => void }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.aiCard}>
      <View style={styles.noticeRow}>
        <MaterialCommunityIcons
          color={theme.text.secondary}
          name={canRetry ? 'cloud-off-outline' : 'pause-circle-outline'}
          size={20}
        />
        <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
          {message}
        </Text>
      </View>
      {canRetry ? (
        <Button accessibilityLabel="Tentar carregar de novo" icon="refresh" onPress={onRetry} title="Tentar de novo" variant="ghost" />
      ) : null}
    </View>
  );
}

// Resposta descartada pelas regras (com o motivo em letra menor) ou nada a gerar ainda: a mensagem do servidor.
function DocumentNotice({
  fallback,
  message,
  reason,
  status,
}: {
  fallback: string;
  message: string | null;
  reason: string | null;
  status: AiDocumentStatus;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  const isRejected = status === 'rejected';

  return (
    <View style={styles.noticeBlock}>
      <View style={styles.noticeRow}>
        <MaterialCommunityIcons
          color={isRejected ? theme.status.info : theme.text.secondary}
          name={isRejected ? 'shield-check-outline' : 'calendar-blank-outline'}
          size={20}
        />
        <Text style={styles.noticeText}>{message || fallback}</Text>
      </View>
      {isRejected && reason ? <Text style={styles.reason}>{`Motivo: ${reason}`}</Text> : null}
    </View>
  );
}

type WeeklyPlanSectionProps = {
  isRegenerating: boolean;
  onRegenerate: () => void;
  onRetry: () => void;
  plan: Section<AiWeeklyPlanResponse> | null;
  regenerateError: string | null;
};

function WeeklyPlanSection({ isRegenerating, onRegenerate, onRetry, plan, regenerateError }: WeeklyPlanSectionProps) {
  const styles = useStyles();
  const weekKey = plan?.state === 'ready' ? plan.data.content?.weekKey : undefined;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Plano da semana
        </Text>
        <Text style={styles.sectionCaption}>
          {`${weekKey ? `Semana de ${weekRangeLabel(weekKey)}. ` : ''}Sugerido pela IA e conferido pelas regras do app.`}
        </Text>
      </View>

      {!plan || plan.state === 'loading' ? (
        <View style={styles.aiCard}>
          <LoadingLine text={PLAN_LOADING} />
        </View>
      ) : plan.state === 'error' ? (
        <ErrorCard failure={plan} onRetry={onRetry} />
      ) : (
        <PlanCard
          isRegenerating={isRegenerating}
          onRegenerate={onRegenerate}
          regenerateError={regenerateError}
          response={plan.data}
        />
      )}
    </View>
  );
}

type PlanCardProps = {
  isRegenerating: boolean;
  onRegenerate: () => void;
  regenerateError: string | null;
  response: AiWeeklyPlanResponse;
};

function PlanCard({ isRegenerating, onRegenerate, regenerateError, response }: PlanCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const plan = response.status === 'ok' ? response.content : null;

  return (
    <View style={styles.aiCard}>
      {plan ? (
        <>
          <View style={styles.planIntro}>
            <View style={[styles.iconWrap, { backgroundColor: theme.accent.soft }]}>
              <MaterialCommunityIcons color={theme.accent.primary} name="creation" size={20} />
            </View>
            <Text style={styles.planSummary}>{plan.summary}</Text>
          </View>

          {plan.days.map((day, index) => (
            <PlanDayBlock day={day} key={`${day.weekday}-${day.title}-${index}`} />
          ))}

          {plan.safetyNotes.length ? <SafetyNotes notes={plan.safetyNotes} /> : null}
        </>
      ) : (
        <DocumentNotice
          fallback={response.status === 'rejected' ? REJECTED_FALLBACK : 'Ainda não há plano para esta semana.'}
          message={response.message}
          reason={response.reason}
          status={response.status}
        />
      )}

      {/* Já saiu um plano hoje, ou o teto do mês chegou: a mensagem do servidor, sem cara de erro. */}
      {regenerateError ? (
        <View style={styles.noticeRow}>
          <MaterialCommunityIcons color={theme.text.secondary} name="information-outline" size={18} />
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
            {regenerateError}
          </Text>
        </View>
      ) : null}

      {/* Enquanto o plano novo sai, o aviso fica no lugar do botão: um toque só por pedido. */}
      {isRegenerating ? (
        <LoadingLine text={PLAN_LOADING} />
      ) : response.canRegenerate ? (
        <View style={styles.regenerate}>
          <Button
            accessibilityHint="O plano novo substitui este. Dá para pedir um por dia."
            accessibilityLabel="Pedir outro plano da semana"
            icon="refresh"
            onPress={onRegenerate}
            title="Pedir outro plano"
            variant="outline"
          />
          <Text style={styles.hint}>O plano novo substitui este. Dá para pedir um por dia.</Text>
        </View>
      ) : null}
    </View>
  );
}

function PlanDayBlock({ day }: { day: AiPlanDay }) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const isToday = day.weekday === planWeekday();
  const weekday = weekdayNames[day.weekday] ?? '';

  return (
    <View style={styles.day}>
      <View style={styles.dayHeader}>
        {weekday ? (
          <Text style={[styles.dayWeekday, isToday ? styles.dayWeekdayToday : null]}>
            {isToday ? `${weekday} · hoje` : weekday}
          </Text>
        ) : null}
        <Text accessibilityRole="header" style={styles.dayTitle}>
          {day.title}
        </Text>
        {day.focus ? <Text style={styles.dayFocus}>{day.focus}</Text> : null}
      </View>

      <View style={styles.exerciseList}>
        {day.exercises.map((exercise, position) => {
          const meta = exerciseMeta(exercise);

          return (
            <View
              accessibilityLabel={exerciseDescription(exercise)}
              accessible
              key={`${exercise.exerciseId}-${position}`}
              style={styles.exercise}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseTarget}>{exerciseTarget(exercise)}</Text>
              </View>
              {meta ? <Text style={styles.exerciseMeta}>{meta}</Text> : null}
              {exercise.note ? <Text style={styles.exerciseNote}>{exercise.note}</Text> : null}
            </View>
          );
        })}
      </View>

      {day.why ? (
        <>
          <Pressable
            accessibilityHint={isWhyOpen ? 'Esconde a explicação' : `Mostra por que a IA sugeriu ${day.title}`}
            accessibilityLabel="Por que esse treino?"
            accessibilityRole="button"
            accessibilityState={{ expanded: isWhyOpen }}
            hitSlop={8}
            onPress={() => setIsWhyOpen((open) => !open)}
            style={({ pressed }) => [styles.whyButton, pressed ? styles.pressed : null]}>
            <MaterialCommunityIcons color={theme.accent.primary} name="help-circle-outline" size={18} />
            <Text style={styles.whyLabel}>Por que esse treino?</Text>
            <Ionicons color={theme.accent.primary} name={isWhyOpen ? 'chevron-up' : 'chevron-down'} size={16} />
          </Pressable>

          {isWhyOpen ? (
            <View style={styles.whyBox}>
              <Text style={styles.whyText}>{day.why}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function SafetyNotes({ notes }: { notes: string[] }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.safety}>
      <View style={styles.safetyHeader}>
        <MaterialCommunityIcons color={theme.status.info} name="shield-check-outline" size={18} />
        <Text style={styles.safetyTitle}>Para treinar com segurança</Text>
      </View>
      {notes.map((note, index) => (
        <View key={`${index}-${note}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.safetyText}>{note}</Text>
        </View>
      ))}
    </View>
  );
}

function MonthlySummarySection({
  onRetry,
  summary,
}: {
  onRetry: () => void;
  summary: Section<AiMonthlySummaryResponse> | null;
}) {
  const styles = useStyles();
  const month = summary?.state === 'ready' ? summary.data.month : undefined;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Resumo do mês
        </Text>
        <Text style={styles.sectionCaption}>
          {`${month ? `${capitalize(monthLabel(month))}. ` : ''}Escrito pela IA com os números do seu mês.`}
        </Text>
      </View>

      {!summary || summary.state === 'loading' ? (
        <View style={styles.aiCard}>
          <LoadingLine text="Preparando o resumo do mês, pode levar alguns segundos." />
        </View>
      ) : summary.state === 'error' ? (
        <ErrorCard failure={summary} onRetry={onRetry} />
      ) : summary.data.status === 'ok' && summary.data.content ? (
        <SummaryCard content={summary.data.content} />
      ) : (
        <View style={styles.aiCard}>
          <DocumentNotice
            fallback={summary.data.status === 'rejected' ? REJECTED_FALLBACK : 'Ainda não há resumo do mês.'}
            message={summary.data.message}
            reason={summary.data.reason}
            status={summary.data.status}
          />
        </View>
      )}
    </View>
  );
}

function SummaryCard({ content }: { content: AiMonthlySummary }) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.aiCard}>
      <Text style={styles.summaryTitle}>{content.title}</Text>
      <Text style={styles.cardBody}>{content.text}</Text>

      {content.highlights.length ? (
        <View style={styles.highlights}>
          {content.highlights.map((highlight, index) => (
            <View key={`${index}-${highlight}`} style={styles.bulletRow}>
              <MaterialCommunityIcons
                color={theme.domain.conquista}
                name="star-four-points-outline"
                size={16}
                style={styles.bulletIcon}
              />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {content.nextFocus ? (
        <View accessible style={styles.nextFocus}>
          <MaterialCommunityIcons color={theme.accent.primary} name="bullseye-arrow" size={20} />
          <View style={styles.nextFocusBody}>
            <Text style={styles.nextFocusLabel}>Próximo foco</Text>
            <Text style={styles.nextFocusText}>{content.nextFocus}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 12,
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
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  cardBody: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  emptyText: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footnote: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  // --- IA ------------------------------------------------------------------------------------------------
  aiNote: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  aiNoteIcon: {
    marginTop: 1,
  },
  aiNoteText: {
    color: theme.text.muted,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 2,
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    lineHeight: 24,
  },
  sectionCaption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  rulesTitle: {
    marginTop: 8,
  },
  aiCard: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  loadingLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  loadingText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeBlock: {
    gap: 6,
  },
  noticeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  noticeText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Alinhado com o texto do aviso: 20 do ícone + 10 de espaço.
  reason: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 30,
  },
  planIntro: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  planSummary: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  day: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 14,
  },
  dayHeader: {
    gap: 2,
  },
  dayWeekday: {
    ...typography.overline,
    color: theme.text.muted,
  },
  dayWeekdayToday: {
    color: theme.accent.primary,
  },
  dayTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  dayFocus: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
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
  whyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
  },
  whyLabel: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  whyBox: {
    backgroundColor: theme.accent.soft,
    borderRadius: radius.sm,
    padding: 12,
  },
  whyText: {
    color: theme.text.primary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  safety: {
    backgroundColor: withAlpha(theme.status.info, 0.12),
    borderRadius: radius.sm,
    gap: 6,
    padding: 12,
  },
  safetyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  safetyTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 19,
  },
  bulletIcon: {
    marginTop: 2,
  },
  safetyText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  regenerate: {
    gap: 6,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  summaryTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    lineHeight: 22,
  },
  highlights: {
    gap: 8,
  },
  highlightText: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  nextFocus: {
    alignItems: 'flex-start',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  nextFocusBody: {
    flex: 1,
    gap: 2,
  },
  nextFocusLabel: {
    ...typography.overline,
    color: theme.accent.primary,
  },
  nextFocusText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  usage: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
}));
