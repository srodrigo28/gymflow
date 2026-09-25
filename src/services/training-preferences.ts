import { storage, storageKeys } from '@/src/services/storage';
import type { MuscleGroup } from '@/src/types/training';
import type {
  TrainingCategory,
  TrainingLocation,
  TrainingPreferences,
  TrainingPreferencesInput,
} from '@/src/types/training-preferences';

// Opções na ordem em que aparecem na tela. Também são o filtro do que entra do armazenamento.
export const trainingLocations: TrainingLocation[] = ['academia', 'casa', 'ar_livre', 'misto'];
export const trainingCategories: TrainingCategory[] = ['musculacao', 'cardio', 'funcional', 'mobilidade', 'alongamento'];
export const focusMuscleOptions: MuscleGroup[] = ['peito', 'costas', 'pernas', 'ombros', 'bracos', 'core', 'corpo-todo'];

// As escritas entram em fila: dois toques rápidos em estrelas diferentes fazem duas leituras
// seguidas de duas gravações; sem a fila, a segunda gravaria por cima da primeira.
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);

  return next;
}

export function createEmptyTrainingPreferences(): TrainingPreferences {
  return {
    categories: [],
    equipment: [],
    favoriteExerciseIds: [],
    focusMuscles: [],
    location: null,
    updatedAt: null,
  };
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

function isLocation(value: unknown): value is TrainingLocation {
  return typeof value === 'string' && (trainingLocations as string[]).includes(value);
}

function isCategory(value: string): value is TrainingCategory {
  return (trainingCategories as string[]).includes(value);
}

function isMuscle(value: string): value is MuscleGroup {
  return (focusMuscleOptions as string[]).includes(value);
}

// Tudo o que vem de fora (armazenamento antigo, tela) passa por aqui: valores desconhecidos
// somem em vez de quebrar a tela, e listas ficam sem repetição.
function sanitize(raw: unknown): TrainingPreferences {
  if (!raw || typeof raw !== 'object') {
    return createEmptyTrainingPreferences();
  }

  const data = raw as Partial<Record<keyof TrainingPreferences, unknown>>;

  return {
    categories: uniqueStrings(data.categories).filter(isCategory),
    equipment: uniqueStrings(data.equipment),
    favoriteExerciseIds: uniqueStrings(data.favoriteExerciseIds),
    focusMuscles: uniqueStrings(data.focusMuscles).filter(isMuscle),
    location: isLocation(data.location) ? data.location : null,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : null,
  };
}

async function read(userId: string): Promise<TrainingPreferences> {
  const stored = await storage.get(storageKeys.trainingPreferences(userId));

  if (!stored) {
    return createEmptyTrainingPreferences();
  }

  try {
    return sanitize(JSON.parse(stored));
  } catch {
    return createEmptyTrainingPreferences();
  }
}

async function write(userId: string, prefs: TrainingPreferencesInput): Promise<TrainingPreferences> {
  const next: TrainingPreferences = { ...sanitize(prefs), updatedAt: Date.now() };
  await storage.set(storageKeys.trainingPreferences(userId), JSON.stringify(next));

  return next;
}

/** Escolhas da conta. Sem nada salvo, devolve o padrão vazio (nunca null). */
export function getTrainingPreferences(userId: string): Promise<TrainingPreferences> {
  // Passa pela fila para ler depois de qualquer gravação pendente.
  return serialize(() => read(userId));
}

/** Grava tudo de uma vez e devolve o que ficou salvo, já com o updatedAt. */
export function saveTrainingPreferences(
  userId: string,
  prefs: TrainingPreferencesInput,
): Promise<TrainingPreferences> {
  return serialize(() => write(userId, prefs));
}

/** Favorita ou desfavorita um exercício sem mexer no resto. Devolve as escolhas atualizadas. */
export function toggleFavoriteExercise(userId: string, exerciseId: string): Promise<TrainingPreferences> {
  return serialize(async () => {
    const current = await read(userId);
    const favoriteExerciseIds = current.favoriteExerciseIds.includes(exerciseId)
      ? current.favoriteExerciseIds.filter((id) => id !== exerciseId)
      : [...current.favoriteExerciseIds, exerciseId];

    return write(userId, { ...current, favoriteExerciseIds });
  });
}

export function isFavorite(prefs: TrainingPreferences, exerciseId: string) {
  return prefs.favoriteExerciseIds.includes(exerciseId);
}

/** Se a pessoa já escolheu alguma coisa. Serve para o cartão da home e para as recomendações. */
export function hasTrainingPreferences(prefs: TrainingPreferences) {
  return (
    prefs.location !== null ||
    prefs.categories.length > 0 ||
    prefs.focusMuscles.length > 0 ||
    prefs.equipment.length > 0 ||
    prefs.favoriteExerciseIds.length > 0
  );
}

export async function clearTrainingPreferences(userId: string) {
  await serialize(() => storage.remove(storageKeys.trainingPreferences(userId)));
}
