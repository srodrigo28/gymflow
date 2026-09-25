import type { RemotePhoto } from '@/src/types/photos';
import type { Modality } from '@/src/types/training';

// Fase 5, personal e academia (22-estrategia.md, seções 2.4 e 4): o formato das respostas da API. O
// personal é uma conta comum com o perfil profissional ligado; o CREF é o que ele informou, sem
// verificação. O vínculo tem três permissões separadas, que o aluno liga, desliga e revoga quando quiser.

export type ProfessionalProfile = {
  bio: string | null;
  city: string | null;
  createdAt: string;
  // Como o profissional informou. O app sempre mostra "informado pelo profissional".
  cref: string | null;
  // Página pública (https://…/p/<slug>).
  pageUrl: string;
  slug: string;
};

export type CoachingPermissions = {
  shareMeasurements: boolean;
  sharePhotos: boolean;
  shareWorkouts: boolean;
};

export type CoachCard = {
  bio: string | null;
  city: string | null;
  cref: string | null;
  id: string;
  name: string;
  pageUrl: string | null;
  slug: string | null;
};

export type Testimonial = { approved: boolean; text: string } | null;

// Um personal do aluno, do ponto de vista do aluno.
export type MyCoach = {
  activePlans: number;
  coach: CoachCard;
  linkId: string;
  permissions: CoachingPermissions;
  // Aparece na página pública do profissional (primeiro nome, inicial e conquistas).
  showcase: boolean;
  since: string;
  testimonial: Testimonial;
};

export type CoachingInvite = { code: string; expiresAt: string; url: string };

export type CoachingInvitePreview = {
  code: string;
  coach: CoachCard;
  expiresAt: string;
  status: 'valid' | 'expired' | 'used';
};

// Um aluno no painel do personal. Os números de treino vêm null quando o aluno não compartilha os treinos.
export type StudentSummary = {
  activePlan: { id: string; name: string } | null;
  goalDays: number | null;
  inactiveDays: number | null;
  lastWorkoutAt: string | null;
  linkId: string;
  // 7 dias ou mais sem treino.
  missing: boolean;
  monthDays: number | null;
  // Evolução relativa da carga no mês, em %.
  monthProgress: number | null;
  permissions: CoachingPermissions;
  since: string;
  student: { id: string; name: string };
  testimonial: Testimonial;
  weekDays: number | null;
};

export type CoachWorkoutSet = {
  distanceM: number | null;
  done: boolean;
  durationSec: number | null;
  reps: number | null;
  rpe: number | null;
  weightKg: number | null;
};

export type CoachWorkout = {
  exercises: {
    exerciseId: string;
    kind: string;
    modality: string | null;
    muscle: string;
    name: string;
    // O que a prescrição pedia para este exercício, quando o treino veio de uma.
    prescribed: { reps: string; sets: number } | null;
    sets: CoachWorkoutSet[];
  }[];
  finishedAt: string | null;
  id: string;
  // Exercícios da prescrição que ficaram de fora.
  missing: string[];
  plan: { day: number | null; id: string; name: string; title: string | null } | null;
  startedAt: string;
};

export type CoachMeasurement = {
  armCm: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  hipCm: number | null;
  id: string;
  takenAt: number;
  thighCm: number | null;
  waistCm: number | null;
  weightKg: number | null;
};

export type StudentDetail = {
  // Por que uma parte veio vazia (sem permissão, ou o aluno não guarda na conta).
  hints: { measurements: string | null; photos: string | null; workouts: string | null };
  // null: sem a permissão. [] com dica: o aluno não guarda na conta.
  measurements: CoachMeasurement[] | null;
  photos: RemotePhoto[] | null;
  summary: StudentSummary;
  workouts: CoachWorkout[] | null;
};

export type PlanExercise = {
  exerciseId: string;
  kind: string;
  modality: Modality;
  muscle: string;
  name: string;
  note: string | null;
  // Repetições alvo como texto: "10", "8-12", "30 s".
  reps: string;
  restSec: number | null;
  sets: number;
};

export type PlanDay = {
  exercises: PlanExercise[];
  // "Treino A", "Pernas"…
  title: string;
  // 0 = segunda … 6 = domingo; null: sem dia fixo.
  weekday: number | null;
};

export type TrainingPlan = {
  active: boolean;
  coach: { id: string; name: string };
  createdAt: string;
  days: PlanDay[];
  id: string;
  name: string;
  note: string | null;
  student: { id: string; name: string };
  updatedAt: string;
};

export type PlanInput = { active?: boolean; days: PlanDay[]; name: string; note: string | null };

export type CoachRanking = {
  entries: {
    // Parte das últimas 4 semanas em que os alunos bateram a meta, na média, em %.
    adherence: number;
    isMe: boolean;
    name: string;
    pageUrl: string;
    progress: number | null;
    rank: number;
    slug: string;
    students: number;
  }[];
  rules: { adherenceWeeks: number; minStudents: number };
};

export type GymNotice = { author: string | null; body: string; createdAt: string; id: string; title: string };

export type GymBoard = {
  gym: { confirmed: boolean; id: string; name: string };
  // A pessoa é a responsável pelo mural: pode publicar e apagar avisos.
  isOwner: boolean;
  notices: GymNotice[];
  ranking: {
    // Constância verificada do mês: dias com treino e check-in verificado.
    entries: { days: number; isMe: boolean; name: string; rank: number }[];
    hint: string | null;
    me: { days: number; hidden: boolean };
    month: string;
  };
};
