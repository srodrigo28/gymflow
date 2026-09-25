import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { getOnboardingProfile } from '@/src/services/onboarding';
import { listExercises } from '@/src/services/training';
import {
  createEmptyTrainingPreferences,
  focusMuscleOptions,
  getTrainingPreferences,
  saveTrainingPreferences,
  trainingCategories,
  trainingLocations,
} from '@/src/services/training-preferences';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
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

  // Lista agrupada por músculo: com 30 e poucos exercícios, os grupos guiam melhor que a ordem alfabética.
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const results = term
      ? exercises.filter(
          (exercise) => exercise.name.toLowerCase().includes(term) || exercise.equipment.includes(term),
        )
      : exercises;

    return focusMuscleOptions
      .map((muscle) => ({ items: results.filter((exercise) => exercise.muscle === muscle), muscle }))
      .filter((group) => group.items.length > 0);
  }, [exercises, search]);

  const rows = routineRows(profile);

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
            <View key={group.muscle} style={styles.group}>
              <Text style={styles.groupLabel}>{muscleLabel(group.muscle)}</Text>
              {group.items.map((exercise) => {
                const selected = favorites.has(exercise.id);

                return (
                  <Pressable
                    accessibilityLabel={`Favorito: ${exercise.name}. ${muscleLabel(exercise.muscle)}, ${exercise.equipment}.`}
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
                        {muscleLabel(exercise.muscle)} · {exercise.equipment}
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

        <Text style={styles.privacy}>Tudo fica só neste aparelho. Nada é enviado.</Text>
      </ScrollView>
    </Screen>
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
  label,
  onPress,
  role,
  selected,
}: {
  accessibilityLabel?: string;
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
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected ? styles.chipActive : null, pressed ? styles.pressed : null]}>
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
  pressed: {
    opacity: 0.75,
  },
}));
