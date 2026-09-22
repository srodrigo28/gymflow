import { createId, getDatabase } from '@/src/db/client';
import { queueSync } from '@/src/db/outbox';
import type {
  Exercise,
  MuscleGroup,
  PeriodSummary,
  SessionExercise,
  SessionSummary,
  WorkoutSession,
  WorkoutSet,
} from '@/src/types/training';

// As escritas entram em fila: quem digita a carga e toca no check em seguida
// precisa que o valor já esteja salvo quando o recorde for calculado.
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);

  return next;
}

type ExerciseRow = {
  equipment: string;
  id: string;
  kind: Exercise['kind'];
  muscle: MuscleGroup;
  name: string;
  pattern: Exercise['pattern'];
};

type SetRow = {
  distance_m: number | null;
  done: number;
  duration_sec: number | null;
  id: string;
  is_pr: number;
  position: number;
  reps: number | null;
  rpe: number | null;
  session_exercise_id: string;
  weight_kg: number | null;
};

function toSet(row: SetRow): WorkoutSet {
  return {
    distanceM: row.distance_m ?? undefined,
    done: row.done === 1,
    durationSec: row.duration_sec ?? undefined,
    id: row.id,
    isPr: row.is_pr === 1,
    position: row.position,
    reps: row.reps ?? undefined,
    rpe: row.rpe ?? undefined,
    sessionExerciseId: row.session_exercise_id,
    weightKg: row.weight_kg ?? undefined,
  };
}

// Carga estimada para 1 repetição (fórmula de Epley). Serve para comparar séries
// diferentes do mesmo exercício: 60 kg × 10 vale mais que 70 kg × 3.
export function estimateOneRepMax(weightKg: number, reps: number) {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

export async function listExercises(filter: { muscle?: MuscleGroup; search?: string } = {}) {
  const database = await getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.muscle) {
    conditions.push('muscle = ?');
    params.push(filter.muscle);
  }

  if (filter.search?.trim()) {
    conditions.push('lower(name) LIKE ?');
    params.push(`%${filter.search.trim().toLowerCase()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await database.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises ${where} ORDER BY name`,
    params,
  );

  return rows as Exercise[];
}

export async function getActiveSessionId() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );

  return row?.id ?? null;
}

export async function startSession() {
  const database = await getDatabase();
  const existing = await getActiveSessionId();

  if (existing) {
    return existing;
  }

  const id = createId();
  const now = Date.now();
  await database.runAsync('INSERT INTO sessions (id, started_at, updated_at) VALUES (?, ?, ?)', [
    id,
    now,
    now,
  ]);
  await queueSync('session', id, 'create');

  return id;
}

export async function getSession(sessionId: string): Promise<WorkoutSession | null> {
  const database = await getDatabase();
  const session = await database.getFirstAsync<{
    finished_at: number | null;
    id: string;
    note: string | null;
    started_at: number;
  }>('SELECT id, started_at, finished_at, note FROM sessions WHERE id = ?', [sessionId]);

  if (!session) {
    return null;
  }

  const exerciseRows = await database.getAllAsync<
    ExerciseRow & { position: number; session_exercise_id: string }
  >(
    `SELECT se.id AS session_exercise_id, se.position, e.*
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.position`,
    [sessionId],
  );

  const setRows = await database.getAllAsync<SetRow>(
    `SELECT s.* FROM sets s
     JOIN session_exercises se ON se.id = s.session_exercise_id
     WHERE se.session_id = ?
     ORDER BY s.position`,
    [sessionId],
  );

  const exercises: SessionExercise[] = exerciseRows.map((row) => ({
    exercise: {
      equipment: row.equipment,
      id: row.id,
      kind: row.kind,
      muscle: row.muscle,
      name: row.name,
      pattern: row.pattern,
    },
    id: row.session_exercise_id,
    position: row.position,
    sets: setRows.filter((set) => set.session_exercise_id === row.session_exercise_id).map(toSet),
  }));

  return {
    exercises,
    finishedAt: session.finished_at ?? undefined,
    id: session.id,
    note: session.note ?? undefined,
    startedAt: session.started_at,
  };
}

export async function addExerciseToSession(sessionId: string, exerciseId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM session_exercises WHERE session_id = ?',
    [sessionId],
  );
  const id = createId();

  await database.runAsync(
    'INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?)',
    [id, sessionId, exerciseId, row?.next ?? 0],
  );
  await touchSession(sessionId);

  return id;
}

export async function removeSessionExercise(sessionExerciseId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM session_exercises WHERE id = ?', [sessionExerciseId]);
}

// Nova série: copia a anterior do mesmo exercício nesta sessão; se não houver,
// copia a última vez que a pessoa fez esse exercício. É o "repetir última série".
export async function addSet(sessionExerciseId: string) {
  const database = await getDatabase();
  const previous = await database.getFirstAsync<SetRow>(
    'SELECT * FROM sets WHERE session_exercise_id = ? ORDER BY position DESC LIMIT 1',
    [sessionExerciseId],
  );
  const fallback = previous ? null : await getLastSetForSameExercise(sessionExerciseId);
  const model = previous ?? fallback;
  const id = createId();

  await database.runAsync(
    `INSERT INTO sets (id, session_exercise_id, position, weight_kg, reps, duration_sec, distance_m, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      sessionExerciseId,
      (previous?.position ?? -1) + 1,
      model?.weight_kg ?? null,
      model?.reps ?? null,
      model?.duration_sec ?? null,
      model?.distance_m ?? null,
      Date.now(),
    ],
  );

  return id;
}

async function getLastSetForSameExercise(sessionExerciseId: string) {
  const database = await getDatabase();

  return database.getFirstAsync<SetRow>(
    `SELECT s.* FROM sets s
     JOIN session_exercises se ON se.id = s.session_exercise_id
     WHERE se.exercise_id = (SELECT exercise_id FROM session_exercises WHERE id = ?)
       AND s.session_exercise_id != ?
       AND s.done = 1
     ORDER BY s.created_at DESC LIMIT 1`,
    [sessionExerciseId, sessionExerciseId],
  );
}

export function updateSet(
  setId: string,
  values: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rpe' | 'durationSec' | 'distanceM'>>,
) {
  return serialize(async () => {
    const database = await getDatabase();
    const columns: Record<string, string> = {
      distanceM: 'distance_m',
      durationSec: 'duration_sec',
      reps: 'reps',
      rpe: 'rpe',
      weightKg: 'weight_kg',
    };
    const entries = Object.entries(values).filter(([key]) => key in columns);

    if (!entries.length) {
      return;
    }

    const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(', ');
    const params = entries.map(([, value]) => (value === undefined ? null : value));
    await database.runAsync(`UPDATE sets SET ${assignments} WHERE id = ?`, [...params, setId]);
  });
}

export async function deleteSet(setId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sets WHERE id = ?', [setId]);
}

/**
 * Conclui ou desmarca uma série. Ao concluir, compara com o histórico do
 * exercício e marca recorde quando a carga ou a carga estimada para 1 repetição
 * superam tudo o que já foi feito.
 */
export function toggleSetDone(setId: string, done: boolean) {
  return serialize(async () => {
    const database = await getDatabase();

    if (!done) {
      await database.runAsync('UPDATE sets SET done = 0, is_pr = 0 WHERE id = ?', [setId]);
      return { isPr: false };
    }

    const set = await database.getFirstAsync<SetRow & { exercise_id: string }>(
      `SELECT s.*, se.exercise_id FROM sets s
       JOIN session_exercises se ON se.id = s.session_exercise_id
       WHERE s.id = ?`,
      [setId],
    );

    if (!set) {
      return { isPr: false };
    }

    let isPr = false;

    if (set.weight_kg && set.reps) {
      const best = await database.getFirstAsync<{
        best_weight: number | null;
        best_e1rm: number | null;
      }>(
        `SELECT MAX(s.weight_kg) AS best_weight,
                MAX(s.weight_kg * (1 + s.reps / 30.0)) AS best_e1rm
         FROM sets s
         JOIN session_exercises se ON se.id = s.session_exercise_id
         WHERE se.exercise_id = ? AND s.done = 1 AND s.id != ?
           AND s.weight_kg IS NOT NULL AND s.reps IS NOT NULL`,
        [set.exercise_id, setId],
      );
      const currentE1rm = estimateOneRepMax(set.weight_kg, set.reps);

      isPr = (best?.best_weight ?? 0) < set.weight_kg || (best?.best_e1rm ?? 0) < currentE1rm - 0.001;
    }

    await database.runAsync('UPDATE sets SET done = 1, is_pr = ? WHERE id = ?', [isPr ? 1 : 0, setId]);

    return { isPr };
  });
}

export async function finishSession(sessionId: string) {
  const database = await getDatabase();
  // Séries em branco não viram histórico.
  await database.runAsync(
    `DELETE FROM sets WHERE done = 0 AND session_exercise_id IN (
       SELECT id FROM session_exercises WHERE session_id = ?
     )`,
    [sessionId],
  );
  await database.runAsync(
    `DELETE FROM session_exercises WHERE session_id = ?
       AND id NOT IN (SELECT session_exercise_id FROM sets)`,
    [sessionId],
  );
  await database.runAsync('UPDATE sessions SET finished_at = ?, updated_at = ? WHERE id = ?', [
    Date.now(),
    Date.now(),
    sessionId,
  ]);
  await queueSync('session', sessionId, 'update');
}

export async function discardSession(sessionId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

export async function listRecentSessions(limit = 10): Promise<SessionSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    exercise_count: number;
    finished_at: number | null;
    id: string;
    pr_count: number;
    set_count: number;
    started_at: number;
    title: string | null;
    volume: number | null;
  }>(
    `SELECT s.id, s.started_at, s.finished_at,
            (SELECT group_concat(name, ' · ') FROM (
               SELECT DISTINCT e.muscle AS name FROM session_exercises se
               JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = s.id
             )) AS title,
            (SELECT COUNT(*) FROM session_exercises se WHERE se.session_id = s.id) AS exercise_count,
            (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id
               WHERE se.session_id = s.id AND st.done = 1) AS set_count,
            (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id
               WHERE se.session_id = s.id AND st.is_pr = 1) AS pr_count,
            (SELECT SUM(st.weight_kg * st.reps) FROM sets st
               JOIN session_exercises se ON se.id = st.session_exercise_id
               WHERE se.session_id = s.id AND st.done = 1) AS volume
     FROM sessions s
     WHERE s.finished_at IS NOT NULL
     ORDER BY s.started_at DESC
     LIMIT ?`,
    [limit],
  );

  return rows.map((row) => ({
    exerciseCount: row.exercise_count,
    finishedAt: row.finished_at ?? undefined,
    id: row.id,
    prCount: row.pr_count,
    setCount: row.set_count,
    startedAt: row.started_at,
    title: row.title ?? 'Treino',
    volumeKg: Math.round(row.volume ?? 0),
  }));
}

export async function getPeriodSummary(from: number, to: number): Promise<PeriodSummary> {
  const database = await getDatabase();
  const totals = await database.getFirstAsync<{
    session_count: number;
    volume: number | null;
  }>(
    `SELECT COUNT(DISTINCT s.id) AS session_count,
            SUM(st.weight_kg * st.reps) AS volume
     FROM sessions s
     LEFT JOIN session_exercises se ON se.session_id = s.id
     LEFT JOIN sets st ON st.session_exercise_id = se.id AND st.done = 1
     WHERE s.finished_at IS NOT NULL AND s.started_at BETWEEN ? AND ?`,
    [from, to],
  );

  const byMuscle = await database.getAllAsync<{
    muscle: MuscleGroup;
    set_count: number;
    volume: number | null;
  }>(
    `SELECT e.muscle AS muscle, COUNT(st.id) AS set_count, SUM(st.weight_kg * st.reps) AS volume
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN exercises e ON e.id = se.exercise_id
     JOIN sets st ON st.session_exercise_id = se.id AND st.done = 1
     WHERE s.finished_at IS NOT NULL AND s.started_at BETWEEN ? AND ?
     GROUP BY e.muscle
     ORDER BY volume DESC`,
    [from, to],
  );

  const cardio = await database.getFirstAsync<{ seconds: number | null }>(
    `SELECT SUM(st.duration_sec) AS seconds
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN exercises e ON e.id = se.exercise_id AND e.kind = 'cardio'
     JOIN sets st ON st.session_exercise_id = se.id AND st.done = 1
     WHERE s.finished_at IS NOT NULL AND s.started_at BETWEEN ? AND ?`,
    [from, to],
  );

  return {
    byMuscle: byMuscle.map((row) => ({
      muscle: row.muscle,
      setCount: row.set_count,
      volumeKg: Math.round(row.volume ?? 0),
    })),
    cardioMinutes: Math.round((cardio?.seconds ?? 0) / 60),
    from,
    sessionCount: totals?.session_count ?? 0,
    to,
    volumeKg: Math.round(totals?.volume ?? 0),
  };
}

// Dias desde o último treino de cada grupo muscular: é a base do "o que está faltando".
export async function getDaysSinceMuscle() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    last_at: number;
    muscle: MuscleGroup;
  }>(
    `SELECT e.muscle AS muscle, MAX(s.started_at) AS last_at
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN exercises e ON e.id = se.exercise_id
     JOIN sets st ON st.session_exercise_id = se.id AND st.done = 1
     WHERE s.finished_at IS NOT NULL
     GROUP BY e.muscle`,
  );

  return rows.map((row) => ({
    days: Math.floor((Date.now() - row.last_at) / 86_400_000),
    muscle: row.muscle,
  }));
}

async function touchSession(sessionId: string) {
  const database = await getDatabase();
  await database.runAsync('UPDATE sessions SET updated_at = ? WHERE id = ?', [Date.now(), sessionId]);
}

// Enquanto não existe API, a fila só registra o que precisará subir depois.
