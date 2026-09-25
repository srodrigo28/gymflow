import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/ui/Screen';
import { modalities } from '@/src/constants/modalities';
import { useSession } from '@/src/contexts/session-context';
import { addExerciseToSession, exerciseGroupLabel, listExercises } from '@/src/services/training';
import { getTrainingPreferences, toggleFavoriteExercise } from '@/src/services/training-preferences';
import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';
import type { Exercise, Modality, MuscleGroup } from '@/src/types/training';
import { muscleLabel } from '@/src/utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const muscles: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'corpo-todo'];

// Busca sem acento e sem maiúscula: "natacao" acha "Natação".
function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function ExerciciosScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { session } = useSession();
  const userId = session?.user.id;
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [all, setAll] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  // Abre sempre na musculação, o primeiro chip da faixa: o escolhido nunca fica escondido na rolagem.
  const [modality, setModality] = useState<Modality>('musculacao');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const term = normalize(search.trim());
  const isSearching = term.length > 0;

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

  // Na musculação, só os grupos que têm exercício dela no catálogo.
  const muscleOptions = useMemo(
    () =>
      muscles.filter((item) =>
        all.some((exercise) => exercise.modality === 'musculacao' && exercise.muscle === item),
      ),
    [all],
  );

  const hasStrengthFavorites = useMemo(
    () => all.some((exercise) => exercise.modality === 'musculacao' && favorites.has(exercise.id)),
    [all, favorites],
  );

  const results = useMemo(() => {
    const filtered = all.filter((exercise) => {
      // A busca vale para todas as modalidades: quem digita "yoga" na musculação acha a yoga.
      if (term) {
        return normalize(exercise.name).includes(term) || normalize(exercise.equipment).includes(term);
      }

      if (exercise.modality !== modality) {
        return false;
      }

      // Os filtros por grupo muscular e de favoritos são da musculação.
      return (
        modality !== 'musculacao' ||
        ((!onlyFavorites || favorites.has(exercise.id)) && (!muscle || exercise.muscle === muscle))
      );
    });

    // Favoritos primeiro; dentro de cada bloco segue a ordem alfabética do catálogo.
    return [
      ...filtered.filter((exercise) => favorites.has(exercise.id)),
      ...filtered.filter((exercise) => !favorites.has(exercise.id)),
    ];
  }, [all, favorites, modality, muscle, onlyFavorites, term]);

  const current = modalities.find((item) => item.id === modality);

  async function handlePick(exercise: Exercise) {
    if (!sessionId) return;
    await addExerciseToSession(sessionId, exercise.id);
    router.back();
  }

  // Escolher uma modalidade é navegar por ela: a busca e os filtros da musculação saem da frente.
  function chooseModality(next: Modality) {
    setModality(next);
    setSearch('');
    setMuscle(null);
    setOnlyFavorites(false);
  }

  // Favoritar não sai da tela: a pessoa continua montando o treino.
  async function handleToggleFavorite(exercise: Exercise) {
    if (!userId) return;

    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }

    const next = await toggleFavoriteExercise(userId, exercise.id);
    const nextFavorites = new Set(next.favoriteExerciseIds);
    setFavoriteIds(next.favoriteExerciseIds);

    // Sem favoritos na musculação o chip some; o filtro não pode ficar preso numa lista vazia.
    if (!all.some((item) => item.modality === 'musculacao' && nextFavorites.has(item.id))) {
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
          accessibilityHint="Procura em todas as modalidades"
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
        accessibilityLabel="Modalidades"
        accessibilityRole="tablist"
        contentContainerStyle={styles.modalities}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}>
        {modalities.map((item) => (
          <ModalityChip
            active={!isSearching && modality === item.id}
            description={item.description}
            // A lista de modalidades guarda o nome do ícone do MaterialCommunityIcons.
            icon={item.icon as IconName}
            key={item.id}
            label={item.label}
            onPress={() => chooseModality(item.id)}
          />
        ))}
      </ScrollView>

      {isSearching ? (
        <Text style={styles.caption}>Buscando em todas as modalidades.</Text>
      ) : modality === 'musculacao' ? (
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
          {hasStrengthFavorites ? (
            <FilterChip
              active={onlyFavorites}
              icon="star"
              label="Favoritos"
              onPress={() => setOnlyFavorites((value) => !value)}
            />
          ) : null}
          {muscleOptions.map((item) => (
            <FilterChip
              active={muscle === item}
              key={item}
              label={muscleLabel(item)}
              onPress={() => setMuscle(muscle === item ? null : item)}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.caption}>{current?.description}</Text>
      )}

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
                  {exerciseGroupLabel(exercise)} · {exercise.equipment}
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
            {onlyFavorites && !isSearching
              ? 'Nenhum favorito aqui. Toque e segure um exercício para favoritar.'
              : 'Nenhum exercício encontrado.'}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// A modalidade é a escolha principal da tela: o chip ativo fica cheio, e os filtros da musculação
// abaixo dele, só contornados.
function ModalityChip({
  active,
  description,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  description: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modalityChip,
        active ? styles.modalityChipActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <MaterialCommunityIcons color={active ? theme.accent.onPrimary : theme.text.secondary} name={icon} size={16} />
      <Text style={[styles.modalityChipText, active ? styles.modalityChipTextActive : null]}>{label}</Text>
    </Pressable>
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
  modalities: {
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalityChip: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalityChipActive: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  modalityChipText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  modalityChipTextActive: {
    color: theme.accent.onPrimary,
  },
  caption: {
    color: theme.text.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  filters: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
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
