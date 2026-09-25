import { getDatabase } from '@/src/db/client';
import type { Achievement } from '@/src/types/achievements';
import { formatVolume } from '@/src/utils/format';

// Tudo aqui é calculado na hora a partir do banco local; nenhuma conquista fica salva. Assim um
// treino apagado, ou restaurado da conta num aparelho novo, muda a lista sozinho.

const DAY_MS = 86_400_000;
const SESSION_GOALS = [1, 5, 10, 25, 50] as const;
const RECORD_GOALS = [1, 10] as const;
const STREAK_GOALS = [2, 4] as const;
const VOLUME_GOAL_KG = 10_000;
const COMPLETE_WEEK_DAYS = 3;
const NO_MISS_DAYS = 4;
const NO_MISS_WINDOW_DAYS = 7;
const EARLY_HOUR = 7;

type SessionRow = { finished_at: number; started_at: number; volume: number | null };

/** Um dia com treino: o número do dia e a conclusão do primeiro treino dele. */
type TrainingDay = { day: number; finishedAt: number };

type AchievementBase = Pick<Achievement, 'description' | 'icon' | 'id' | 'title'>;

const sessionMilestones: Record<(typeof SESSION_GOALS)[number], AchievementBase> = {
  1: { description: 'Primeiro treino concluído e registrado.', icon: 'dumbbell', id: 'primeiro-treino', title: 'Primeiro treino' },
  5: { description: 'Cinco treinos concluídos.', icon: 'medal-outline', id: 'treinos-5', title: '5 treinos' },
  10: { description: 'Dez treinos concluídos.', icon: 'medal', id: 'treinos-10', title: '10 treinos' },
  25: { description: 'Vinte e cinco treinos concluídos.', icon: 'trophy-outline', id: 'treinos-25', title: '25 treinos' },
  50: { description: 'Cinquenta treinos concluídos.', icon: 'trophy', id: 'treinos-50', title: '50 treinos' },
};

const recordMilestones: Record<(typeof RECORD_GOALS)[number], AchievementBase> = {
  1: {
    description: 'Superou a própria marca num exercício pela primeira vez.',
    icon: 'arm-flex-outline',
    id: 'primeiro-recorde',
    title: 'Primeiro recorde',
  },
  10: { description: 'Dez recordes pessoais batidos.', icon: 'arm-flex', id: 'recordes-10', title: '10 recordes' },
};

// Dias desde 1970 no calendário do aparelho. Ir por ano/mês/dia (e não pelo timestamp dividido
// por 24h) mantém "mesmo dia" e "mesma semana" certos também na virada do horário de verão.
function localDayNumber(timestamp: number) {
  const date = new Date(timestamp);

  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

// Semanas de segunda a domingo. O dia 0 (1º de janeiro de 1970) caiu numa quinta; o +3 alinha a
// contagem na segunda anterior, então dias da mesma semana recebem o mesmo número.
function weekOfDay(day: number) {
  return Math.floor((day + 3) / 7);
}

// Conquista de contagem ("10 treinos", "10 recordes"): desbloqueia no instante do enésimo evento.
function countMilestone(base: AchievementBase, timestamps: number[], goal: number, unit: string): Achievement {
  const count = timestamps.length;

  return {
    ...base,
    progress: Math.min(count / goal, 1),
    // Com meta 1 a descrição já diz tudo; "0 de 1 treino" só faria ruído.
    progressLabel: goal > 1 ? `${Math.min(count, goal)} de ${goal} ${unit}` : undefined,
    unlockedAt: timestamps[goal - 1] ?? null,
  };
}

// Agrupa os treinos concluídos por dia (pelo início do treino, como o resto do app), do mais
// antigo para o mais novo. Cada dia guarda a conclusão do primeiro treino dele: é esse o evento
// que fecha o dia para as conquistas de constância.
function trainingDays(sessions: SessionRow[]): TrainingDay[] {
  const firstFinishByDay = new Map<number, number>();

  for (const session of sessions) {
    const day = localDayNumber(session.started_at);
    const first = firstFinishByDay.get(day);

    if (first === undefined || session.finished_at < first) {
      firstFinishByDay.set(day, session.finished_at);
    }
  }

  return [...firstFinishByDay.entries()]
    .map(([day, finishedAt]) => ({ day, finishedAt }))
    .sort((a, b) => a.day - b.day);
}

function completeWeekAchievement(days: TrainingDay[], now: number): Achievement {
  const daysPerWeek = new Map<number, number>();
  let unlockedAt: number | null = null;

  for (const { day, finishedAt } of days) {
    const week = weekOfDay(day);
    const count = (daysPerWeek.get(week) ?? 0) + 1;
    daysPerWeek.set(week, count);

    if (unlockedAt === null && count >= COMPLETE_WEEK_DAYS) {
      unlockedAt = finishedAt;
    }
  }

  const thisWeek = Math.min(daysPerWeek.get(weekOfDay(localDayNumber(now))) ?? 0, COMPLETE_WEEK_DAYS);

  return {
    description: 'Treinou em três dias diferentes na mesma semana, de segunda a domingo.',
    icon: 'calendar-check-outline',
    id: 'semana-completa',
    progress: unlockedAt !== null ? 1 : thisWeek / COMPLETE_WEEK_DAYS,
    progressLabel: `${thisWeek} de ${COMPLETE_WEEK_DAYS} dias nesta semana`,
    title: 'Semana completa',
    unlockedAt,
  };
}

// Semanas seguidas com ao menos um treino concluído. A semana atual só entra quando já tem
// treino, mas também não quebra a sequência enquanto não termina.
function streakAchievements(days: TrainingDay[], now: number): Achievement[] {
  const firstFinishByWeek = new Map<number, number>();

  for (const { day, finishedAt } of days) {
    const week = weekOfDay(day);

    if (!firstFinishByWeek.has(week)) {
      firstFinishByWeek.set(week, finishedAt);
    }
  }

  const weeks = [...firstFinishByWeek.keys()].sort((a, b) => a - b);
  // Quando cada tamanho de sequência aconteceu pela primeira vez: é a data de desbloqueio.
  const reachedAt = new Map<number, number>();
  let streak = 0;

  weeks.forEach((week, index) => {
    streak = index > 0 && week === weeks[index - 1] + 1 ? streak + 1 : 1;

    if (!reachedAt.has(streak)) {
      reachedAt.set(streak, firstFinishByWeek.get(week) ?? now);
    }
  });

  const thisWeek = weekOfDay(localDayNumber(now));
  const lastWeek = weeks.length ? weeks[weeks.length - 1] : null;
  const currentStreak = lastWeek !== null && lastWeek >= thisWeek - 1 ? streak : 0;

  return STREAK_GOALS.map((goal): Achievement => {
    const unlockedAt = reachedAt.get(goal) ?? null;
    const shown = Math.min(currentStreak, goal);

    return {
      description:
        goal === 2
          ? 'Pelo menos um treino por semana, duas semanas seguidas.'
          : 'Pelo menos um treino por semana, quatro semanas seguidas.',
      icon: goal === 2 ? 'calendar-range-outline' : 'calendar-month-outline',
      id: `semanas-seguidas-${goal}`,
      progress: unlockedAt !== null ? 1 : shown / goal,
      progressLabel: `${shown} de ${goal} semanas`,
      title: goal === 2 ? 'Duas semanas seguidas' : 'Quatro semanas seguidas',
      unlockedAt,
    };
  });
}

function noMissAchievement(days: TrainingDay[], now: number): Achievement {
  let unlockedAt: number | null = null;

  // Para cada dia com treino, quantos dias distintos de treino há na janela de 7 dias que termina
  // nele. A primeira janela com 4 desbloqueia, e fica: conquista não se perde numa semana fraca.
  for (let index = 0; index < days.length && unlockedAt === null; index += 1) {
    const windowStart = days[index].day - (NO_MISS_WINDOW_DAYS - 1);
    let inWindow = 0;

    for (let back = index; back >= 0 && days[back].day >= windowStart; back -= 1) {
      inWindow += 1;
    }

    if (inWindow >= NO_MISS_DAYS) {
      unlockedAt = days[index].finishedAt;
    }
  }

  const today = localDayNumber(now);
  const recent = Math.min(
    days.filter(({ day }) => day > today - NO_MISS_WINDOW_DAYS && day <= today).length,
    NO_MISS_DAYS,
  );

  return {
    description: 'Treinou em quatro dos últimos sete dias.',
    icon: 'fire',
    id: 'sem-falta',
    progress: unlockedAt !== null ? 1 : recent / NO_MISS_DAYS,
    progressLabel: `${recent} de ${NO_MISS_DAYS} dias nos últimos 7`,
    title: 'Sem falta',
    unlockedAt,
  };
}

function earlyBirdAchievement(sessions: SessionRow[]): Achievement {
  // Hora local do início: quem treina às 6h conta em qualquer fuso.
  const early = sessions.find((session) => new Date(session.started_at).getHours() < EARLY_HOUR);

  return {
    description: 'Começou um treino antes das 7h da manhã.',
    icon: 'weather-sunset-up',
    id: 'madrugada',
    progress: early ? 1 : 0,
    title: 'Madrugada',
    unlockedAt: early?.started_at ?? null,
  };
}

function volumeAchievement(sessions: SessionRow[]): Achievement {
  let total = 0;
  let unlockedAt: number | null = null;

  for (const session of sessions) {
    total += session.volume ?? 0;

    if (unlockedAt === null && total >= VOLUME_GOAL_KG) {
      unlockedAt = session.finished_at;
    }
  }

  return {
    description: 'Dez toneladas levantadas, somando todas as séries feitas.',
    icon: 'weight-kilogram',
    id: 'volume-10t',
    progress: Math.min(total / VOLUME_GOAL_KG, 1),
    progressLabel: `${formatVolume(Math.min(total, VOLUME_GOAL_KG))} de 10 t`,
    title: '10 toneladas',
    unlockedAt,
  };
}

function bodyAchievements(weighIns: number[], firstPhotoAt: number | null): Achievement[] {
  // Pesagens em dias diferentes: duas no mesmo dia ainda não mostram evolução nenhuma.
  const firstByDay = new Map<number, number>();

  for (const takenAt of weighIns) {
    const day = localDayNumber(takenAt);

    if (!firstByDay.has(day)) {
      firstByDay.set(day, takenAt);
    }
  }

  const dayTimestamps = [...firstByDay.values()].sort((a, b) => a - b);
  const weighDays = Math.min(dayTimestamps.length, 2);

  return [
    {
      description: 'Registrou o peso pela primeira vez.',
      icon: 'scale-bathroom',
      id: 'primeira-pesagem',
      progress: weighIns.length ? 1 : 0,
      title: 'Primeira pesagem',
      unlockedAt: weighIns[0] ?? null,
    },
    {
      description: 'Duas pesagens em dias diferentes: já dá para comparar.',
      icon: 'chart-line',
      id: 'evolucao-visivel',
      progress: weighDays / 2,
      progressLabel: `${weighDays} de 2 pesagens`,
      title: 'Evolução visível',
      unlockedAt: dayTimestamps[1] ?? null,
    },
    {
      description: 'Guardou a primeira foto de evolução.',
      icon: 'camera-outline',
      id: 'foto-do-mes',
      progress: firstPhotoAt !== null ? 1 : 0,
      title: 'Foto do mês',
      unlockedAt: firstPhotoAt,
    },
  ];
}

/** Todas as conquistas, na ordem de apresentação, com data de desbloqueio ou progresso. */
export async function listAchievements(): Promise<Achievement[]> {
  const database = await getDatabase();
  const [sessions, records, weighIns, photo] = await Promise.all([
    database.getAllAsync<SessionRow>(
      `SELECT s.started_at, s.finished_at,
              (SELECT SUM(st.weight_kg * st.reps) FROM sets st
                 JOIN session_exercises se ON se.id = st.session_exercise_id
                 WHERE se.session_id = s.id AND st.done = 1) AS volume
       FROM sessions s
       WHERE s.finished_at IS NOT NULL
       ORDER BY s.finished_at ASC`,
    ),
    // Recordes só de treinos concluídos: um treino descartado leva os recordes dele junto.
    database.getAllAsync<{ created_at: number }>(
      `SELECT st.created_at FROM sets st
       JOIN session_exercises se ON se.id = st.session_exercise_id
       JOIN sessions s ON s.id = se.session_id
       WHERE st.is_pr = 1 AND st.done = 1 AND s.finished_at IS NOT NULL
       ORDER BY st.created_at ASC`,
    ),
    database.getAllAsync<{ taken_at: number }>(
      'SELECT taken_at FROM measurements WHERE weight_kg IS NOT NULL ORDER BY taken_at ASC',
    ),
    database.getFirstAsync<{ created_at: number | null }>('SELECT MIN(created_at) AS created_at FROM photos'),
  ]);

  const now = Date.now();
  const days = trainingDays(sessions);
  const finishTimes = sessions.map((session) => session.finished_at);
  const recordTimes = records.map((record) => record.created_at);

  return [
    ...SESSION_GOALS.map((goal) => countMilestone(sessionMilestones[goal], finishTimes, goal, 'treinos')),
    ...RECORD_GOALS.map((goal) => countMilestone(recordMilestones[goal], recordTimes, goal, 'recordes')),
    completeWeekAchievement(days, now),
    ...streakAchievements(days, now),
    noMissAchievement(days, now),
    earlyBirdAchievement(sessions),
    volumeAchievement(sessions),
    ...bodyAchievements(
      weighIns.map((row) => row.taken_at),
      photo?.created_at ?? null,
    ),
  ];
}
