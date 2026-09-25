import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { modalities } from '@/src/constants/modalities';
import { useSession } from '@/src/contexts/session-context';
import { ApiError } from '@/src/services/api';
import { getSchedule, saveSchedule } from '@/src/services/league';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { exerciseGroupLabel, listExercises } from '@/src/services/training';
import {
  createEmptyTrainingPreferences,
  focusMuscleOptions,
  getTrainingPreferences,
  saveTrainingPreferences,
  trainingCategories,
  trainingLocations,
} from '@/src/services/training-preferences';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { Schedule, ScheduleSlot } from '@/src/types/league';
import type { DayPeriod, OnboardingProfile, TrainingDuration } from '@/src/types/onboarding';
import type { Exercise } from '@/src/types/training';
import type {
  TrainingCategory,
  TrainingLocation,
  TrainingPreferences,
  TrainingPreferencesInput,
} from '@/src/types/training-preferences';
import { equipmentLabel, muscleLabel, trainingCategoryLabel, trainingLocationLabel } from '@/src/utils/format';

// O chip mostra só o nome; o leitor de tela recebe também o que a opção significa.
const locationHints: Record<TrainingLocation, string> = {
  academia: 'Máquinas, cabos, barras e halteres.',
  ar_livre: 'Corrida, caminhada e exercícios funcionais.',
  casa: 'Peso do corpo, elásticos e halteres simples.',
  misto: 'O lugar muda conforme o dia.',
};

const categoryHints: Record<TrainingCategory, string> = {
  alongamento: 'Soltar e alongar os músculos.',
  cardio: 'Esteira, bicicleta, corrida e corda.',
  funcional: 'Circuitos e movimentos com o peso do corpo.',
  mobilidade: 'Amplitude de movimento e articulações.',
  musculacao: 'Pesos, máquinas, barras e halteres.',
};

const durationLabels: Record<TrainingDuration, string> = {
  '30_to_45': '30 a 45 min',
  '45_to_60': '45 a 60 min',
  over_60: 'mais de 60 min',
  up_to_30: 'até 30 min',
};

const periodLabels: Record<DayPeriod, string> = {
  afternoon: 'Tarde',
  morning: 'Manhã',
  night: 'Noite',
  varies: 'Varia conforme o dia',
};

const periodIcons: Record<DayPeriod, keyof typeof Ionicons.glyphMap> = {
  afternoon: 'partly-sunny-outline',
  morning: 'sunny-outline',
  night: 'moon-outline',
  varies: 'shuffle-outline',
};

// Quanto tempo o "Salvo" fica visível depois de cada mudança.
const SAVED_HINT_MS = 1800;

// Agenda da semana, na ordem da API: 0 = segunda … 6 = domingo.
const weekdays = [
  { on: 'na segunda', short: 'Seg' },
  { on: 'na terça', short: 'Ter' },
  { on: 'na quarta', short: 'Qua' },
  { on: 'na quinta', short: 'Qui' },
  { on: 'na sexta', short: 'Sex' },
  { on: 'no sábado', short: 'Sáb' },
  { on: 'no domingo', short: 'Dom' },
];

// Os minutos andam de 15 em 15; a hora, de uma em uma.
const MINUTE_STEP = 15;
const DAY_MINUTES = 24 * 60;

// Valem até a agenda da conta chegar; depois, as regras vêm do servidor.
const defaultScheduleRules: Schedule['rules'] = { maxSlots: 7, minPastSlots: 4, windowMinutes: 90 };

// Hora sugerida ao marcar o primeiro dia, pelo período respondido no questionário.
const periodTimes: Record<DayPeriod, string> = {
  afternoon: '14:00',
  morning: '07:00',
  night: '19:00',
  varies: '18:00',
};

function minutesOf(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

function timeOf(totalMinutes: number) {
  const minutes = ((totalMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Um passo para cima ou para baixo, dando a volta na meia-noite. Os minutos encaixam na grade de 15:
// um 07:10 que veio da conta vai para 07:15 ou 07:00.
function stepTime(time: string, unit: 'hour' | 'minute', direction: 1 | -1) {
  const current = minutesOf(time);

  if (unit === 'hour') {
    return timeOf(current + direction * 60);
  }

  return timeOf(
    direction > 0
      ? Math.floor(current / MINUTE_STEP) * MINUTE_STEP + MINUTE_STEP
      : Math.ceil(current / MINUTE_STEP) * MINUTE_STEP - MINUTE_STEP,
  );
}

// Em ordem e sem repetição: é assim que a agenda vai para a conta e que duas versões se comparam.
function normalizeSlots(slots: ScheduleSlot[]) {
  const seen = new Set<string>();

  return [...slots]
    .sort((a, b) => a.weekday - b.weekday || minutesOf(a.time) - minutesOf(b.time))
    .filter((slot) => {
      const key = `${slot.weekday}-${slot.time}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function sameSlots(a: ScheduleSlot[], b: ScheduleSlot[]) {
  const key = (slots: ScheduleSlot[]) =>
    normalizeSlots(slots)
      .map((slot) => `${slot.weekday}-${slot.time}`)
      .join(',');

  return key(a) === key(b);
}

// 90 → "1 h 30"; 60 → "1 h"; 45 → "45 min".
function formatWindow(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) {
    return `${rest} min`;
  }

  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

// As mensagens da API já vêm prontas para a tela; qualquer outro erro vira uma frase nossa.
function messageOf(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

type RoutineRow = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string };

// Rotina, duração e período já foram respondidos no questionário: aqui só aparecem, sem repetir a pergunta.
function routineRows(profile: OnboardingProfile | null): RoutineRow[] {
  if (!profile) {
    return [];
  }

  const rows: RoutineRow[] = [];

  if (profile.trainingDaysPerWeek) {
    rows.push({ icon: 'calendar-outline', label: 'Rotina', value: `${profile.trainingDaysPerWeek}x por semana` });
  }

  if (profile.trainingDuration) {
    rows.push({ icon: 'time-outline', label: 'Duração', value: durationLabels[profile.trainingDuration] });
  }

  if (profile.preferredTrainingPeriod) {
    rows.push({
      icon: periodIcons[profile.preferredTrainingPeriod],
      label: 'Período',
      value: periodLabels[profile.preferredTrainingPeriod],
    });
  }

  return rows;
}

function toggleItem<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((current) => current !== item) : [...list, item];
}

export default function PreferenciasScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const token = session?.token;
  const [prefs, setPrefs] = useState<TrainingPreferences>(createEmptyTrainingPreferences);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  // Espelho do estado: toques em sequência partem sempre da versão mais nova, não da do último render.
  const prefsRef = useRef(prefs);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }

    const [saved, onboarding, catalog] = await Promise.all([
      getTrainingPreferences(userId),
      getOnboardingProfile(userId),
      listExercises(),
    ]);

    prefsRef.current = saved;
    setPrefs(saved);
    setProfile(onboarding);
    setExercises(catalog);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // Os equipamentos saem do catálogo: assim um exercício novo traz o equipamento dele junto.
  const equipmentOptions = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.equipment))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [exercises],
  );

  const favorites = useMemo(() => new Set(prefs.favoriteExerciseIds), [prefs.favoriteExerciseIds]);

  // Lista agrupada: a musculação por grupo muscular e cada outra modalidade num bloco, como na
  // escolha de exercícios. Com mais de 50 exercícios, os grupos guiam melhor que a ordem alfabética.
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const results = term
      ? exercises.filter(
          (exercise) => exercise.name.toLowerCase().includes(term) || exercise.equipment.includes(term),
        )
      : exercises;
    const strength = focusMuscleOptions.map((muscle) => ({
      items: results.filter((exercise) => exercise.modality === 'musculacao' && exercise.muscle === muscle),
      key: muscle,
      label: muscleLabel(muscle),
    }));
    const others = modalities
      .filter((modality) => modality.id !== 'musculacao')
      .map((modality) => ({
        items: results.filter((exercise) => exercise.modality === modality.id),
        key: modality.id,
        label: modality.label,
      }));

    return [...strength, ...others].filter((group) => group.items.length > 0);
  }, [exercises, search]);

  const rows = routineRows(profile);
  const suggestedTime = profile?.preferredTrainingPeriod ? periodTimes[profile.preferredTrainingPeriod] : '18:00';

  // Cada toque grava na hora; não existe botão Salvar.
  function commit(update: (current: TrainingPreferences) => Partial<TrainingPreferencesInput>) {
    if (!userId) {
      return;
    }

    const next = { ...prefsRef.current, ...update(prefsRef.current) };
    prefsRef.current = next;
    setPrefs(next);

    void saveTrainingPreferences(userId, next).then(() => {
      setIsSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setIsSaved(false), SAVED_HINT_MS);
    });
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            Escolhas de treinos
          </Text>
        </View>

        <View style={styles.introRow}>
          <Text style={styles.intro}>Suas escolhas ajustam a lista de exercícios e as recomendações.</Text>
          {/* A região viva fica sempre montada: o leitor de tela só anuncia mudanças em algo que já existia. */}
          <View accessibilityLiveRegion="polite" style={styles.savedSlot}>
            {isSaved ? (
              <>
                <Ionicons color={theme.status.success} name="checkmark-circle" size={16} />
                <Text style={styles.savedText}>Salvo</Text>
              </>
            ) : null}
          </View>
        </View>

        <ScheduleSection suggestedTime={suggestedTime} token={token} />

        <Section hint="Escolha um." title="Onde você treina">
          <View accessibilityRole="radiogroup" style={styles.chips}>
            {trainingLocations.map((location) => (
              <Chip
                accessibilityLabel={`${trainingLocationLabel(location)}. ${locationHints[location]}`}
                key={location}
                label={trainingLocationLabel(location)}
                onPress={() => commit((current) => ({ location: current.location === location ? null : location }))}
                role="radio"
                selected={prefs.location === location}
              />
            ))}
          </View>
        </Section>

        <Section hint="Pode marcar mais de um." title="Tipos de treino">
          <View style={styles.chips}>
            {trainingCategories.map((category) => (
              <Chip
                accessibilityLabel={`${trainingCategoryLabel(category)}. ${categoryHints[category]}`}
                key={category}
                label={trainingCategoryLabel(category)}
                onPress={() => commit((current) => ({ categories: toggleItem(current.categories, category) }))}
                role="checkbox"
                selected={prefs.categories.includes(category)}
              />
            ))}
          </View>
        </Section>

        <Section hint="Onde você quer mais atenção." title="Grupos em foco">
          <View style={styles.chips}>
            {focusMuscleOptions.map((muscle) => (
              <Chip
                key={muscle}
                label={muscleLabel(muscle)}
                onPress={() => commit((current) => ({ focusMuscles: toggleItem(current.focusMuscles, muscle) }))}
                role="checkbox"
                selected={prefs.focusMuscles.includes(muscle)}
              />
            ))}
          </View>
        </Section>

        <Section hint="O que costuma ter à mão." title="Equipamentos disponíveis">
          <View style={styles.chips}>
            {equipmentOptions.map((equipment) => (
              <Chip
                key={equipment}
                label={equipmentLabel(equipment)}
                onPress={() => commit((current) => ({ equipment: toggleItem(current.equipment, equipment) }))}
                role="checkbox"
                selected={prefs.equipment.includes(equipment)}
              />
            ))}
          </View>
        </Section>

        <Section
          hint={favorites.size ? `${favorites.size} ${favorites.size === 1 ? 'favorito' : 'favoritos'}` : undefined}
          title="Exercícios favoritos">
          <Input
            accessibilityLabel="Buscar exercício"
            autoCorrect={false}
            icon="search-outline"
            onChangeText={setSearch}
            placeholder="Buscar exercício"
            returnKeyType="search"
            value={search}
          />
          <Text style={styles.helper}>Favoritos aparecem primeiro na hora de montar o treino.</Text>
          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((exercise) => {
                const selected = favorites.has(exercise.id);

                return (
                  <Pressable
                    accessibilityLabel={`Favorito: ${exercise.name}. ${exerciseGroupLabel(exercise)}, ${exercise.equipment}.`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={exercise.id}
                    onPress={() =>
                      commit((current) => ({
                        favoriteExerciseIds: toggleItem(current.favoriteExerciseIds, exercise.id),
                      }))
                    }
                    style={({ pressed }) => [
                      styles.item,
                      selected ? styles.itemActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemName}>{exercise.name}</Text>
                      <Text style={styles.itemMeta}>
                        {exerciseGroupLabel(exercise)} · {exercise.equipment}
                      </Text>
                    </View>
                    <Ionicons
                      color={selected ? theme.accent.primary : theme.text.muted}
                      name={selected ? 'star' : 'star-outline'}
                      size={22}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {!groups.length && exercises.length ? <Text style={styles.empty}>Nenhum exercício encontrado.</Text> : null}
        </Section>

        {rows.length ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Do seu questionário
            </Text>
            {rows.map((row) => (
              <View accessibilityLabel={`${row.label}: ${row.value}`} accessible key={row.label} style={styles.infoRow}>
                <Ionicons color={theme.domain.treino} name={row.icon} size={18} />
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
            <Text style={styles.cardHint}>Respostas da avaliação inicial. Entram junto com as escolhas acima.</Text>
          </View>
        ) : null}

        <Text style={styles.privacy}>A agenda fica na sua conta. As outras escolhas ficam só neste aparelho.</Text>
      </ScrollView>
    </Screen>
  );
}

// Agenda da semana, para a pontualidade da temporada. Fica na conta, não no aparelho: por isso tem
// botão de salvar, ao contrário do resto da tela, que grava a cada toque.
function ScheduleSection({ suggestedTime, token }: { suggestedTime: string; token?: string }) {
  const styles = useStyles();
  const { theme } = useTheme();
  // `account` é a agenda como está na conta; `slots`, o que está marcado na tela.
  const [account, setAccount] = useState<Schedule | null>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Espelhos do estado: a resposta da conta pode chegar depois de a pessoa ter mexido na tela.
  const accountRef = useRef<Schedule | null>(null);
  const slotsRef = useRef<ScheduleSlot[]>([]);
  const rules = account?.rules ?? defaultScheduleRules;
  const hasChanges = account !== null && !sameSlots(slots, account.slots);
  const isFull = slots.length >= rules.maxSlots;
  const hasFreeDay = weekdays.some((_, weekday) => !slots.some((slot) => slot.weekday === weekday));
  const entries = slots.map((slot, index) => ({ index, slot }));

  const load = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const loaded = await getSchedule(token);
      // Uma mudança ainda não salva continua na tela: só a versão da conta é atualizada.
      const hasEdits = accountRef.current !== null && !sameSlots(slotsRef.current, accountRef.current.slots);

      accountRef.current = loaded;
      setAccount(loaded);
      setError(null);

      if (!hasEdits) {
        slotsRef.current = normalizeSlots(loaded.slots);
        setSlots(slotsRef.current);
      }
    } catch (reason) {
      setError(messageOf(reason, 'Não foi possível carregar a agenda. Tente de novo em instantes.'));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function update(next: ScheduleSlot[]) {
    slotsRef.current = next;
    setSlots(next);
    setIsSaved(false);

    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
  }

  function toggleDay(weekday: number) {
    const current = slotsRef.current;

    if (current.some((slot) => slot.weekday === weekday)) {
      update(current.filter((slot) => slot.weekday !== weekday));
      return;
    }

    if (current.length >= rules.maxSlots) {
      return;
    }

    // Começa no horário do último dia marcado: quase sempre a pessoa treina na mesma hora.
    update([...current, { time: current[current.length - 1]?.time ?? suggestedTime, weekday }]);
  }

  function changeTime(index: number, time: string) {
    update(slotsRef.current.map((slot, position) => (position === index ? { ...slot, time } : slot)));
  }

  async function save() {
    if (!token || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const saved = await saveSchedule(token, normalizeSlots(slotsRef.current));

      accountRef.current = saved;
      setAccount(saved);
      slotsRef.current = normalizeSlots(saved.slots);
      setSlots(slotsRef.current);
      setIsSaved(true);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (reason) {
      // Sem internet, a mensagem da API aparece e o que a pessoa marcou continua na tela.
      setError(messageOf(reason, 'Não foi possível salvar a agenda. Tente de novo.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Section
      hint={slots.length ? `${slots.length} de ${rules.maxSlots} horários` : undefined}
      title="Agenda da semana">
      <Text style={styles.body}>
        A pontualidade conta os treinos que começam até {formatWindow(rules.windowMinutes)} antes ou depois do
        horário. Só entra na temporada quem agendou.
      </Text>

      {account ? (
        <View style={styles.days}>
          {weekdays.map((day, weekday) => (
            <DayRow
              canMark={!isFull}
              day={day}
              disabled={isSaving}
              entries={entries.filter((entry) => entry.slot.weekday === weekday)}
              key={day.short}
              onChangeTime={changeTime}
              onToggle={() => toggleDay(weekday)}
            />
          ))}
        </View>
      ) : isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.accent.primary} size="small" />
          <Text style={styles.helper}>Buscando a agenda da sua conta…</Text>
        </View>
      ) : null}

      {isFull && hasFreeDay ? (
        <Text style={styles.helper}>
          Limite de {rules.maxSlots} horários por semana: desmarque um dia para escolher outro.
        </Text>
      ) : null}
      {hasChanges && !slots.length ? (
        <Text style={styles.helper}>
          Sem nenhum dia marcado, você sai da pontualidade. Dá para agendar de novo quando quiser.
        </Text>
      ) : null}

      {account ? (
        <Button disabled={!hasChanges} loading={isSaving} onPress={() => void save()} title="Salvar agenda" />
      ) : !isLoading ? (
        <Button icon="refresh" onPress={() => void load()} title="Tentar de novo" variant="outline" />
      ) : null}

      {/* Sempre montada: o leitor de tela só anuncia mudanças em algo que já existia. */}
      <View accessibilityLiveRegion="polite" style={styles.scheduleStatus}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : isSaved && !hasChanges ? (
          <>
            <Ionicons color={theme.status.success} name="checkmark-circle" size={16} />
            <Text style={styles.savedText}>Agenda salva na sua conta.</Text>
          </>
        ) : null}
      </View>
    </Section>
  );
}

type DayRowProps = {
  canMark: boolean;
  day: (typeof weekdays)[number];
  disabled: boolean;
  // Os horários deste dia, com a posição de cada um na agenda inteira.
  entries: { index: number; slot: ScheduleSlot }[];
  onChangeTime: (index: number, time: string) => void;
  onToggle: () => void;
};

function DayRow({ canMark, day, disabled, entries, onChangeTime, onToggle }: DayRowProps) {
  const styles = useStyles();
  const isMarked = entries.length > 0;

  return (
    <View style={styles.dayRow}>
      <View style={styles.dayChip}>
        <Chip
          accessibilityLabel={`Treino ${day.on}`}
          disabled={disabled || (!isMarked && !canMark)}
          label={day.short}
          onPress={onToggle}
          role="checkbox"
          selected={isMarked}
        />
      </View>
      {isMarked ? (
        // Um horário por dia na tela; se a conta tiver dois no mesmo dia, os dois aparecem.
        <View style={styles.dayTimes}>
          {entries.map(({ index, slot }) => (
            <TimeStepper
              day={day.on}
              disabled={disabled}
              key={index}
              onChange={(time) => onChangeTime(index, time)}
              time={slot.time}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.dayOff}>Sem horário</Text>
      )}
    </View>
  );
}

// Hora e minutos separados: de 07:00 para 19:00 são 12 toques, não 48.
function TimeStepper({
  day,
  disabled,
  onChange,
  time,
}: {
  day: string;
  disabled: boolean;
  onChange: (time: string) => void;
  time: string;
}) {
  const styles = useStyles();
  const [hours, minutes] = time.split(':');

  return (
    <View style={styles.stepper}>
      <StepButton
        disabled={disabled}
        icon="remove"
        label={`Uma hora mais cedo ${day}`}
        onPress={() => onChange(stepTime(time, 'hour', -1))}
      />
      <Text accessibilityLabel={`Treino ${day} às ${time}`} style={styles.stepperValue}>
        {hours}
      </Text>
      <StepButton
        disabled={disabled}
        icon="add"
        label={`Uma hora mais tarde ${day}`}
        onPress={() => onChange(stepTime(time, 'hour', 1))}
      />
      <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.stepperColon}>
        :
      </Text>
      <StepButton
        disabled={disabled}
        icon="remove"
        label={`${MINUTE_STEP} minutos mais cedo ${day}`}
        onPress={() => onChange(stepTime(time, 'minute', -1))}
      />
      <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.stepperValue}>
        {minutes}
      </Text>
      <StepButton
        disabled={disabled}
        icon="add"
        label={`${MINUTE_STEP} minutos mais tarde ${day}`}
        onPress={() => onChange(stepTime(time, 'minute', 1))}
      />
    </View>
  );
}

function StepButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: 'add' | 'remove';
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
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}>
      <Ionicons color={theme.accent.primary} name={icon} size={18} />
    </Pressable>
  );
}

function Section({ children, hint, title }: PropsWithChildren<{ hint?: string; title: string }>) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Chip({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  role,
  selected,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  role: 'checkbox' | 'radio';
  selected: boolean;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipActive : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}>
      {selected ? <Ionicons color={theme.accent.primary} name="checkmark" size={14} /> : null}
      <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  content: {
    alignSelf: 'center',
    gap: 18,
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
  introRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: -6,
  },
  intro: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Largura fixa: o "Salvo" aparece e some sem empurrar o texto ao lado.
  savedSlot: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    minHeight: 20,
    width: 64,
  },
  savedText: {
    color: theme.status.success,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 16,
  },
  sectionHint: {
    ...typography.caption,
    color: theme.text.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  chipText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  chipTextActive: {
    color: theme.accent.primary,
  },
  helper: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    ...typography.overline,
    color: theme.text.muted,
    marginTop: 4,
  },
  item: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  itemActive: {
    borderColor: theme.accent.primary,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  itemMeta: {
    ...typography.caption,
    color: theme.text.muted,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingVertical: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    color: theme.text.secondary,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  infoValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  cardHint: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  privacy: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  body: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  days: {
    gap: 8,
  },
  dayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 44,
  },
  // Largura fixa: os horários ficam alinhados em coluna, com ou sem o ✓ no chip.
  dayChip: {
    width: 78,
  },
  dayTimes: {
    gap: 6,
  },
  dayOff: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  // 32 pt com hitSlop de 6: alvo de 44 sem espremer a linha do dia.
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepperValue: {
    color: theme.text.primary,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    textAlign: 'center',
  },
  stepperColon: {
    color: theme.text.muted,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  scheduleStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  error: {
    color: theme.status.danger,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
}));
