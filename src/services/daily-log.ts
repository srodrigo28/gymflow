import { useEffect, useRef } from 'react';

import { ApiError } from '@/src/services/api';
import { GLASS_ML, pullDailyLogs, pushDailyLogs } from '@/src/services/daily-log-api';
import {
  clearDailyLog,
  getSyncedConsent,
  listPendingDailyLogs,
  mergeRemoteDailyLogs,
  onDailyLogQueued,
  readDailyLogState,
  requeueAllDailyLogs,
  setSyncedConsent,
  settleDailyLogs,
  updateDailyLogEntry,
  type DailyLogEntry,
} from '@/src/services/daily-log-store';
import { getWaterGlassesByDay, restoreWaterGlasses } from '@/src/services/nutrition';
import { useSyncTriggers } from '@/src/services/sync';
import type { DailyLogPage, DailyLogPush, Mood } from '@/src/types/daily-log';

// Diário do dia (22-estrategia.md, seção 3.3, categoria Equilíbrio): sono e humor ficam neste aparelho,
// por conta (services/daily-log-store.ts), e a água é a da Alimentação. Sobem para a conta só com o
// consentimento próprio, porque sono e humor são dado de saúde: um registro por dia, e a versão mais nova
// de cada dia vence. Não vira XP; da temporada, sai só a contagem de dias de Equilíbrio.

export { clearDailyLog, onDailyLogQueued };

// O máximo que a API aceita por envio.
const BATCH_SIZE = 50;
const MAX_ROUNDS = 20;
// Espera um pouco depois de cada mudança: vários toques no sono viram um envio só.
const QUEUE_DELAY = 1500;

/** Passo do sono na tela e o máximo de um dia, em minutos. */
export const SLEEP_STEP_MINUTES = 30;
export const SLEEP_MAX_MINUTES = 14 * 60;
/** Onde o sono começa no primeiro toque num dia sem registro: o meio do que se recomenda a adultos. */
export const SLEEP_START_MINUTES = 7 * 60;

export type DailyLogDay = {
  day: string;
  mood: Mood | null;
  sleepMinutes: number | null;
  // Os copos da Alimentação: a água do diário é a mesma.
  waterGlasses: number;
};

export async function getDailyLogDay(userId: string, day: string): Promise<DailyLogDay> {
  const [state, water] = await Promise.all([readDailyLogState(userId), getWaterGlassesByDay(userId)]);
  const entry = state.days[day];

  return {
    day,
    mood: entry?.mood ?? null,
    sleepMinutes: entry?.sleepMinutes ?? null,
    waterGlasses: water[day] ?? 0,
  };
}

/** Soma `delta` minutos ao sono do dia, de 0 a 14 h. Sem registro, começa em 7 h. Devolve o que ficou. */
export async function adjustDailySleep(userId: string, day: string, delta: number) {
  const values = await updateDailyLogEntry(userId, day, (current) => ({
    ...current,
    sleepMinutes:
      current.sleepMinutes === null
        ? SLEEP_START_MINUTES
        : Math.min(Math.max(current.sleepMinutes + delta, 0), SLEEP_MAX_MINUTES),
  }));

  return values.sleepMinutes;
}

/** Tira o sono do dia: volta a "sem registro". */
export async function clearDailySleep(userId: string, day: string) {
  await updateDailyLogEntry(userId, day, (current) => ({ ...current, sleepMinutes: null }));
}

/** Marca o humor do dia; null limpa. Devolve o que ficou. */
export async function setDailyMood(userId: string, day: string, mood: Mood | null) {
  const values = await updateDailyLogEntry(userId, day, (current) => ({ ...current, mood }));

  return values.mood;
}

/** Quantos dias ainda não subiram. Sem consentimento, é o que vai subir quando ele for dado. */
export async function countPendingDailyLogs(userId: string) {
  return Object.keys((await readDailyLogState(userId)).pending).length;
}

/** Quantos dias têm sono, humor ou água anotados neste aparelho. */
export async function countDailyLogDays(userId: string) {
  const [state, water] = await Promise.all([readDailyLogState(userId), getWaterGlassesByDay(userId)]);
  const days = new Set(Object.keys(water).filter((day) => (water[day] ?? 0) > 0));

  for (const [day, entry] of Object.entries(state.days)) {
    if (entry.mood !== null || entry.sleepMinutes !== null) {
      days.add(day);
    }
  }

  return days.size;
}

const syncedListeners = new Set<() => void>();

// Avisado quando dias sobem ou chegam da conta: a tela aberta recarrega o dia e a contagem da fila.
export function onDailyLogSynced(listener: () => void) {
  syncedListeners.add(listener);

  return () => {
    syncedListeners.delete(listener);
  };
}

function notifySynced() {
  for (const listener of syncedListeners) {
    listener();
  }
}

// O dia no formato da API. A água vai em ml (0 copos: sem registro). Sem sono, humor nem água, o dia
// sai da conta.
function payloadOf(day: string, entry: DailyLogEntry | undefined, glasses: number, stamp: number): DailyLogPush {
  const mood = entry?.mood ?? null;
  const sleepMinutes = entry?.sleepMinutes ?? null;
  const waterMl = glasses > 0 ? glasses * GLASS_ML : null;

  if (mood === null && sleepMinutes === null && waterMl === null) {
    return { day, deleted: true };
  }

  return { day, mood, sleepMinutes, updatedAt: entry?.updatedAt ?? stamp, waterMl };
}

// Envia um lote da fila e devolve quantos dias saíram dela.
async function pushBatch(userId: string, token: string) {
  const batch = await listPendingDailyLogs(userId, BATCH_SIZE);

  if (batch.length === 0) {
    return 0;
  }

  const water = await getWaterGlassesByDay(userId);
  const result = await pushDailyLogs(
    token,
    batch.map((item) => payloadOf(item.day, item.entry, water[item.day] ?? 0, item.stamp)),
  );
  // Fora do formato também sai da fila: tentar de novo não muda nada, e um dia ruim não pode segurar os
  // outros. O dia continua no aparelho.
  const handled = new Set([...result.synced, ...result.invalid.map((item) => item.day)]);

  if (__DEV__ && result.invalid.length > 0) {
    console.warn('Dias do diário fora do formato ficaram só no aparelho:', result.invalid);
  }

  const settled = batch.filter((item) => handled.has(item.day));
  await settleDailyLogs(userId, settled);

  return settled.length;
}

// Baixa o diário da conta, página a página. Sono e humor entram onde a versão da conta é a mais nova (um
// dia ainda na fila fica com a daqui); a água só preenche os dias sem copos anotados neste aparelho.
async function restoreDailyLogs(userId: string, token: string) {
  let after: string | undefined;

  do {
    const page: DailyLogPage = await pullDailyLogs(token, after);
    const glasses: Record<string, number> = {};

    for (const log of page.logs) {
      if (log.waterMl !== null && log.waterMl > 0) {
        glasses[log.day] = Math.round(log.waterMl / GLASS_ML);
      }
    }

    const [changed, watered] = await Promise.all([
      mergeRemoteDailyLogs(userId, page.logs),
      restoreWaterGlasses(userId, glasses),
    ]);

    if (changed + watered > 0) {
      notifySynced();
    }

    after = page.nextCursor ?? undefined;
  } while (after);
}

type SyncArgs = { consentAt: string; token: string; userId: string };

let running: Promise<void> | null = null;
// O pedido que chegou durante uma execução: roda no fim, com a conta e o consentimento mais recentes.
let queued: SyncArgs | null = null;
// A API publicada ainda sem as rotas do diário (404): não insiste até o app abrir de novo.
let unavailable = false;

// Sobe os dias da fila e, a cada consentimento novo (o primeiro, ou um dado de novo depois de retirado),
// reenvia tudo o que está no aparelho e baixa o que já estava na conta. Sem consentimento, nada sai
// daqui. Uma execução por vez; um pedido no meio de outra roda no fim.
export function syncDailyLogs(userId: string, token: string, consentAt: string | null): Promise<void> {
  if (!consentAt || unavailable) {
    return Promise.resolve();
  }

  if (running) {
    queued = { consentAt, token, userId };
    return running;
  }

  running = (async () => {
    try {
      const isNewConsent = (await getSyncedConsent(userId)) !== consentAt;

      if (isNewConsent) {
        // Tudo o que está no aparelho volta para a fila: um consentimento retirado esvaziou a conta, e o
        // que já tinha subido antes precisa subir de novo.
        const water = await getWaterGlassesByDay(userId);
        await requeueAllDailyLogs(
          userId,
          Object.keys(water).filter((day) => (water[day] ?? 0) > 0),
        );
      }

      let sent = 0;

      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const count = await pushBatch(userId, token);
        sent += count;

        if (count < BATCH_SIZE) {
          break;
        }
      }

      if (sent > 0) {
        notifySynced();
      }

      if (isNewConsent) {
        // Só depois do envio: um dia apagado aqui já saiu da conta e não volta no download.
        await restoreDailyLogs(userId, token);
        await setSyncedConsent(userId, consentAt);
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

      if (queued) {
        const next = queued;
        queued = null;
        void syncDailyLogs(next.userId, next.token, next.consentAt).catch(() => {});
      }
    }
  })();

  return running;
}

// Mantém o diário em dia com a conta enquanto houver consentimento, no molde de useBodySync: a chave muda
// com a conta e com cada consentimento novo, e cada mudança dispara uma rodada na hora.
export function useDailyLogSync(userId?: string, token?: string, consentAt?: string | null) {
  const key = userId && token && consentAt ? `${token}:${consentAt}` : null;
  const run = () => syncDailyLogs(userId as string, token as string, consentAt ?? null);

  useSyncTriggers(key, run, 'diário do dia');

  // A fila do diário não é a do banco (outbox): um toque no sono, no humor ou na água avisa por aqui.
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!key) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onDailyLogQueued(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        runRef.current().catch((error: unknown) => {
          if (__DEV__) {
            console.warn('Sincronização do diário do dia falhou:', error instanceof Error ? error.message : error);
          }
        });
      }, QUEUE_DELAY);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key]);
}
