import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import {
  addSet,
  deleteSet,
  discardSession,
  finishSession,
  getSession,
  removeSessionExercise,
  toggleSetDone,
  updateSet,
} from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme, withAlpha } from '@/src/theme';
import type { SessionExercise, WorkoutSession, WorkoutSet } from '@/src/types/training';
import { formatDuration, muscleLabel } from '@/src/utils/format';

const REST_SECONDS = 90;
// Acima disso é erro de digitação. Ficam abaixo dos limites da API, senão o treino não subiria.
const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 1000;
const MAX_MINUTES = 24 * 60;
const MAX_DISTANCE_KM = 1000;

export default function SessaoScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<number | null>(null);
  const [prMessage, setPrMessage] = useState<string | null>(null);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const prTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A tela fica acesa durante o treino: ninguém quer desbloquear o celular a cada série.
  useKeepAwake();

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

  async function handleToggleDone(set: WorkoutSet) {
    const result = await toggleSetDone(set.id, !set.done);
    await load();

    if (!set.done) {
      setRest(REST_SECONDS);

      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(
          result.isPr ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
        );
      }

      if (result.isPr) {
        setPrMessage('Recorde pessoal! 🏆');
        clearTimeout(prTimer.current);
        prTimer.current = setTimeout(() => setPrMessage(null), 3500);
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

  const totalSets = session?.exercises.reduce((total, item) => total + item.sets.length, 0) ?? 0;
  const doneSets =
    session?.exercises.reduce((total, item) => total + item.sets.filter((set) => set.done).length, 0) ?? 0;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.clock}>{formatDuration(elapsed)}</Text>
          <Text style={styles.headerMeta}>
            {doneSets} de {totalSets} séries
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
        {session?.exercises.map((item) => (
          <ExerciseCard key={item.id} item={item} onChange={load} onToggleDone={handleToggleDone} />
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

      {prMessage ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.prToast}>
          <Text style={styles.prToastText}>{prMessage}</Text>
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
}: {
  item: SessionExercise;
  onChange: () => Promise<void>;
  onToggleDone: (set: WorkoutSet) => Promise<void>;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  const isCardio = item.exercise.kind === 'cardio';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{item.exercise.name}</Text>
          <Text style={styles.cardSubtitle}>
            {muscleLabel(item.exercise.muscle)} · {item.exercise.equipment}
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

      <View style={styles.setHeader}>
        <Text style={[styles.setHeaderText, styles.colIndex]}>#</Text>
        <Text style={[styles.setHeaderText, styles.colField]}>{isCardio ? 'min' : 'kg'}</Text>
        <Text style={[styles.setHeaderText, styles.colField]}>{isCardio ? 'km' : 'reps'}</Text>
        <Text style={[styles.setHeaderText, styles.colCheck]}> </Text>
      </View>

      {item.sets.map((set, index) => (
        <SetRow
          index={index + 1}
          isCardio={isCardio}
          key={set.id}
          onChange={onChange}
          onToggleDone={onToggleDone}
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

function SetRow({
  index,
  isCardio,
  onChange,
  onToggleDone,
  set,
}: {
  index: number;
  isCardio: boolean;
  onChange: () => Promise<void>;
  onToggleDone: (set: WorkoutSet) => Promise<void>;
  set: WorkoutSet;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  const first = isCardio ? set.durationSec && set.durationSec / 60 : set.weightKg;
  const second = isCardio ? set.distanceM && set.distanceM / 1000 : set.reps;
  // Campos controlados: o texto digitado vive aqui. Num campo não controlado, qualquer
  // mudança de estilo (o vermelho abaixo) devolvia o texto ao valor inicial no Android.
  const [firstText, setFirstText] = useState(first ? String(first) : '');
  const [secondText, setSecondText] = useState(second ? String(second) : '');
  // Limites de bom senso: acima disso é erro de digitação (6000 kg em vez de 60). O valor
  // não é salvo, e o campo fica vermelho até ser corrigido.
  const firstTooBig = exceeds(firstText, isCardio ? MAX_MINUTES : MAX_WEIGHT_KG);
  const secondTooBig = exceeds(secondText, isCardio ? MAX_DISTANCE_KM : MAX_REPS);

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
        accessibilityLabel={isCardio ? `Minutos da série ${index}` : `Carga da série ${index} em quilos`}
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          setFirstText(text);

          if (exceeds(text, isCardio ? MAX_MINUTES : MAX_WEIGHT_KG)) {
            return;
          }

          const value = parse(text);
          void updateSet(
            set.id,
            isCardio ? { durationSec: value ? Math.round(value * 60) : undefined } : { weightKg: value },
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
      <TextInput
        accessibilityHint={secondTooBig ? 'Valor alto demais, não foi salvo.' : undefined}
        accessibilityLabel={isCardio ? `Quilômetros da série ${index}` : `Repetições da série ${index}`}
        // Repetição é número inteiro: sem vírgula no teclado.
        keyboardType={isCardio ? 'decimal-pad' : 'number-pad'}
        onChangeText={(text) => {
          setSecondText(text);

          if (exceeds(text, isCardio ? MAX_DISTANCE_KM : MAX_REPS)) {
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
