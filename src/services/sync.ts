import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getDatabase } from '@/src/db/client';
import { onSyncQueued } from '@/src/db/outbox';
import { apiRequest } from '@/src/services/api';

const BATCH_SIZE = 25;
const MAX_ROUNDS = 20;
// Espera um pouco depois de cada mudança: várias séries seguidas viram um envio só.
const QUEUE_DELAY = 1500;

type SessionRow = {
  finished_at: number | null;
  id: string;
  note: string | null;
  started_at: number;
  updated_at: number;
};

type ExerciseRow = { exercise_id: string; id: string; kind: string; muscle: string; name: string; position: number };

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
    `SELECT se.id, se.exercise_id, se.position, e.name, e.muscle, e.kind
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

let running: Promise<void> | null = null;
let runAgain = false;

// Sobe os treinos concluídos que estão na fila. Uma execução por vez; um pedido no meio de
// outra roda de novo no fim, para nada ficar para trás.
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

// Mantém os treinos em dia com a conta: ao entrar, ao voltar para o app e logo depois de cada
// mudança na fila. Sem rede, o envio falha em silêncio e tenta de novo no próximo gatilho.
export function useWorkoutSync(token?: string) {
  useEffect(() => {
    if (!token) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      syncWorkouts(token).catch((error: unknown) => {
        // Sem rede é o caso comum; em desenvolvimento, o motivo aparece no terminal do Metro.
        if (__DEV__) {
          console.warn('Sincronização de treinos falhou:', error instanceof Error ? error.message : error);
        }
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, QUEUE_DELAY);
    };

    run();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        run();
      }
    });
    const unsubscribe = onSyncQueued(schedule);

    return () => {
      clearTimeout(timer);
      appState.remove();
      unsubscribe();
    };
  }, [token]);
}
