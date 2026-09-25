import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { readSavedWeeklyPlan } from '@/src/services/ai';
import { findMyPlan, matchPlanTargets, planHeadline, planTarget, restLabel } from '@/src/services/student-coaching';
import {
  addSet,
  deleteSet,
  discardSession,
  exerciseGroupLabel,
  finishSession,
  getSession,
  MAX_WEIGHT_KG,
  removeSessionExercise,
  toggleSetDone,
  updateSet,
} from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { AiPlanDay } from '@/src/types/ai';
import type { PlanExercise, TrainingPlan } from '@/src/types/coaching';
import type { ExerciseKind, SessionExercise, WorkoutSession, WorkoutSet } from '@/src/types/training';
import { formatDuration } from '@/src/utils/format';

const REST_SECONDS = 90;

// O alvo de um exercício: o da prescrição do personal ou o do plano da IA, que também sugere a carga.
type Target = PlanExercise & { targetWeightKg?: number | null };

/** 42.5 → "42,5 kg"; 60 → "60 kg". */
function kgLabel(value: number) {
  return `${String(Math.round(value * 100) / 100).replace('.', ',')} kg`;
}
const MAX_REPS = 1000;
const MAX_MINUTES = 24 * 60;
const MAX_DISTANCE_KM = 1000;

// As colunas de cada série. Força: carga e repetições. Cardio: minutos e quilômetros. Tempo (yoga,
// luta, mobilidade, circuito): só os minutos, sem carga, repetições nem distância.
const setColumns: Record<ExerciseKind, string[]> = {
  cardio: ['min', 'km'],
  forca: ['kg', 'reps'],
  tempo: ['min'],
};

// O useKeepAwake da biblioteca não trata a recusa do pedido. No navegador ela é comum (aba em segundo plano,
// economia de bateria, navegador sem a API) e virava um erro solto na tela do treino; sem tela acesa, o treino
// segue igual.
function useScreenAwake() {
  const tag = useId();

  useEffect(() => {
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}

export default function SessaoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  // O recorde recém-batido: fica na tela por alguns segundos com o atalho para o card.
  const [prRecord, setPrRecord] = useState<{ setId: string } | null>(null);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const prTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { session: account } = useSession();
  const userId = account?.user.id;
  const token = account?.token;
  const planId = session?.planId;
  // A prescrição de onde o treino veio. undefined enquanto procura; null quando ela não está mais na lista.
  const [plan, setPlan] = useState<TrainingPlan | null | undefined>(undefined);
  // Treino começado pelo plano da IA: o dia dele, achado na cópia do plano guardada no aparelho. null quando a
  // cópia é de outra semana ou saiu (consentimento retirado): o treino segue, só sem os alvos.
  const aiWeek = session?.aiPlan?.weekKey;
  const aiWeekday = session?.aiPlan?.weekday;
  const [aiDay, setAiDay] = useState<AiPlanDay | null>(null);

  // A tela fica acesa durante o treino: ninguém quer desbloquear o celular a cada série.
  useScreenAwake();

  const load = useCallback(async () => {
    if (!id) return;
    setSession(await getSession(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Cronômetro do treino.
  useEffect(() => {
    if (!session?.startedAt) return;

    const update = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [session?.startedAt]);

  // Descanso entre séries.
  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      setRest(null);
      return;
    }

    const timer = setTimeout(() => setRest((current) => (current === null ? null : current - 1)), 1000);

    return () => clearTimeout(timer);
  }, [rest]);

  useEffect(() => () => clearTimeout(prTimer.current), []);

  // Treino de uma prescrição: o dia e os alvos vêm da cópia guardada no aparelho, então aparecem mesmo
  // sem internet na academia.
  useEffect(() => {
    if (!planId || !userId) {
      setPlan(undefined);
      return;
    }

    let isActive = true;

    void findMyPlan(userId, token, planId)
      .catch(() => null)
      .then((found) => {
        if (isActive) {
          setPlan(found);
        }
      });

    return () => {
      isActive = false;
    };
  }, [planId, token, userId]);

  useEffect(() => {
    if (!aiWeek || aiWeekday === undefined || !userId) {
      setAiDay(null);
      return;
    }

    let isActive = true;

    void readSavedWeeklyPlan(userId).then((saved) => {
      if (isActive) {
        setAiDay(saved?.weekKey === aiWeek ? (saved.days.find((day) => day.weekday === aiWeekday) ?? null) : null);
      }
    });

    return () => {
      isActive = false;
    };
  }, [aiWeek, aiWeekday, userId]);

  async function handleToggleDone(set: WorkoutSet, restSeconds = REST_SECONDS) {
    const result = await toggleSetDone(set.id, !set.done);
    await load();

    if (!set.done) {
      // O descanso é o que o personal pediu para o exercício, quando pediu; zero é sem descanso (bi-set).
      setRest(restSeconds > 0 ? restSeconds : null);

      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(
          result.isPr ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
        );
      }

      if (result.isPr) {
        setPrRecord({ setId: set.id });
        clearTimeout(prTimer.current);
        prTimer.current = setTimeout(() => setPrRecord(null), 8000);
      }
    }
  }

  async function handleFinish() {
    if (!id) return;
    await finishSession(id);
    router.replace('/(app)/treino');
  }

  async function handleDiscard() {
    if (!id) return;
    await discardSession(id);
    router.replace('/(app)/treino');
  }

  const planDay = plan && session?.planDay !== undefined ? plan.days[session.planDay] : undefined;
  // Os alvos vêm da prescrição do personal ou, no treino começado pelo plano da IA, do dia dele.
  const targets: Map<string, Target> = aiDay
    ? matchPlanTargets(aiDay, session?.exercises ?? [])
    : matchPlanTargets(planDay, session?.exercises ?? []);
  const totalSets = session?.exercises.reduce((total, item) => total + item.sets.length, 0) ?? 0;
  const doneSets =
    session?.exercises.reduce((total, item) => total + item.sets.filter((set) => set.done).length, 0) ?? 0;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.clock}>{formatDuration(elapsed)}</Text>
          <Text style={styles.headerMeta}>
            {doneSets} de {totalSets} {totalSets === 1 ? 'série' : 'séries'}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Descartar treino"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setIsConfirmingDiscard(true)}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.text.secondary} name="trash-outline" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel="Finalizar treino"
          accessibilityRole="button"
          onPress={handleFinish}
          style={({ pressed }) => [styles.finishButton, pressed ? styles.pressed : null]}>
          <Text style={styles.finishText}>Finalizar</Text>
        </Pressable>
      </View>

      {isConfirmingDiscard ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.confirm}>
          <Text style={styles.confirmText}>Descartar este treino? As séries registradas serão perdidas.</Text>
          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsConfirmingDiscard(false)}
              style={({ pressed }) => [styles.confirmCancel, pressed ? styles.pressed : null]}>
              <Text style={styles.confirmCancelText}>Continuar treinando</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleDiscard}
              style={({ pressed }) => [styles.confirmDelete, pressed ? styles.pressed : null]}>
              <Text style={styles.confirmDeleteText}>Descartar</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {planId && plan !== undefined ? (
          <View style={styles.planBanner}>
            <Ionicons color={theme.domain.treino} name="clipboard-outline" size={18} style={styles.planIcon} />
            <View style={styles.planText}>
              <Text style={styles.planTitle}>
                {plan ? planHeadline(plan, session?.planDay) : 'Treino prescrito pelo seu personal'}
              </Text>
              {plan?.note ? <Text style={styles.planNote}>{plan.note}</Text> : null}
            </View>
          </View>
        ) : null}

        {aiDay ? (
          <View style={styles.planBanner}>
            <Ionicons color={theme.domain.treino} name="sparkles-outline" size={18} style={styles.planIcon} />
            <View style={styles.planText}>
              <Text style={styles.planTitle}>{`${aiDay.title} · plano da semana da IA`}</Text>
              <Text style={styles.planNote}>Sugerido pela IA e conferido pelas regras do Gyn Flow.</Text>
            </View>
          </View>
        ) : null}

        {session?.exercises.map((item) => (
          <ExerciseCard
            item={item}
            key={item.id}
            onChange={load}
            onToggleDone={handleToggleDone}
            target={targets.get(item.id)}
            targetSource={aiDay ? 'ai' : 'coach'}
          />
        ))}

        <Button
          icon="add"
          onPress={() => router.push({ params: { sessionId: id }, pathname: '/(app)/treino/exercicios' })}
          title={session?.exercises.length ? 'Adicionar exercício' : 'Escolher o primeiro exercício'}
          variant="outline"
        />

        {session && !session.exercises.length ? (
          <Text style={styles.hint}>
            Escolha um exercício para começar. Cada série leva dois toques: peso, repetições e pronto.
          </Text>
        ) : null}
      </ScrollView>

      {prRecord ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.prToast}>
          <Text style={styles.prToastText}>Recorde pessoal! 🏆</Text>
          <Pressable
            accessibilityLabel="Ver o card do recorde para compartilhar"
            accessibilityRole="button"
            onPress={() =>
              router.push({ params: { recordId: prRecord.setId, tipo: 'recorde' }, pathname: '/(app)/compartilhar' })
            }
            style={({ pressed }) => [styles.prToastAction, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.domain.conquista} name="share-social-outline" size={16} />
            <Text style={styles.prToastActionText}>Ver card</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {rest !== null ? (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut} style={styles.restBar}>
          <Ionicons color={theme.accent.primary} name="timer-outline" size={18} />
          <Text style={styles.restText}>Descanso {formatDuration(rest)}</Text>
          <Pressable
            accessibilityLabel="Somar 15 segundos ao descanso"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRest((current) => (current ?? 0) + 15)}
            style={({ pressed }) => [styles.restAction, pressed ? styles.pressed : null]}>
            <Text style={styles.restActionText}>+15s</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Pular descanso"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRest(null)}
            style={({ pressed }) => [styles.restAction, pressed ? styles.pressed : null]}>
            <Text style={styles.restActionText}>Pular</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function ExerciseCard({
  item,
  onChange,
  onToggleDone,
  target,
  targetSource = 'coach',
}: {
  item: SessionExercise;
  onChange: () => Promise<void>;
  onToggleDone: (set: WorkoutSet, restSeconds?: number) => Promise<void>;
  // O que a prescrição (ou o plano da IA) pede para este exercício, quando o treino veio de um deles.
  target?: Target;
  targetSource?: 'ai' | 'coach';
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  // Um tipo que esta versão não conhece (treino de um app mais novo, baixado da conta) vira força.
  const kind: ExerciseKind =
    item.exercise.kind === 'cardio' || item.exercise.kind === 'tempo' ? item.exercise.kind : 'forca';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{item.exercise.name}</Text>
          <Text style={styles.cardSubtitle}>
            {/* Exercício que veio só da conta ou da prescrição não tem equipamento no aparelho. */}
            {[exerciseGroupLabel(item.exercise), item.exercise.equipment].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Remover ${item.exercise.name} do treino`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={async () => {
            await removeSessionExercise(item.id);
            await onChange();
          }}>
          <Ionicons color={theme.text.muted} name="close" size={18} />
        </Pressable>
      </View>

      {target ? <PlanTarget source={targetSource} target={target} /> : null}

      <View style={styles.setHeader}>
        <Text style={[styles.setHeaderText, styles.colIndex]}>#</Text>
        {setColumns[kind].map((column) => (
          <Text key={column} style={[styles.setHeaderText, styles.colField]}>
            {column}
          </Text>
        ))}
        <Text style={[styles.setHeaderText, styles.colCheck]}> </Text>
      </View>

      {item.sets.map((set, index) => (
        <SetRow
          index={index + 1}
          key={set.id}
          kind={kind}
          onChange={onChange}
          onToggleDone={(done) => onToggleDone(done, target?.restSec ?? undefined)}
          set={set}
        />
      ))}

      <View style={styles.cardActions}>
        <Pressable
          accessibilityLabel="Adicionar série"
          accessibilityRole="button"
          onPress={async () => {
            await addSet(item.id);
            await onChange();
          }}
          style={({ pressed }) => [styles.addSet, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.accent.primary} name="add" size={16} />
          <Text style={styles.addSetText}>Série</Text>
        </Pressable>
        {item.sets.length ? (
          <Pressable
            accessibilityLabel="Remover a última série"
            accessibilityRole="button"
            onPress={async () => {
              await deleteSet(item.sets[item.sets.length - 1].id);
              await onChange();
            }}
            style={({ pressed }) => [styles.removeSet, pressed ? styles.pressed : null]}>
            <Text style={styles.removeSetText}>Remover última</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// O alvo do exercício: séries × repetições, a carga sugerida (só no plano da IA), o descanso e a observação.
// As séries nascem com a carga da última vez; a sugestão fica à vista para a pessoa ajustar.
function PlanTarget({ source, target }: { source: 'ai' | 'coach'; target: Target }) {
  const styles = useStyles();
  const { theme } = useTheme();
  // Zero é pedido de propósito (bi-set): sem descanso entre um exercício e o outro.
  const rest =
    target.restSec === null ? null : target.restSec > 0 ? `descanso ${restLabel(target.restSec)}` : 'sem descanso';
  const weight = target.targetWeightKg ? `carga sugerida ${kgLabel(target.targetWeightKg)}` : null;
  const label = [
    `${source === 'ai' ? 'Sugerido pela IA' : 'Alvo do personal'}: ${target.sets} ${target.sets === 1 ? 'série' : 'séries'} de ${target.reps}`,
    weight,
    rest,
    target.note ? `observação: ${target.note}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View accessibilityLabel={label} accessible style={styles.target}>
      <View style={styles.targetRow}>
        <View style={[styles.targetChip, { backgroundColor: withAlpha(theme.domain.treino, 0.14) }]}>
          <Ionicons color={theme.domain.treino} name="flag-outline" size={13} />
          <Text style={[styles.targetChipText, { color: theme.domain.treino }]}>{planTarget(target)}</Text>
        </View>
        {weight ? (
          <View style={styles.targetChip}>
            <Ionicons color={theme.text.secondary} name="barbell-outline" size={13} />
            <Text style={styles.targetChipText}>{weight}</Text>
          </View>
        ) : null}
        {rest ? (
          <View style={styles.targetChip}>
            <Ionicons color={theme.text.secondary} name="timer-outline" size={13} />
            <Text style={styles.targetChipText}>{rest}</Text>
          </View>
        ) : null}
      </View>
      {target.note ? <Text style={styles.targetNote}>{target.note}</Text> : null}
    </View>
  );
}

function SetRow({
  index,
  kind,
  onChange,
  onToggleDone,
  set,
}: {
  index: number;
  kind: ExerciseKind;
  onChange: () => Promise<void>;
  onToggleDone: (set: WorkoutSet) => Promise<void>;
  set: WorkoutSet;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  // O primeiro campo é a carga na força e os minutos no cardio e no tempo. O segundo (repetições ou
  // quilômetros) não existe no tempo: ali a série é só quanto durou.
  const isStrength = kind === 'forca';
  const isCardio = kind === 'cardio';
  const hasSecondField = kind !== 'tempo';
  const first = isStrength ? set.weightKg : set.durationSec && set.durationSec / 60;
  const second = isCardio ? set.distanceM && set.distanceM / 1000 : set.reps;
  const firstLimit = isStrength ? MAX_WEIGHT_KG : MAX_MINUTES;
  const secondLimit = isCardio ? MAX_DISTANCE_KM : MAX_REPS;
  // Campos controlados: o texto digitado vive aqui. Num campo não controlado, qualquer
  // mudança de estilo (o vermelho abaixo) devolvia o texto ao valor inicial no Android.
  const [firstText, setFirstText] = useState(first ? String(first) : '');
  const [secondText, setSecondText] = useState(second ? String(second) : '');
  // Limites de bom senso: acima disso é erro de digitação (6000 kg em vez de 60). O valor
  // não é salvo, e o campo fica vermelho até ser corrigido.
  const firstTooBig = exceeds(firstText, firstLimit);
  const secondTooBig = exceeds(secondText, secondLimit);

  // Salvamos a cada tecla (e não só ao sair do campo) porque o gesto real é
  // digitar a carga, as repetições e tocar no check em seguida. As escritas são
  // enfileiradas no serviço, então o valor já está no banco quando o recorde é
  // calculado. O `onEndEditing` só atualiza os totais da tela.
  function parse(value: string) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) && value.trim() !== '' ? parsed : undefined;
  }

  function exceeds(text: string, limit: number) {
    const value = parse(text);
    return value !== undefined && value > limit;
  }

  return (
    <View style={[styles.setRow, set.done ? styles.setRowDone : null]}>
      <View style={styles.colIndex}>
        {set.isPr ? (
          <Ionicons color={theme.domain.conquista} name="trophy" size={14} />
        ) : (
          <Text style={styles.setIndex}>{index}</Text>
        )}
      </View>
      <TextInput
        accessibilityHint={firstTooBig ? 'Valor alto demais, não foi salvo.' : undefined}
        accessibilityLabel={isStrength ? `Carga da série ${index} em quilos` : `Minutos da série ${index}`}
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          setFirstText(text);

          if (exceeds(text, firstLimit)) {
            return;
          }

          const value = parse(text);
          void updateSet(
            set.id,
            isStrength ? { weightKg: value } : { durationSec: value ? Math.round(value * 60) : undefined },
          );
        }}
        onEndEditing={() => {
          void onChange();
        }}
        placeholder="—"
        placeholderTextColor={theme.text.muted}
        style={[styles.setInput, styles.colField, firstTooBig ? styles.setInputInvalid : null]}
        value={firstText}
      />
      {hasSecondField ? (
        <TextInput
          accessibilityHint={secondTooBig ? 'Valor alto demais, não foi salvo.' : undefined}
          accessibilityLabel={isCardio ? `Quilômetros da série ${index}` : `Repetições da série ${index}`}
          // Repetição é número inteiro: sem vírgula no teclado.
          keyboardType={isCardio ? 'decimal-pad' : 'number-pad'}
          onChangeText={(text) => {
            setSecondText(text);

            if (exceeds(text, secondLimit)) {
              return;
            }

            const value = parse(text);
            void updateSet(
              set.id,
              isCardio
                ? { distanceM: value ? Math.round(value * 1000) : undefined }
                : { reps: value === undefined ? undefined : Math.round(value) },
            );
          }}
          onEndEditing={() => {
            void onChange();
          }}
          placeholder="—"
          placeholderTextColor={theme.text.muted}
          style={[styles.setInput, styles.colField, secondTooBig ? styles.setInputInvalid : null]}
          value={secondText}
        />
      ) : null}
      <Pressable
        accessibilityLabel={set.done ? `Desmarcar série ${index}` : `Concluir série ${index}`}
        accessibilityRole="button"
        accessibilityState={{ checked: set.done }}
        hitSlop={8}
        onPress={() => onToggleDone(set)}
        style={({ pressed }) => [
          styles.check,
          set.done ? styles.checkDone : null,
          pressed ? styles.pressed : null,
        ]}>
        <Ionicons
          color={set.done ? theme.accent.onPrimary : theme.text.muted}
          name="checkmark"
          size={16}
        />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  header: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderBottomColor: theme.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerInfo: {
    flex: 1,
  },
  clock: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  headerMeta: {
    ...typography.caption,
    color: theme.text.muted,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  finishButton: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  finishText: {
    color: theme.accent.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  confirm: {
    backgroundColor: theme.bg.raised,
    borderColor: withAlpha(theme.status.danger, 0.4),
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
    margin: 16,
    padding: 14,
  },
  confirmText: {
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 10,
  },
  confirmCancelText: {
    color: theme.text.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: 'center',
  },
  confirmDelete: {
    backgroundColor: withAlpha(theme.status.danger, 0.18),
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  confirmDeleteText: {
    color: theme.status.danger,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  content: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: 560,
    paddingBottom: 120,
    paddingHorizontal: 16,
    paddingTop: 14,
    width: '100%',
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  cardSubtitle: {
    ...typography.caption,
    color: theme.text.muted,
  },
  planBanner: {
    alignItems: 'flex-start',
    backgroundColor: withAlpha(theme.domain.treino, 0.1),
    borderColor: withAlpha(theme.domain.treino, 0.35),
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  // Alinha o ícone com a primeira linha do texto ao lado.
  planIcon: {
    marginTop: 1,
  },
  planText: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  planNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  target: {
    gap: 6,
    paddingTop: 2,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  targetChipText: {
    color: theme.text.secondary,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  targetNote: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  setHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  setHeaderText: {
    ...typography.caption,
    color: theme.text.muted,
    textAlign: 'center',
  },
  setRow: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  setRowDone: {
    backgroundColor: theme.accent.soft,
  },
  colIndex: {
    alignItems: 'center',
    width: 28,
  },
  colField: {
    flex: 1,
  },
  colCheck: {
    width: 44,
  },
  setIndex: {
    color: theme.text.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  setInput: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 17,
    height: 46,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  setInputInvalid: {
    borderColor: theme.status.danger,
    borderWidth: 1,
    color: theme.status.danger,
  },
  check: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    height: 46,
    justifyContent: 'center',
    width: 44,
  },
  checkDone: {
    backgroundColor: theme.accent.primary,
  },
  cardActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 6,
  },
  addSet: {
    alignItems: 'center',
    backgroundColor: theme.accent.soft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSetText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  removeSet: {
    paddingVertical: 8,
  },
  removeSetText: {
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  hint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  prToast: {
    alignSelf: 'center',
    backgroundColor: withAlpha(theme.domain.conquista, 0.2),
    borderColor: theme.domain.conquista,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 96,
    paddingHorizontal: 18,
    paddingVertical: 10,
    position: 'absolute',
  },
  prToastAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: withAlpha(theme.domain.conquista, 0.4),
  },
  prToastActionText: {
    color: theme.domain.conquista,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  prToastText: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  restBar: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.strong,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: 20,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 16,
  },
  restText: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  restAction: {
    backgroundColor: theme.bg.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  restActionText: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.75,
  },
}));
