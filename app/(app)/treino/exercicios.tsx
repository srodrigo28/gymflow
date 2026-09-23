import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { addExerciseToSession, listExercises } from '@/src/services/training';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { Exercise, MuscleGroup } from '@/src/types/training';
import { muscleLabel } from '@/src/utils/format';

const muscles: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'corpo-todo'];

export default function ExerciciosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [all, setAll] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    void listExercises().then(setAll);
  }, []);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();

    return all.filter(
      (exercise) =>
        (!muscle || exercise.muscle === muscle) &&
        (!term || exercise.name.toLowerCase().includes(term) || exercise.equipment.includes(term)),
    );
  }, [all, muscle, search]);

  async function handlePick(exercise: Exercise) {
    if (!sessionId) return;
    await addExerciseToSession(sessionId, exercise.id);
    router.back();
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
        <FilterChip active={muscle === null} label="Todos" onPress={() => setMuscle(null)} />
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
        {results.map((exercise) => (
          <Pressable
            accessibilityLabel={`Adicionar ${exercise.name} ao treino`}
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => handlePick(exercise)}
            style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}>
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{exercise.name}</Text>
              <Text style={styles.itemMeta}>
                {muscleLabel(exercise.muscle)} · {exercise.equipment}
              </Text>
            </View>
            <Ionicons color={theme.accent.primary} name="add-circle" size={24} />
          </Pressable>
        ))}
        {!results.length ? <Text style={styles.empty}>Nenhum exercício encontrado.</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active ? styles.chipActive : null, pressed ? styles.pressed : null]}>
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
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
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
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
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
  empty: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingTop: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
