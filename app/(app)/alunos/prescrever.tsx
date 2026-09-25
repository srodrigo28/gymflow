import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import { router, useLocalSearchParams, useNavigation, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { modalities, modalityLabels } from '@/src/constants/modalities';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { createPlan, listPlans, updatePlan } from '@/src/services/coaching';
import { listExercises } from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { PlanExercise, PlanInput, TrainingPlan } from '@/src/types/coaching';
import type { Exercise, Modality, MuscleGroup } from '@/src/types/training';
import { muscleLabel } from '@/src/utils/format';

// A prescrição do personal: de 1 a 7 dias, cada um com exercícios do catálogo do app, séries,
// repetições como texto ("10", "8-12", "30 s"), descanso e observação. O aluno vê no celular, registra o
// treino, e o personal enxerga o que aconteceu de verdade.

// Os limites são os da API: a tela não deixa passar do que o servidor recusaria.
const LIMITS = {
  dayTitle: 40,
  days: 7,
  exerciseNote: 200,
  exercisesPerDay: 20,
  name: 60,
  note: 500,
  reps: 20,
  restSec: 600,
  sets: 10,
} as const;

const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
// 0 = segunda … 6 = domingo, como a prescrição guarda.
const WEEKDAYS: { label: string; spoken: string }[] = [
  { label: 'Seg', spoken: 'segunda' },
  { label: 'Ter', spoken: 'terça' },
  { label: 'Qua', spoken: 'quarta' },
  { label: 'Qui', spoken: 'quinta' },
  { label: 'Sex', spoken: 'sexta' },
  { label: 'Sáb', spoken: 'sábado' },
  { label: 'Dom', spoken: 'domingo' },
];
// A musculação aparece por grupo muscular, na mesma ordem da escolha de exercícios do treino.
const MUSCLES: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'corpo-todo'];

type DraftExercise = {
  exerciseId: string;
  // Só para a lista da tela: o mesmo exercício pode aparecer em dias diferentes.
  key: string;
  kind: string;
  modality: Modality;
  muscle: string;
  name: string;
  note: string;
  reps: string;
  restSec: string;
  sets: number;
};

type DraftDay = { exercises: DraftExercise[]; key: string; title: string; weekday: number | null };

type Draft = { days: DraftDay[]; name: string; note: string };

let keySeed = 0;

function nextKey() {
  keySeed += 1;

  return `k${keySeed}`;
}

// Rotas novas, que ainda não estão nos tipos gerados do expo-router.
const route = (path: string) => path as unknown as Href;

// As mensagens da API já vêm prontas para a tela: a do 400 diz o campo, a do 403 diz que o aluno não é
// seu. Qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

// No navegador o Alert do React Native não aparece; lá vale a confirmação do próprio navegador.
function askToConfirm(title: string, message: string, action: string, onConfirm: () => void, cancel = 'Cancelar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: cancel },
    { onPress: onConfirm, style: 'destructive', text: action },
  ]);
}

// Busca sem acento e sem maiúscula: "natacao" acha "Natação".
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Linha de apoio do exercício: o grupo muscular na musculação; nas outras modalidades, o nome dela. */
function groupLabel(exercise: { modality: Modality; muscle: string }) {
  return exercise.modality === 'musculacao'
    ? muscleLabel(exercise.muscle)
    : (modalityLabels[exercise.modality] ?? muscleLabel(exercise.muscle));
}

// O primeiro "Treino X" que ainda não está em uso: tirar o dia A e pôr outro não cria dois dias B.
function nextDayTitle(days: DraftDay[]) {
  const letter = DAY_LETTERS.find((item) => !days.some((day) => day.title.trim() === `Treino ${item}`));

  return letter ? `Treino ${letter}` : '';
}

function newDay(days: DraftDay[]): DraftDay {
  return { exercises: [], key: nextKey(), title: nextDayTitle(days), weekday: null };
}

function emptyDraft(): Draft {
  return { days: [newDay([])], name: '', note: '' };
}

// Um ponto de partida que o personal ajusta: força em séries e repetições; cardio e práticas de tempo
// numa série só, com a meta em minutos.
function fromCatalog(exercise: Exercise): DraftExercise {
  const isStrength = exercise.kind === 'forca';

  return {
    exerciseId: exercise.id,
    key: nextKey(),
    kind: exercise.kind,
    modality: exercise.modality,
    muscle: exercise.muscle,
    name: exercise.name,
    note: '',
    reps: isStrength ? '10' : exercise.kind === 'cardio' ? '20 min' : '30 min',
    restSec: isStrength ? '60' : '',
    sets: isStrength ? 3 : 1,
  };
}

function fromPlanExercise(exercise: PlanExercise): DraftExercise {
  return {
    exerciseId: exercise.exerciseId,
    key: nextKey(),
    kind: exercise.kind,
    modality: exercise.modality,
    muscle: exercise.muscle,
    name: exercise.name,
    note: exercise.note ?? '',
    reps: exercise.reps,
    restSec: exercise.restSec === null ? '' : String(exercise.restSec),
    sets: exercise.sets,
  };
}

function draftOf(plan: TrainingPlan): Draft {
  return {
    days: plan.days.map((day) => ({
      exercises: day.exercises.map(fromPlanExercise),
      key: nextKey(),
      title: day.title,
      weekday: day.weekday,
    })),
    name: plan.name,
    note: plan.note ?? '',
  };
}

// O que vai para a API: texto aparado, campo opcional vazio vira null. O `active` fica de fora: na
// edição o servidor mantém o que a prescrição já tinha, e uma nova nasce ativa.
function toInput(draft: Draft): PlanInput {
  return {
    days: draft.days.map((day) => ({
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        kind: exercise.kind,
        modality: exercise.modality,
        muscle: exercise.muscle,
        name: exercise.name,
        note: exercise.note.trim() || null,
        reps: exercise.reps.trim(),
        restSec: exercise.restSec ? Number(exercise.restSec) : null,
        sets: exercise.sets,
      })),
      title: day.title.trim(),
      weekday: day.weekday,
    })),
    name: draft.name.trim(),
    note: draft.note.trim() || null,
  };
}

// As mesmas regras da API, com a frase dizendo o dia e o exercício: é mais rápido achar o que falta.
function validate(draft: Draft) {
  if (draft.name.trim().length < 2) {
    return 'Dê um nome à prescrição.';
  }

  for (let index = 0; index < draft.days.length; index += 1) {
    const day = draft.days[index];
    const label = day.title.trim() || `Dia ${index + 1}`;

    if (!day.title.trim()) {
      return `Dia ${index + 1}: dê um nome ao dia (ex.: Treino A).`;
    }

    if (!day.exercises.length) {
      return `${label}: escolha pelo menos um exercício.`;
    }

    for (const exercise of day.exercises) {
      if (!exercise.reps.trim()) {
        return `${label}: informe as repetições de ${exercise.name} (ex.: 8-12 ou 30 s).`;
      }

      if (exercise.restSec && Number(exercise.restSec) > LIMITS.restSec) {
        return `${label}: o descanso de ${exercise.name} vai até ${LIMITS.restSec} segundos (10 minutos).`;
      }
    }
  }

  return null;
}

export default function PrescreverScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const token = session?.token;
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ planId?: string; studentId: string }>();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const planId = typeof params.planId === 'string' && params.planId ? params.planId : null;
  const [draft, setDraft] = useState<Draft | null>(() => (planId ? null : emptyDraft()));
  // O formulário como chegou (vazio ou a prescrição salva), para saber se há algo a perder ao sair.
  const [snapshot, setSnapshot] = useState<string | null>(() =>
    planId ? null : JSON.stringify(toInput(emptyDraft())),
  );
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pickerDayKey, setPickerDayKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Depois de salvar, a saída não pede confirmação.
  const leavingRef = useRef(false);
  const isDirty = draft !== null && snapshot !== null && JSON.stringify(toInput(draft)) !== snapshot;

  // O catálogo é o do app, o mesmo da escolha de exercícios do treino.
  useEffect(() => {
    let active = true;

    listExercises()
      .then((list) => {
        if (active) {
          setCatalog(list);
        }
      })
      .catch(() => {
        if (active) {
          setCatalogError('Não foi possível abrir o catálogo de exercícios. Feche a tela e tente de novo.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Não há rota para uma prescrição só: ela vem da lista das prescrições do aluno.
  useEffect(() => {
    if (!planId || !token || !studentId) {
      return;
    }

    let active = true;
    setLoadError(null);

    listPlans(token, studentId)
      .then((plans) => {
        if (!active) {
          return;
        }

        const plan = plans.find((item) => item.id === planId);

        if (!plan) {
          setLoadError('Prescrição não encontrada: ela pode ter sido apagada.');
          return;
        }

        const next = draftOf(plan);
        setDraft(next);
        setSnapshot(JSON.stringify(toInput(next)));
        setStudentName(plan.student.name);
      })
      .catch((reason) => {
        if (active) {
          setLoadError(messageOf(reason, 'Não foi possível carregar a prescrição.'));
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, planId, studentId, token]);

  usePreventRemove(isDirty, ({ data }) => {
    if (leavingRef.current) {
      navigation.dispatch(data.action);
      return;
    }

    askToConfirm(
      'Sair sem salvar?',
      'O que você montou nesta prescrição não fica guardado.',
      'Sair sem salvar',
      () => navigation.dispatch(data.action),
      'Continuar editando',
    );
  });

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(route(`/(app)/alunos/${encodeURIComponent(studentId)}`));
    }
  }

  // Toda mudança passa por aqui: o aviso de erro do último "Salvar" sai assim que a pessoa corrige algo.
  function change(update: (current: Draft) => Draft) {
    setDraft((current) => (current ? update(current) : current));
    setError(null);
  }

  function updateDay(dayKey: string, patch: Partial<Omit<DraftDay, 'key'>>) {
    change((current) => ({
      ...current,
      days: current.days.map((day) => (day.key === dayKey ? { ...day, ...patch } : day)),
    }));
  }

  function updateExercises(dayKey: string, update: (exercises: DraftExercise[]) => DraftExercise[]) {
    change((current) => ({
      ...current,
      days: current.days.map((day) => (day.key === dayKey ? { ...day, exercises: update(day.exercises) } : day)),
    }));
  }

  function updateExercise(dayKey: string, exerciseKey: string, patch: Partial<Omit<DraftExercise, 'key'>>) {
    updateExercises(dayKey, (exercises) =>
      exercises.map((exercise) => (exercise.key === exerciseKey ? { ...exercise, ...patch } : exercise)),
    );
  }

  function moveExercise(dayKey: string, exerciseKey: string, offset: -1 | 1) {
    updateExercises(dayKey, (exercises) => {
      const from = exercises.findIndex((exercise) => exercise.key === exerciseKey);
      const to = from + offset;

      if (from < 0 || to < 0 || to >= exercises.length) {
        return exercises;
      }

      const next = [...exercises];
      [next[from], next[to]] = [next[to], next[from]];

      return next;
    });
  }

  // Na escolha, tocar marca e desmarca: o mesmo exercício não entra duas vezes no mesmo dia.
  function toggleExercise(dayKey: string, exercise: Exercise) {
    updateExercises(dayKey, (exercises) => {
      if (exercises.some((item) => item.exerciseId === exercise.id)) {
        return exercises.filter((item) => item.exerciseId !== exercise.id);
      }

      return exercises.length >= LIMITS.exercisesPerDay ? exercises : [...exercises, fromCatalog(exercise)];
    });
  }

  function addDay() {
    change((current) =>
      current.days.length >= LIMITS.days ? current : { ...current, days: [...current.days, newDay(current.days)] },
    );
  }

  function removeDay(day: DraftDay, index: number) {
    const remove = () => change((current) => ({ ...current, days: current.days.filter((item) => item.key !== day.key) }));

    if (!day.exercises.length) {
      remove();
      return;
    }

    askToConfirm(
      `Tirar ${day.title.trim() || `o dia ${index + 1}`}?`,
      'Os exercícios deste dia saem da prescrição.',
      'Tirar dia',
      remove,
    );
  }

  async function save() {
    if (!token || !studentId || !draft) {
      return;
    }

    const problem = validate(draft);

    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const input = toInput(draft);

      if (planId) {
        await updatePlan(token, planId, input);
      } else {
        await createPlan(token, studentId, input);
      }

      leavingRef.current = true;
      goBack();
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível salvar a prescrição.'));
      setIsSaving(false);
    }
  }

  const pickerDay = draft?.days.find((day) => day.key === pickerDayKey) ?? null;
  const pickerIndex = draft && pickerDay ? draft.days.indexOf(pickerDay) : -1;

  return (
    <Screen edges={['top', 'right', 'left']}>
      <KeyboardAwareScrollView
        bottomOffset={120}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
          </Pressable>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.title}>
              {planId ? 'Editar prescrição' : 'Nova prescrição'}
            </Text>
            {studentName ? <Text style={styles.subtitle}>Para {studentName}</Text> : null}
          </View>
        </View>

        {!studentId ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            Não deu para saber para qual aluno é a prescrição. Volte e abra de novo pelo aluno.
          </Text>
        ) : null}

        {loadError ? (
          <>
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {loadError}
            </Text>
            <Button icon="refresh" onPress={() => setAttempt((value) => value + 1)} title="Tentar de novo" variant="outline" />
          </>
        ) : null}

        {!draft && !loadError && studentId ? (
          <ActivityIndicator accessibilityLabel="Carregando a prescrição" color={theme.accent.primary} style={styles.loading} />
        ) : null}

        {draft && studentId ? (
          <>
            <Text style={styles.intro}>
              De 1 a {LIMITS.days} dias. A prescrição aparece no celular do aluno na hora de treinar, e o que ele fizer
              (cargas, séries, o que ficou de fora) volta para você.
            </Text>

            <View style={styles.card}>
              <Input
                autoCapitalize="sentences"
                label="Nome da prescrição"
                maxLength={LIMITS.name}
                onChangeText={(name) => change((current) => ({ ...current, name }))}
                placeholder="Ex.: Hipertrofia de outubro"
                value={draft.name}
              />
              <TextArea
                label="Observação (opcional)"
                maxLength={LIMITS.note}
                onChangeText={(note) => change((current) => ({ ...current, note }))}
                placeholder="Orientações gerais: aquecimento, progressão, cuidados."
                value={draft.note}
              />
            </View>

            {draft.days.map((day, index) => (
              <DayEditor
                canRemove={draft.days.length > 1}
                day={day}
                index={index}
                key={day.key}
                onChangeDay={(patch) => updateDay(day.key, patch)}
                onChangeExercise={(exerciseKey, patch) => updateExercise(day.key, exerciseKey, patch)}
                onMoveExercise={(exerciseKey, offset) => moveExercise(day.key, exerciseKey, offset)}
                onOpenPicker={() => setPickerDayKey(day.key)}
                onRemove={() => removeDay(day, index)}
                onRemoveExercise={(exerciseKey) =>
                  updateExercises(day.key, (exercises) => exercises.filter((item) => item.key !== exerciseKey))
                }
              />
            ))}

            {draft.days.length < LIMITS.days ? (
              <Button icon="add" onPress={addDay} title="Adicionar dia" variant="outline" />
            ) : (
              <Text style={styles.caption}>A prescrição chegou ao máximo de {LIMITS.days} dias.</Text>
            )}

            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button
              icon="checkmark"
              loading={isSaving}
              onPress={() => void save()}
              title={planId ? 'Salvar alterações' : 'Salvar prescrição'}
            />
          </>
        ) : null}
      </KeyboardAwareScrollView>

      <ExercisePicker
        catalog={catalog}
        catalogError={catalogError}
        day={pickerDay}
        dayLabel={pickerDay ? pickerDay.title.trim() || `Dia ${pickerIndex + 1}` : ''}
        onClose={() => setPickerDayKey(null)}
        onToggle={(exercise) => {
          if (pickerDay) {
            toggleExercise(pickerDay.key, exercise);
          }
        }}
      />
    </Screen>
  );
}

type DayEditorProps = {
  canRemove: boolean;
  day: DraftDay;
  index: number;
  onChangeDay: (patch: Partial<Omit<DraftDay, 'key'>>) => void;
  onChangeExercise: (exerciseKey: string, patch: Partial<Omit<DraftExercise, 'key'>>) => void;
  onMoveExercise: (exerciseKey: string, offset: -1 | 1) => void;
  onOpenPicker: () => void;
  onRemove: () => void;
  onRemoveExercise: (exerciseKey: string) => void;
};

function DayEditor({
  canRemove,
  day,
  index,
  onChangeDay,
  onChangeExercise,
  onMoveExercise,
  onOpenPicker,
  onRemove,
  onRemoveExercise,
}: DayEditorProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const dayName = day.title.trim() || `dia ${index + 1}`;

  return (
    <View style={styles.card}>
      <View style={styles.dayTop}>
        <Text accessibilityRole="header" style={styles.overline}>
          Dia {index + 1}
        </Text>
        {canRemove ? (
          <Pressable
            accessibilityLabel={`Tirar ${dayName} da prescrição`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onRemove}
            style={({ pressed }) => [styles.textAction, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.secondary} name="trash-outline" size={16} />
            <Text style={styles.textActionLabel}>Tirar dia</Text>
          </Pressable>
        ) : null}
      </View>

      <Input
        autoCapitalize="sentences"
        label="Nome do dia"
        maxLength={LIMITS.dayTitle}
        onChangeText={(title) => onChangeDay({ title })}
        placeholder="Ex.: Treino A, Pernas"
        value={day.title}
      />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Dia da semana (opcional)</Text>
        <View accessibilityLabel={`Dia da semana de ${dayName}`} accessibilityRole="radiogroup" style={styles.weekdays}>
          <WeekdayChip
            label="Sem dia"
            onPress={() => onChangeDay({ weekday: null })}
            selected={day.weekday === null}
            spoken="Sem dia fixo"
          />
          {WEEKDAYS.map((item, weekday) => (
            <WeekdayChip
              key={item.label}
              label={item.label}
              onPress={() => onChangeDay({ weekday })}
              selected={day.weekday === weekday}
              spoken={item.spoken}
            />
          ))}
        </View>
      </View>

      {day.exercises.length ? (
        day.exercises.map((exercise, position) => (
          <ExerciseEditor
            exercise={exercise}
            isFirst={position === 0}
            isLast={position === day.exercises.length - 1}
            key={exercise.key}
            onChange={(patch) => onChangeExercise(exercise.key, patch)}
            onMove={(offset) => onMoveExercise(exercise.key, offset)}
            onRemove={() => onRemoveExercise(exercise.key)}
            position={position + 1}
          />
        ))
      ) : (
        <Text style={styles.empty}>Nenhum exercício neste dia ainda.</Text>
      )}

      <Button
        icon="add"
        onPress={onOpenPicker}
        title={day.exercises.length ? 'Escolher mais exercícios' : 'Escolher exercícios'}
        variant="outline"
      />
    </View>
  );
}

function WeekdayChip({
  label,
  onPress,
  selected,
  spoken,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  spoken: string;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityLabel={spoken}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.weekday, selected ? styles.weekdayActive : null, pressed ? styles.pressed : null]}>
      <Text style={[styles.weekdayText, selected ? styles.weekdayTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

type ExerciseEditorProps = {
  exercise: DraftExercise;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Omit<DraftExercise, 'key'>>) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  position: number;
};

function ExerciseEditor({ exercise, isFirst, isLast, onChange, onMove, onRemove, position }: ExerciseEditorProps) {
  const styles = useStyles();
  const isStrength = exercise.kind === 'forca';

  return (
    <View style={styles.exercise}>
      <View style={styles.exerciseTop}>
        <Text style={styles.position}>{position}</Text>
        <View style={styles.flex}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.caption}>{groupLabel(exercise)}</Text>
        </View>
        <IconAction
          disabled={isFirst}
          icon="arrow-up"
          label={`Subir ${exercise.name} na ordem`}
          onPress={() => onMove(-1)}
        />
        <IconAction
          disabled={isLast}
          icon="arrow-down"
          label={`Descer ${exercise.name} na ordem`}
          onPress={() => onMove(1)}
        />
        <IconAction icon="close" label={`Tirar ${exercise.name} do dia`} onPress={onRemove} />
      </View>

      <View style={styles.fieldsRow}>
        <View style={styles.setsField}>
          <Text style={styles.fieldLabel}>Séries</Text>
          <View style={styles.stepper}>
            <IconAction
              disabled={exercise.sets <= 1}
              icon="remove"
              label={`Uma série a menos em ${exercise.name}`}
              onPress={() => onChange({ sets: exercise.sets - 1 })}
            />
            <Text
              accessibilityLabel={`${exercise.sets} ${exercise.sets === 1 ? 'série' : 'séries'}`}
              accessibilityLiveRegion="polite"
              style={styles.stepValue}>
              {exercise.sets}
            </Text>
            <IconAction
              disabled={exercise.sets >= LIMITS.sets}
              icon="add"
              label={`Uma série a mais em ${exercise.name}`}
              onPress={() => onChange({ sets: exercise.sets + 1 })}
            />
          </View>
        </View>
        <SmallField
          accessibilityLabel={`${isStrength ? 'Repetições' : 'Meta'} de ${exercise.name}`}
          label={isStrength ? 'Repetições' : 'Meta'}
          maxLength={LIMITS.reps}
          onChangeText={(reps) => onChange({ reps })}
          placeholder={isStrength ? '8-12' : '20 min'}
          value={exercise.reps}
        />
        <SmallField
          accessibilityLabel={`Descanso de ${exercise.name}, em segundos, opcional`}
          keyboardType="number-pad"
          label="Descanso (s)"
          maxLength={3}
          onChangeText={(text) => onChange({ restSec: text.replace(/\D/g, '') })}
          placeholder="60"
          value={exercise.restSec}
        />
      </View>

      <SmallField
        accessibilityLabel={`Observação de ${exercise.name}, opcional`}
        label="Observação (opcional)"
        maxLength={LIMITS.exerciseNote}
        onChangeText={(note) => onChange({ note })}
        placeholder="Ex.: descida lenta, 2 s"
        value={exercise.note}
        wide
      />
      {!isStrength ? <Text style={styles.caption}>Na meta, use tempo ou distância: “20 min”, “5 km”.</Text> : null}
    </View>
  );
}

function IconAction({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}>
      <Ionicons color={theme.text.primary} name={icon} size={18} />
    </Pressable>
  );
}

type SmallFieldProps = {
  accessibilityLabel: string;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  maxLength: number;
  onChangeText: (text: string) => void;
  placeholder: string;
  value: string;
  // Ocupa a linha toda (a observação); os outros dividem a linha e quebram quando não cabem.
  wide?: boolean;
};

function SmallField({ accessibilityLabel, keyboardType, label, maxLength, onChangeText, placeholder, value, wide = false }: SmallFieldProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={[styles.field, wide ? null : styles.smallField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        cursorColor={theme.accent.primary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        selectionColor={theme.accent.primary}
        style={styles.smallInput}
        value={value}
      />
    </View>
  );
}

type TextAreaProps = {
  label: string;
  maxLength: number;
  onChangeText: (text: string) => void;
  placeholder: string;
  value: string;
};

// Texto de várias linhas: o Input tem altura fixa de uma linha, curta demais para orientações.
function TextArea({ label, maxLength, onChangeText, placeholder, value }: TextAreaProps) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        cursorColor={theme.accent.primary}
        maxLength={maxLength}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        selectionColor={theme.accent.primary}
        style={styles.textArea}
        textAlignVertical="top"
        value={value}
      />
      <Text accessibilityLabel={`${value.length} de ${maxLength} caracteres`} style={styles.counter}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

type PickerGroup = { exercises: Exercise[]; key: string; title: string };

// Os grupos do catálogo na ordem das modalidades; a musculação, quebrada por grupo muscular.
function catalogGroups(catalog: Exercise[], term: string): PickerGroup[] {
  const matches = term
    ? catalog.filter((exercise) => normalize(exercise.name).includes(term) || normalize(exercise.equipment).includes(term))
    : catalog;
  const groups: PickerGroup[] = [];

  for (const modality of modalities) {
    const ofModality = matches.filter((exercise) => exercise.modality === modality.id);

    if (modality.id !== 'musculacao') {
      groups.push({ exercises: ofModality, key: modality.id, title: modality.label });
      continue;
    }

    for (const muscle of MUSCLES) {
      groups.push({
        exercises: ofModality.filter((exercise) => exercise.muscle === muscle),
        key: `musculacao-${muscle}`,
        title: `${modality.label} · ${muscleLabel(muscle)}`,
      });
    }

    // Um grupo muscular novo no catálogo não some da escolha.
    groups.push({
      exercises: ofModality.filter((exercise) => !MUSCLES.includes(exercise.muscle)),
      key: 'musculacao-outros',
      title: modality.label,
    });
  }

  return groups.filter((group) => group.exercises.length > 0);
}

type ExercisePickerProps = {
  catalog: Exercise[] | null;
  catalogError: string | null;
  day: DraftDay | null;
  dayLabel: string;
  onClose: () => void;
  onToggle: (exercise: Exercise) => void;
};

function ExercisePicker({ catalog, catalogError, day, dayLabel, onClose, onToggle }: ExercisePickerProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const term = normalize(search.trim());
  const groups = useMemo(() => (catalog ? catalogGroups(catalog, term) : []), [catalog, term]);
  const chosen = new Set(day?.exercises.map((exercise) => exercise.exerciseId) ?? []);
  const isFull = (day?.exercises.length ?? 0) >= LIMITS.exercisesPerDay;

  function close() {
    setSearch('');
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={close}
      statusBarTranslucent
      visible={day !== null}>
      <View style={[styles.picker, { paddingBottom: insets.bottom + 12, paddingTop: insets.top + 8 }]}>
        <View style={styles.pickerHeader}>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.pickerTitle}>
              Exercícios
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {dayLabel}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Fechar a escolha de exercícios"
            accessibilityRole="button"
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Ionicons color={theme.text.primary} name="close" size={22} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons color={theme.text.muted} name="search" size={18} />
          <TextInput
            accessibilityHint="Procura em todas as modalidades"
            accessibilityLabel="Buscar exercício"
            autoCorrect={false}
            cursorColor={theme.accent.primary}
            onChangeText={setSearch}
            placeholder="Buscar exercício"
            placeholderTextColor={theme.text.muted}
            selectionColor={theme.accent.primary}
            style={styles.searchInput}
            value={search}
          />
        </View>

        <ScrollView contentContainerStyle={styles.pickerList} keyboardShouldPersistTaps="handled">
          {catalogError ? <Text style={styles.error}>{catalogError}</Text> : null}
          {!catalog && !catalogError ? (
            <ActivityIndicator accessibilityLabel="Carregando o catálogo" color={theme.accent.primary} />
          ) : null}
          {catalog && !groups.length ? <Text style={styles.empty}>Nenhum exercício encontrado.</Text> : null}

          {groups.map((group) => (
            <View key={group.key} style={styles.pickerGroup}>
              <Text accessibilityRole="header" style={styles.overline}>
                {group.title}
              </Text>
              {group.exercises.map((exercise) => {
                const isChosen = chosen.has(exercise.id);
                const isBlocked = isFull && !isChosen;

                return (
                  <Pressable
                    accessibilityLabel={`${exercise.name}, ${exercise.equipment}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChosen, disabled: isBlocked }}
                    disabled={isBlocked}
                    key={exercise.id}
                    onPress={() => onToggle(exercise)}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      isChosen ? styles.pickerItemChosen : null,
                      isBlocked ? styles.disabled : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <View style={styles.flex}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.caption}>
                        {groupLabel(exercise)} · {exercise.equipment}
                      </Text>
                    </View>
                    <Ionicons
                      color={isChosen ? theme.accent.primary : theme.text.muted}
                      name={isChosen ? 'checkbox' : 'square-outline'}
                      size={24}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.pickerFooter}>
          <Text accessibilityLiveRegion="polite" style={styles.caption}>
            {isFull
              ? `Chegou ao máximo de ${LIMITS.exercisesPerDay} exercícios neste dia.`
              : `${chosen.size} ${chosen.size === 1 ? 'exercício' : 'exercícios'} neste dia. Toque de novo para tirar.`}
          </Text>
          <Button onPress={close} title="Pronto" />
        </View>
      </View>
    </Modal>
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
    ...typography.h2,
    color: theme.text.primary,
  },
  subtitle: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  intro: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  loading: {
    marginVertical: 32,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  overline: {
    ...typography.overline,
    color: theme.text.muted,
  },
  dayTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  textActionLabel: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.caption,
    color: theme.text.primary,
  },
  weekdays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weekday: {
    alignItems: 'center',
    backgroundColor: theme.bg.raised,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: 10,
  },
  weekdayActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  weekdayText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  weekdayTextActive: {
    color: theme.accent.onPrimary,
  },
  exercise: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.sm,
    gap: 10,
    padding: 12,
  },
  exerciseTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  position: {
    color: theme.text.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 18,
  },
  exerciseName: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  setsField: {
    gap: 6,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 44,
  },
  stepValue: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    textAlign: 'center',
  },
  smallField: {
    flexGrow: 1,
    minWidth: 88,
  },
  smallInput: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 15,
    height: 44,
    paddingHorizontal: 12,
  },
  textArea: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: theme.text.primary,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  counter: {
    alignSelf: 'flex-end',
    color: theme.text.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  picker: {
    backgroundColor: theme.bg.base,
    flex: 1,
    gap: 12,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  pickerTitle: {
    ...typography.h2,
    color: theme.text.primary,
  },
  searchRow: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    marginHorizontal: 20,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  pickerList: {
    gap: 18,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  pickerGroup: {
    gap: 8,
  },
  pickerItem: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pickerItemChosen: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  pickerFooter: {
    borderTopColor: theme.border.subtle,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
}));
