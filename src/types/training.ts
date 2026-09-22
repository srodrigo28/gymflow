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

export type ExerciseKind = 'forca' | 'cardio';

export type Exercise = {
  equipment: string;
  id: string;
  kind: ExerciseKind;
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
  cardioMinutes: number;
  from: number;
  sessionCount: number;
  to: number;
  volumeKg: number;
};
