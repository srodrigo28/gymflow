import { storage, storageKeys } from '@/src/services/storage';
import type { DailyLog, Mood } from '@/src/types/daily-log';
import { parseDayKey } from '@/src/utils/format';

// Onde o diário do dia fica neste aparelho: sono e humor por dia, a fila dos dias que ainda não subiram
// e o consentimento com que o aparelho já acertou tudo com a conta. Tudo numa chave só por conta, como o
// diário alimentar: é pouco dado (uma linha por dia) e uma escrita grava o valor e a fila juntos.
// A água não mora aqui: é a da Alimentação, que avisa por markDailyLogChanged quando muda. Este arquivo
// não importa a Alimentação (quem junta as duas é services/daily-log.ts): senão o import seria circular.

/** O sono e o humor de um dia. null: sem registro. */
export type DailyLogValues = { mood: Mood | null; sleepMinutes: number | null };

export type DailyLogEntry = DailyLogValues & {
  // A última mudança do dia neste aparelho (ms), contando a água. É a versão que sobe: a mais nova vence.
  updatedAt: number;
};

export type DailyLogState = {
  days: Record<string, DailyLogEntry>;
  // Dias que ainda não subiram, com o instante da última mudança. O envio só tira da fila o dia que não
  // mudou de novo enquanto subia.
  pending: Record<string, number>;
  // O consentimento (ISO) com que este aparelho já acertou tudo com a conta.
  syncedConsentAt: string | null;
};

const listeners = new Set<() => void>();

/** Avisado a cada dia que entra na fila: é o gatilho do envio (useDailyLogSync). */
export function onDailyLogQueued(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notifyQueued() {
  for (const listener of listeners) {
    listener();
  }
}

// Escritas em fila, como no diário alimentar: dois toques rápidos leriam o mesmo estado e um se perderia.
let pendingWrite: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = pendingWrite.then(task, task);
  pendingWrite = run.catch(() => undefined);

  return run;
}

function isMood(value: unknown): value is Mood {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

// Minutos de sono e instantes: número finito, sem valor negativo.
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function emptyState(): DailyLogState {
  return { days: {}, pending: {}, syncedConsentAt: null };
}

export async function readDailyLogState(userId: string): Promise<DailyLogState> {
  const stored = await storage.get(storageKeys.dailyLog(userId));

  if (!stored) {
    return emptyState();
  }

  try {
    const parsed = asRecord(JSON.parse(stored));
    const state = emptyState();

    for (const [day, value] of Object.entries(asRecord(parsed.days))) {
      const entry = asRecord(value);

      if (isCount(entry.updatedAt)) {
        state.days[day] = {
          mood: isMood(entry.mood) ? entry.mood : null,
          sleepMinutes: isCount(entry.sleepMinutes) ? entry.sleepMinutes : null,
          updatedAt: entry.updatedAt,
        };
      }
    }

    for (const [day, stamp] of Object.entries(asRecord(parsed.pending))) {
      if (isCount(stamp)) {
        state.pending[day] = stamp;
      }
    }

    state.syncedConsentAt = typeof parsed.syncedConsentAt === 'string' ? parsed.syncedConsentAt : null;

    return state;
  } catch {
    // Conteúdo ilegível: melhor recomeçar o diário do que travar a tela.
    return emptyState();
  }
}

function writeState(userId: string, state: DailyLogState) {
  return storage.set(storageKeys.dailyLog(userId), JSON.stringify(state));
}

/**
 * Muda o sono e/ou o humor de um dia e põe o dia na fila. `change` recebe o dia como está e devolve os
 * valores novos. Sem mudança de verdade nada é gravado, a não ser com `touch` (a água mudou). Devolve o
 * dia como ficou.
 */
export function updateDailyLogEntry(
  userId: string,
  day: string,
  change: (current: DailyLogValues) => DailyLogValues,
  touch = false,
): Promise<DailyLogValues> {
  return enqueue(async () => {
    const state = await readDailyLogState(userId);
    const current = state.days[day];
    const before: DailyLogValues = { mood: current?.mood ?? null, sleepMinutes: current?.sleepMinutes ?? null };
    const after = change(before);

    if (!touch && after.mood === before.mood && after.sleepMinutes === before.sleepMinutes) {
      return before;
    }

    // Sempre depois da versão anterior do dia, mesmo com dois toques no mesmo milissegundo ou com o
    // relógio do aparelho voltando.
    const stamp = Math.max(Date.now(), (current?.updatedAt ?? 0) + 1, (state.pending[day] ?? 0) + 1);

    await writeState(userId, {
      ...state,
      days: { ...state.days, [day]: { ...after, updatedAt: stamp } },
      pending: { ...state.pending, [day]: stamp },
    });
    notifyQueued();

    return after;
  });
}

/** A água do dia mudou na Alimentação: o dia ganha uma versão nova e entra na fila. */
export function markDailyLogChanged(userId: string, day: string) {
  return updateDailyLogEntry(userId, day, (current) => current, true);
}

/** Até `limit` dias da fila, do que mudou há mais tempo para o mais recente. */
export async function listPendingDailyLogs(userId: string, limit: number) {
  const state = await readDailyLogState(userId);

  return Object.entries(state.pending)
    .sort(([, a], [, b]) => a - b)
    .slice(0, limit)
    .map(([day, stamp]) => ({ day, entry: state.days[day] as DailyLogEntry | undefined, stamp }));
}

/** Tira da fila os dias que subiram, só na versão que subiu: um dia que mudou no meio fica para a próxima rodada. */
export function settleDailyLogs(userId: string, sent: { day: string; stamp: number }[]) {
  return enqueue(async () => {
    const state = await readDailyLogState(userId);
    const done = new Set(sent.filter((item) => state.pending[item.day] === item.stamp).map((item) => item.day));

    if (done.size > 0) {
      await writeState(userId, {
        ...state,
        pending: Object.fromEntries(Object.entries(state.pending).filter(([day]) => !done.has(day))),
      });
    }
  });
}

/**
 * Consentimento novo: todos os dias com registro voltam para a fila, com a versão que já tinham (a conta
 * pode ter uma mais nova, de outro aparelho, e é ela que deve vencer). `waterDays`: os dias com água na
 * Alimentação. Um dia que só tem água anotada antes de o diário existir ganha como versão o começo do
 * próprio dia, e perde para qualquer registro de verdade.
 */
export function requeueAllDailyLogs(userId: string, waterDays: string[]) {
  return enqueue(async () => {
    const state = await readDailyLogState(userId);
    const days = { ...state.days };
    const pending = { ...state.pending };
    const watered = new Set(waterDays);

    for (const day of watered) {
      if (!days[day]) {
        days[day] = { mood: null, sleepMinutes: null, updatedAt: parseDayKey(day).getTime() };
      }
    }

    for (const [day, entry] of Object.entries(days)) {
      const hasData = entry.mood !== null || entry.sleepMinutes !== null || watered.has(day);

      if (hasData && pending[day] === undefined) {
        pending[day] = entry.updatedAt;
      }
    }

    await writeState(userId, { ...state, days, pending });
  });
}

/**
 * Grava o sono e o humor que vieram da conta. Um dia ainda na fila fica com a versão daqui (ela vai subir,
 * e lá a mais nova vence); fora da fila, fica a mais nova das duas. Devolve quantos dias mudaram.
 */
export function mergeRemoteDailyLogs(userId: string, logs: DailyLog[]) {
  return enqueue(async () => {
    const state = await readDailyLogState(userId);
    const days = { ...state.days };
    let changed = 0;

    for (const log of logs) {
      const local = days[log.day];
      const updatedAt = isCount(log.updatedAt) ? log.updatedAt : 0;

      if (state.pending[log.day] !== undefined || (local && local.updatedAt >= updatedAt)) {
        continue;
      }

      days[log.day] = {
        mood: isMood(log.mood) ? log.mood : null,
        sleepMinutes: isCount(log.sleepMinutes) ? log.sleepMinutes : null,
        updatedAt,
      };
      changed += 1;
    }

    if (changed > 0) {
      await writeState(userId, { ...state, days });
    }

    return changed;
  });
}

export async function getSyncedConsent(userId: string) {
  return (await readDailyLogState(userId)).syncedConsentAt;
}

export function setSyncedConsent(userId: string, consentAt: string) {
  return enqueue(async () => {
    const state = await readDailyLogState(userId);

    await writeState(userId, { ...state, syncedConsentAt: consentAt });
  });
}

/** Apaga o diário do dia deste aparelho: sono, humor, a fila e a marca do consentimento. */
export function clearDailyLog(userId: string) {
  return enqueue(() => storage.remove(storageKeys.dailyLog(userId)));
}
