import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '@/src/db/client';
import { ApiError, apiRequest } from '@/src/services/api';
import { useSyncTriggers } from '@/src/services/sync';

const BATCH_SIZE = 25;
const MAX_ROUNDS = 20;
const RESTORE_PAGE = 50;
// O instante do consentimento com que este aparelho já acertou tudo com a conta.
const EPOCH_KEY = 'measurements_consent_epoch';

type MeasurementRow = {
  arm_cm: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  id: string;
  note: string | null;
  taken_at: number;
  thigh_cm: number | null;
  updated_at: number;
  waist_cm: number | null;
  weight_kg: number | null;
};

// A medida no formato da API: o mesmo no envio e no download.
type RemoteMeasurement = {
  armCm: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  hipCm: number | null;
  id: string;
  note: string | null;
  takenAt: number;
  thighCm: number | null;
  updatedAt: number;
  waistCm: number | null;
  weightKg: number | null;
};

type SyncResult = { invalid: { id: string; reason: string }[]; rejected: string[]; synced: string[] };
type RestorePage = { measurements: RemoteMeasurement[]; nextCursor: string | null };

const listeners = new Set<() => void>();

// Avisado quando medidas sobem ou chegam da conta: a tela aberta recarrega o gráfico e a fila.
export function onMeasurementsSynced(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// Quantas medidas ainda não subiram. Sem consentimento, é o que vai subir quando ele for dado.
export async function countPendingMeasurements() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>(
    `SELECT COUNT(DISTINCT entity_id) AS total FROM outbox WHERE entity = 'measurement'`,
  );

  return row?.total ?? 0;
}

async function measurementPayload(database: SQLiteDatabase, id: string) {
  const row = await database.getFirstAsync<MeasurementRow>('SELECT * FROM measurements WHERE id = ?', [id]);

  // Apagada no aparelho: o servidor tira da conta (se chegou a subir).
  if (!row) {
    return { deleted: true as const, id };
  }

  return {
    armCm: row.arm_cm,
    bodyFatPct: row.body_fat_pct,
    chestCm: row.chest_cm,
    hipCm: row.hip_cm,
    id: row.id,
    note: row.note,
    takenAt: row.taken_at,
    thighCm: row.thigh_cm,
    updatedAt: row.updated_at,
    waistCm: row.waist_cm,
    weightKg: row.weight_kg,
  };
}

// Envia um lote da fila e devolve quantas medidas foram no envio.
async function pushBatch(database: SQLiteDatabase, token: string) {
  const pending = await database.getAllAsync<{ entity_id: string; last_id: number }>(
    `SELECT entity_id, MAX(id) AS last_id
     FROM outbox
     WHERE entity = 'measurement'
     GROUP BY entity_id
     ORDER BY last_id
     LIMIT ?`,
    [BATCH_SIZE],
  );

  if (pending.length === 0) {
    return 0;
  }

  const batch: { lastId: number; payload: Awaited<ReturnType<typeof measurementPayload>> }[] = [];

  for (const row of pending) {
    batch.push({ lastId: row.last_id, payload: await measurementPayload(database, row.entity_id) });
  }

  const result = await apiRequest<SyncResult>('/sync/measurements', {
    body: { measurements: batch.map((item) => item.payload) },
    method: 'POST',
    token,
  });
  // Recusado (id de outra conta) e fora do formato também saem da fila: tentar de novo não muda
  // nada, e um registro ruim não pode segurar os outros. A medida continua no aparelho.
  const handled = new Set([...result.synced, ...result.rejected, ...result.invalid.map((item) => item.id)]);

  if (__DEV__ && result.invalid.length > 0) {
    console.warn('Medidas fora do formato ficaram só no aparelho:', result.invalid);
  }

  for (const { lastId, payload } of batch) {
    if (!handled.has(payload.id)) {
      continue;
    }

    // Só até o registro lido: uma mudança que chegou durante o envio sobe na próxima rodada.
    await database.runAsync(`DELETE FROM outbox WHERE entity = 'measurement' AND entity_id = ? AND id <= ?`, [
      payload.id,
      lastId,
    ]);
  }

  return batch.length;
}

// Grava uma medida que veio da conta. Não entra na fila: ela já está no servidor.
async function saveRemoteMeasurement(database: SQLiteDatabase, measurement: RemoteMeasurement) {
  await database.runAsync(
    `INSERT INTO measurements
       (id, taken_at, weight_kg, body_fat_pct, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      measurement.id,
      measurement.takenAt,
      measurement.weightKg,
      measurement.bodyFatPct,
      measurement.waistCm,
      measurement.hipCm,
      measurement.chestCm,
      measurement.armCm,
      measurement.thighCm,
      measurement.note,
      measurement.updatedAt,
    ],
  );
}

// Baixa as medidas da conta que não estão neste aparelho. O que já está aqui, ou ainda na fila,
// fica com a versão daqui.
async function restoreMeasurements(database: SQLiteDatabase, token: string) {
  let after: string | null = null;

  do {
    const path = `/sync/measurements?limit=${RESTORE_PAGE}${after ? `&after=${encodeURIComponent(after)}` : ''}`;
    const page: RestorePage = await apiRequest<RestorePage>(path, { token });
    let saved = 0;

    for (const measurement of page.measurements) {
      const isLocal = await database.getFirstAsync(
        `SELECT 1 FROM measurements WHERE id = ?
         UNION ALL SELECT 1 FROM outbox WHERE entity = 'measurement' AND entity_id = ?
         LIMIT 1`,
        [measurement.id, measurement.id],
      );

      if (!isLocal) {
        await saveRemoteMeasurement(database, measurement);
        saved += 1;
      }
    }

    if (saved > 0) {
      notify();
    }

    after = page.nextCursor;
  } while (after);
}

let running: Promise<void> | null = null;
let runAgain = false;
// A API publicada ainda sem as rotas de medidas (404): não insiste até o app abrir de novo.
let unavailable = false;

// Sobe as medidas da fila e, a cada consentimento novo (o primeiro, ou um dado de novo depois de
// retirado), reenvia tudo o que está no aparelho e baixa o que já estava na conta. Sem
// consentimento, nada sai daqui. Uma execução por vez; um pedido no meio de outra roda no fim.
export function syncMeasurements(token: string, consentAt: string | null): Promise<void> {
  if (!consentAt || unavailable) {
    return Promise.resolve();
  }

  if (running) {
    runAgain = true;
    return running;
  }

  running = (async () => {
    try {
      const database = await getDatabase();
      const stored = await database.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [
        EPOCH_KEY,
      ]);
      const isNewConsent = stored?.value !== consentAt;

      if (isNewConsent) {
        // Tudo o que está no aparelho volta para a fila: um consentimento retirado esvaziou a conta,
        // e o que já tinha subido antes precisa subir de novo.
        await database.runAsync(
          `INSERT INTO outbox (entity, entity_id, operation, created_at)
           SELECT 'measurement', id, 'update', ? FROM measurements`,
          [Date.now()],
        );
      }

      let sent = 0;

      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const count = await pushBatch(database, token);
        sent += count;

        if (count < BATCH_SIZE) {
          break;
        }
      }

      if (sent > 0) {
        notify();
      }

      if (isNewConsent) {
        // Só depois do envio: uma medida apagada aqui já saiu da conta e não volta no download.
        await restoreMeasurements(database, token);
        await database.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
          EPOCH_KEY,
          consentAt,
        ]);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        unavailable = true;
        return;
      }

      // Consentimento retirado em outro aparelho: a sessão, quando atualizar, para de chamar.
      if (error instanceof ApiError && error.code === 'CONSENT_REQUIRED') {
        return;
      }

      throw error;
    } finally {
      running = null;

      if (runAgain) {
        runAgain = false;
        void syncMeasurements(token, consentAt).catch(() => {});
      }
    }
  })();

  return running;
}

// Mantém as medidas em dia com a conta enquanto houver consentimento. A chave muda com a conta e com
// cada consentimento novo, e cada mudança dispara uma rodada na hora.
export function useBodySync(token?: string, consentAt?: string | null) {
  useSyncTriggers(
    token && consentAt ? `${token}:${consentAt}` : null,
    () => syncMeasurements(token as string, consentAt ?? null),
    'medidas',
  );
}
