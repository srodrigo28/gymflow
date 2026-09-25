import type { MuscleGroup } from '@/src/types/training';

// Onde a pessoa costuma treinar. 'misto' é o "varia conforme o dia".
export type TrainingLocation = 'academia' | 'casa' | 'ar_livre' | 'misto';

// Tipos de treino que a pessoa prefere. Multi-seleção.
export type TrainingCategory = 'musculacao' | 'cardio' | 'funcional' | 'mobilidade' | 'alongamento';

// Escolhas de treino de uma conta. Ficam só neste aparelho (AsyncStorage), como o onboarding.
export type TrainingPreferences = {
  location: TrainingLocation | null;
  categories: TrainingCategory[];
  focusMuscles: MuscleGroup[];
  // Valores de `equipment` do catálogo de exercícios, sem repetição.
  equipment: string[];
  favoriteExerciseIds: string[];
  // Momento da última gravação; null enquanto a pessoa não escolheu nada.
  updatedAt: number | null;
};

// O que a tela envia para salvar: o serviço é quem carimba o updatedAt.
export type TrainingPreferencesInput = Omit<TrainingPreferences, 'updatedAt'>;
