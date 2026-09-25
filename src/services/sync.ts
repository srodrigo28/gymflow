import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { modalities } from '@/src/constants/modalities';
import { getDatabase } from '@/src/db/client';
import { onSyncQueued } from '@/src/db/outbox';
import { ApiError, apiRequest } from '@/src/services/api';
import type { Modality } from '@/src/types/training';

const BATCH_SIZE = 25;
const MAX_ROUNDS = 20;
// Espera um pouco depois de cada mudança: várias séries seguidas viram um envio só.
const QUEUE_DELAY = 1500;
const RESTORE_PAGE = 50;
const RESTORED_KEY = 'workouts_restored_at';

type SessionRow = {
  finished_at: number | null;
  id: string;
  note: string | null;
  started_at: number;
  updated_at: number;
};

type ExerciseRow = {
  exercise_id: string;
  id: string;
  kind: string;
  modality: string;
  muscle: string;
  name: string;
  position: number;
};

const knownModalities = new Set<string>(modalities.map((item) => item.id));

function isModality(value: unknown): value is Modality {
  return typeof value === 'string' && knownModalities.has(value);
}

// A modalidade do exercício, como está no catálogo. Treino antigo da conta (sem modalidade) ou de
// uma versão mais nova do app (com uma que esta não conhece) fica com a do tipo de série: musculação
// para força, cardio para o resto. O envio passa por aqui também: a API recusa modalidade desconhecida.
function modalityOf(value: unknown, kind: string): Modality {
  if (isModality(value)) {
    return value;
  }

  return kind === 'forca' ? 'musculacao' : 'cardio';
}

type SetRow = {
  created_at: number;
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

// O treino inteiro, no formato da API. null quando ainda está em andamento: sobe quando terminar.
async function workoutPayload(sessionId: string) {
  const database = await getDatabase();
  const session = await database.getFirstAsync<SessionRow>(
    'SELECT id, started_at, finished_at, note, updated_at FROM sessions WHERE id = ?',
    [sessionId],
  );

  // Descartado no aparelho: o servidor tira da conta (se chegou a subir).
  if (!session) {
    return { deleted: true as const, id: sessionId };
  }

  if (session.finished_at === null) {
    return null;
  }

  const exercises = await database.getAllAsync<ExerciseRow>(
    `SELECT se.id, se.exercise_id, se.position, e.name, e.muscle, e.kind, e.modality
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.position`,
    [sessionId],
  );
  const sets = await database.getAllAsync<SetRow>(
    `SELECT st.*
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     WHERE se.session_id = ?
     ORDER BY st.position`,
    [sessionId],
  );

  return {
    exercises: exercises.map((exercise) => ({
      exerciseId: exercise.exercise_id,
      id: exercise.id,
      kind: exercise.kind,
      modality: modalityOf(exercise.modality, exercise.kind),
      muscle: exercise.muscle,
      name: exercise.name,
      position: exercise.position,
      sets: sets
        .filter((set) => set.session_exercise_id === exercise.id)
        .map((set) => ({
          createdAt: set.created_at,
          distanceM: set.distance_m,
          done: set.done === 1,
          durationSec: set.duration_sec,
          id: set.id,
          isPr: set.is_pr === 1,
          position: set.position,
          reps: set.reps,
          rpe: set.rpe,
          weightKg: set.weight_kg,
        })),
    })),
    finishedAt: session.finished_at,
    id: session.id,
    note: session.note,
    startedAt: session.started_at,
    updatedAt: session.updated_at,
  };
}

// Envia um lote da fila e devolve quantos treinos foram no envio.
async function pushBatch(token: string) {
  const database = await getDatabase();
  const pending = await database.getAllAsync<{ entity_id: string; last_id: number }>(
    `SELECT entity_id, MAX(id) AS last_id
     FROM outbox
     WHERE entity = 'session'
     GROUP BY entity_id
     ORDER BY last_id
     LIMIT ?`,
    [BATCH_SIZE + 1],
  );
  const batch: { lastId: number; payload: NonNullable<Awaited<ReturnType<typeof workoutPayload>>> }[] = [];

  for (const row of pending) {
    const payload = await workoutPayload(row.entity_id);

    if (payload && batch.length < BATCH_SIZE) {
      batch.push({ lastId: row.last_id, payload });
    }
  }

  if (batch.length === 0) {
    return 0;
  }

  const result = await apiRequest<{
    invalid: { id: string; reason: string }[];
    rejected: string[];
    synced: string[];
  }>('/sync/workouts', {
    body: { workouts: batch.map((item) => item.payload) },
    method: 'POST',
    token,
  });
  // Recusado (id de outra conta) e fora do formato também saem da fila: tentar de novo não
  // muda nada, e um registro ruim não pode segurar os outros. O treino continua no aparelho.
  const handled = new Set([...result.synced, ...result.rejected, ...result.invalid.map((item) => item.id)]);

  if (__DEV__ && result.invalid.length > 0) {
    console.warn('Treinos fora do formato ficaram só no aparelho:', result.invalid);
  }
  const now = Date.now();

  for (const { lastId, payload } of batch) {
    if (!handled.has(payload.id)) {
      continue;
    }

    // Só até o registro lido: uma mudança que chegou durante o envio sobe na próxima rodada.
    await database.runAsync(`DELETE FROM outbox WHERE entity = 'session' AND entity_id = ? AND id <= ?`, [
      payload.id,
      lastId,
    ]);
    await database.runAsync('UPDATE sessions SET synced_at = ? WHERE id = ?', [now, payload.id]);
  }

  return batch.length;
}

// O treino como a API devolve no download: o mesmo formato do envio.
type RemoteWorkout = {
  exercises: {
    exerciseId: string;
    id: string;
    kind: string;
    // null nos treinos que subiram antes das modalidades.
    modality?: string | null;
    muscle: string;
    name: string;
    position: number;
    sets: {
      createdAt: number;
      distanceM: number | null;
      done: boolean;
      durationSec: number | null;
      id: string;
      isPr: boolean;
      position: number;
      reps: number | null;
      rpe: number | null;
      weightKg: number | null;
    }[];
  }[];
  finishedAt: number | null;
  id: string;
  note: string | null;
  startedAt: number;
  updatedAt: number;
};

type RestorePage = { nextCursor: string | null; workouts: RemoteWorkout[] };

// Grava um treino que veio da conta. Não entra na fila: ele já está no servidor.
async function saveRemoteWorkout(database: SQLiteDatabase, workout: RemoteWorkout) {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'INSERT INTO sessions (id, started_at, finished_at, note, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?)',
      [workout.id, workout.startedAt, workout.finishedAt, workout.note, workout.updatedAt, Date.now()],
    );

    for (const exercise of workout.exercises) {
      // O catálogo vem do app. Um exercício que saiu dele volta com o nome, o grupo e a modalidade
      // do servidor; um que ainda está nele fica como o catálogo diz.
      await database.runAsync(
        `INSERT OR IGNORE INTO exercises (id, name, muscle, pattern, equipment, kind, modality)
         VALUES (?, ?, ?, '', '', ?, ?)`,
        [
          exercise.exerciseId,
          exercise.name,
          exercise.muscle,
          exercise.kind,
          modalityOf(exercise.modality, exercise.kind),
        ],
      );
      await database.runAsync(
        'INSERT INTO session_exercises (id, session_id, exercise_id, position) VALUES (?, ?, ?, ?)',
        [exercise.id, workout.id, exercise.exerciseId, exercise.position],
      );

      for (const set of exercise.sets) {
        await database.runAsync(
          `INSERT INTO sets
             (id, session_exercise_id, position, weight_kg, reps, duration_sec, distance_m, rpe, done, is_pr, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            set.id,
            exercise.id,
            set.position,
            set.weightKg,
            set.reps,
            set.durationSec,
            set.distanceM,
            set.rpe,
            set.done ? 1 : 0,
            set.isPr ? 1 : 0,
            set.createdAt,
          ],
        );
      }
    }
  });
}

// A API publicada ainda sem o download (404): não pergunta de novo até o app abrir outra vez.
let restoreUnavailable = false;
const restoredListeners = new Set<() => void>();

// Avisado quando treinos da conta chegam do servidor. A tela aberta recarrega: num aparelho novo,
// ela pode ter carregado vazia antes de o download terminar.
export function onWorkoutsRestored(listener: () => void) {
  restoredListeners.add(listener);

  return () => {
    restoredListeners.delete(listener);
  };
}

// Baixa os treinos da conta que não estão neste aparelho: é o que traz o histórico de volta num
// celular novo. Roda uma vez por conta em cada aparelho. O que já está aqui, ou ainda na fila,
// fica com a versão daqui.
async function restoreWorkouts(token: string) {
  const database = await getDatabase();

  if (restoreUnavailable || (await database.getFirstAsync('SELECT 1 FROM sync_state WHERE key = ?', [RESTORED_KEY]))) {
    return;
  }

  let after: string | null = null;

  do {
    const path = `/sync/workouts?limit=${RESTORE_PAGE}${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    let page: RestorePage;

    try {
      page = await apiRequest<RestorePage>(path, { token });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        restoreUnavailable = true;
        return;
      }

      throw error;
    }

    let saved = 0;

    for (const workout of page.workouts) {
      const isLocal = await database.getFirstAsync(
        `SELECT 1 FROM sessions WHERE id = ?
         UNION ALL SELECT 1 FROM outbox WHERE entity = 'session' AND entity_id = ?
         LIMIT 1`,
        [workout.id, workout.id],
      );

      if (!isLocal) {
        await saveRemoteWorkout(database, workout);
        saved += 1;
      }
    }

    if (saved > 0) {
      for (const listener of restoredListeners) {
        listener();
      }
    }

    after = page.nextCursor;
  } while (after);

  await database.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
    RESTORED_KEY,
    String(Date.now()),
  ]);
}

let running: Promise<void> | null = null;
let runAgain = false;

// Sobe os treinos concluídos que estão na fila e, na primeira vez da conta neste aparelho, baixa os
// que já estavam nela. Uma execução por vez; um pedido no meio de outra roda de novo no fim, para
// nada ficar para trás.
export function syncWorkouts(token: string): Promise<void> {
  if (running) {
    runAgain = true;
    return running;
  }

  running = (async () => {
    try {
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        if ((await pushBatch(token)) < BATCH_SIZE) {
          break;
        }
      }

      // Só depois do envio: um treino apagado aqui já saiu da conta e não volta no download.
      await restoreWorkouts(token);
    } finally {
      running = null;

      if (runAgain) {
        runAgain = false;
        void syncWorkouts(token).catch(() => {});
      }
    }
  })();

  return running;
}

// Os gatilhos de toda sincronização: ao entrar, ao voltar para o app e logo depois de cada mudança
// na fila. `key` identifica a rodada (a conta e o que mais mudar o que sobe): quando ela muda, uma
// rodada nova começa na hora; nula, nada roda. Sem rede, o envio falha em silêncio e tenta de novo
// no próximo gatilho.
export function useSyncTriggers(key: string | null, run: () => Promise<void>, label: string) {
  // A função muda a cada render; o efeito só precisa da versão mais recente.
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!key) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const execute = () => {
      runRef.current().catch((error: unknown) => {
        // Sem rede é o caso comum; em desenvolvimento, o motivo aparece no terminal do Metro.
        if (__DEV__) {
          console.warn(`Sincronização de ${label} falhou:`, error instanceof Error ? error.message : error);
        }
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(execute, QUEUE_DELAY);
    };

    execute();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        execute();
      }
    });
    const unsubscribe = onSyncQueued(schedule);

    return () => {
      clearTimeout(timer);
      appState.remove();
      unsubscribe();
    };
  }, [key, label]);
}

// Mantém os treinos em dia com a conta enquanto houver alguém logado.
export function useWorkoutSync(token?: string) {
  useSyncTriggers(token ?? null, () => syncWorkouts(token as string), 'treinos');
}
