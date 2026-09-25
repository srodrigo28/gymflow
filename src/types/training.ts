// Grupos musculares usados no mapa do corpo e no volume por grupo.
export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'pernas'
  | 'ombros'
  | 'bracos'
  | 'core'
  | 'corpo-todo';

// Padrão de movimento, para checar o equilíbrio do treino.
export type MovementPattern = 'empurrar' | 'puxar' | 'pernas' | 'core' | 'cardio';

// Como a série é registrada: força (carga e repetições), cardio (tempo e distância) ou só tempo
// (yoga, luta, mobilidade, circuito).
export type ExerciseKind = 'forca' | 'cardio' | 'tempo';

// Modalidade do exercício (22-estrategia.md, seção 2.1). Vai junto com o treino para a API, que
// monta um pódio por modalidade na temporada (menos musculação, que já tem constância, força,
// evolução e tonelagem).
export type Modality =
  | 'musculacao'
  | 'corrida'
  | 'bike'
  | 'natacao'
  | 'funcional'
  | 'luta'
  | 'yoga'
  | 'mobilidade'
  | 'cardio';

export type Exercise = {
  equipment: string;
  id: string;
  kind: ExerciseKind;
  modality: Modality;
  muscle: MuscleGroup;
  name: string;
  pattern: MovementPattern;
};

export type WorkoutSet = {
  distanceM?: number;
  done: boolean;
  durationSec?: number;
  id: string;
  isPr: boolean;
  position: number;
  reps?: number;
  rpe?: number;
  sessionExerciseId: string;
  weightKg?: number;
};

export type SessionExercise = {
  exercise: Exercise;
  id: string;
  position: number;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  exercises: SessionExercise[];
  finishedAt?: number;
  id: string;
  note?: string;
  startedAt: number;
};

export type SessionSummary = {
  exerciseCount: number;
  finishedAt?: number;
  id: string;
  prCount: number;
  setCount: number;
  startedAt: number;
  title: string;
  volumeKg: number;
};

export type MuscleVolume = {
  muscle: MuscleGroup;
  setCount: number;
  volumeKg: number;
};

export type PeriodSummary = {
  byMuscle: MuscleVolume[];
  // Minutos de cardio somados aos das práticas só de tempo (yoga, luta, mobilidade, circuito).
  cardioMinutes: number;
  from: number;
  sessionCount: number;
  to: number;
  volumeKg: number;
};
