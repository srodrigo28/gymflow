import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/contexts/session-context';
import { addExerciseToSession, listExercises } from '@/src/services/training';
import { getTrainingPreferences, toggleFavoriteExercise } from '@/src/services/training-preferences';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { Exercise, MuscleGroup } from '@/src/types/training';
import { muscleLabel } from '@/src/utils/format';

const muscles: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'corpo-todo'];

export default function ExerciciosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [all, setAll] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    void listExercises().then(setAll);
  }, []);

  // Os favoritos vêm das escolhas de treino da conta (ficam só neste aparelho).
  useEffect(() => {
    if (!userId) return;
    let isActive = true;

    void getTrainingPreferences(userId).then((prefs) => {
      if (isActive) setFavoriteIds(prefs.favoriteExerciseIds);
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = all.filter(
      (exercise) =>
        (!onlyFavorites || favorites.has(exercise.id)) &&
        (!muscle || exercise.muscle === muscle) &&
        (!term || exercise.name.toLowerCase().includes(term) || exercise.equipment.includes(term)),
    );

    // Favoritos primeiro; dentro de cada bloco segue a ordem alfabética do catálogo.
    return [
      ...filtered.filter((exercise) => favorites.has(exercise.id)),
      ...filtered.filter((exercise) => !favorites.has(exercise.id)),
    ];
  }, [all, favorites, muscle, onlyFavorites, search]);

  async function handlePick(exercise: Exercise) {
    if (!sessionId) return;
    await addExerciseToSession(sessionId, exercise.id);
    router.back();
  }

  // Favoritar não sai da tela: a pessoa continua montando o treino.
  async function handleToggleFavorite(exercise: Exercise) {
    if (!userId) return;

    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }

    const next = await toggleFavoriteExercise(userId, exercise.id);
    setFavoriteIds(next.favoriteExerciseIds);

    // Sem favoritos o chip some; o filtro não pode ficar preso numa lista vazia.
    if (!next.favoriteExerciseIds.length) {
      setOnlyFavorites(false);
    }
  }

  return (
    <Screen edges={['top', 'right', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
        </Pressable>
        <TextInput
          accessibilityLabel="Buscar exercício"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Buscar exercício"
          placeholderTextColor={theme.text.muted}
          style={styles.search}
          value={search}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}>
        <FilterChip
          active={muscle === null && !onlyFavorites}
          label="Todos"
          onPress={() => {
            setMuscle(null);
            setOnlyFavorites(false);
          }}
        />
        {favoriteIds.length ? (
          <FilterChip
            active={onlyFavorites}
            icon="star"
            label="Favoritos"
            onPress={() => setOnlyFavorites((current) => !current)}
          />
        ) : null}
        {muscles.map((item) => (
          <FilterChip
            active={muscle === item}
            key={item}
            label={muscleLabel(item)}
            onPress={() => setMuscle(muscle === item ? null : item)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {results.map((exercise) => {
          const isFavorite = favorites.has(exercise.id);

          return (
            <Pressable
              accessibilityHint="Toque e segure para favoritar ou tirar dos favoritos"
              accessibilityLabel={`Adicionar ${exercise.name} ao treino${isFavorite ? ', favorito' : ''}`}
              accessibilityRole="button"
              delayLongPress={350}
              key={exercise.id}
              onLongPress={() => handleToggleFavorite(exercise)}
              onPress={() => handlePick(exercise)}
              style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}>
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{exercise.name}</Text>
                <Text style={styles.itemMeta}>
                  {muscleLabel(exercise.muscle)} · {exercise.equipment}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Favorito: ${exercise.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isFavorite }}
                hitSlop={6}
                onPress={() => handleToggleFavorite(exercise)}
                style={({ pressed }) => [styles.starButton, pressed ? styles.pressed : null]}>
                <Ionicons
                  color={isFavorite ? theme.accent.primary : theme.text.muted}
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={22}
                />
              </Pressable>
              <Ionicons color={theme.accent.primary} name="add-circle" size={24} />
            </Pressable>
          );
        })}
        {!results.length ? (
          <Text style={styles.empty}>
            {onlyFavorites
              ? 'Nenhum favorito aqui. Toque e segure um exercício para favoritar.'
              : 'Nenhum exercício encontrado.'}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FilterChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active ? styles.chipActive : null, pressed ? styles.pressed : null]}>
      {icon ? <Ionicons color={active ? theme.accent.primary : theme.text.secondary} name={icon} size={13} /> : null}
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  search: {
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    height: 46,
    paddingHorizontal: 14,
  },
  // Sem flexShrink: 0 a lista longa abaixo espremia esta faixa e cortava os chips ao meio.
  filtersRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  list: {
    gap: 8,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  item: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 64,
    paddingLeft: 14,
    paddingRight: 12,
    paddingVertical: 10,
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
  // 40 pt de alvo para a estrela, sem esticar a linha.
  starButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
