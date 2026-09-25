import { createId } from '@/src/db/client';
import { storage, storageKeys } from '@/src/services/storage';
import type { Gym, GymCheckin, GymCheckinInput, GymInput } from '@/src/types/gym-checkin';
import { dayKey } from '@/src/utils/format';

export { distanceInMeters } from '@/src/utils/geo';

/** Raio padrão em metros: cobre o prédio e o estacionamento, com folga para o erro do GPS. */
export const DEFAULT_GYM_RADIUS_M = 150;
export const GYM_NAME_MAX_LENGTH = 60;
const DEFAULT_GYM_NAME = 'Minha academia';
// Guardar para sempre não ajuda ninguém: 200 visitas dão mais de um ano de histórico.
const MAX_CHECKINS = 200;

// Tudo da funcionalidade mora numa chave só: a academia e o histórico saem juntos ao apagar a conta.
type GymCheckinStore = {
  checkins: GymCheckin[];
  gym: Gym | null;
};

// As escritas entram em fila: registrar é ler, acrescentar e gravar; dois toques rápidos sem a
// fila gravariam um por cima do outro.
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);

  return next;
}

function emptyStore(): GymCheckinStore {
  return { checkins: [], gym: null };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeGym(raw: unknown): Gym | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Partial<Record<keyof Gym, unknown>>;

  // Sem coordenadas válidas não há academia; o resto tem padrão.
  if (
    !isFiniteNumber(data.latitude) ||
    !isFiniteNumber(data.longitude) ||
    Math.abs(data.latitude) > 90 ||
    Math.abs(data.longitude) > 180
  ) {
    return null;
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    name: typeof data.name === 'string' && data.name.trim() ? data.name : DEFAULT_GYM_NAME,
    radiusM: isFiniteNumber(data.radiusM) && data.radiusM > 0 ? data.radiusM : DEFAULT_GYM_RADIUS_M,
    savedAt: isFiniteNumber(data.savedAt) ? data.savedAt : 0,
  };
}

function sanitizeCheckin(raw: unknown): GymCheckin | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Partial<Record<keyof GymCheckin, unknown>>;

  if (typeof data.id !== 'string' || !isFiniteNumber(data.at) || !isFiniteNumber(data.distanceM)) {
    return null;
  }

  return { at: data.at, atGym: data.atGym === true, distanceM: data.distanceM, id: data.id };
}

// O que vem do armazenamento passa por aqui: registro estranho some em vez de quebrar a tela, e a
// lista fica do mais novo para o mais antigo, limitada a MAX_CHECKINS.
function sanitize(raw: unknown): GymCheckinStore {
  if (!raw || typeof raw !== 'object') {
    return emptyStore();
  }

  const data = raw as Partial<Record<keyof GymCheckinStore, unknown>>;
  const checkins = Array.isArray(data.checkins)
    ? data.checkins.map(sanitizeCheckin).filter((item): item is GymCheckin => item !== null)
    : [];

  return {
    checkins: checkins.sort((a, b) => b.at - a.at).slice(0, MAX_CHECKINS),
    gym: sanitizeGym(data.gym),
  };
}

async function read(userId: string): Promise<GymCheckinStore> {
  const stored = await storage.get(storageKeys.gymCheckin(userId));

  if (!stored) {
    return emptyStore();
  }

  try {
    return sanitize(JSON.parse(stored));
  } catch {
    // Valor corrompido vale como nada salvo; a próxima gravação corrige.
    return emptyStore();
  }
}

async function write(userId: string, store: GymCheckinStore) {
  await storage.set(storageKeys.gymCheckin(userId), JSON.stringify(store));
}

// Tira espaços sobrando e quebras de linha; vazio vira o nome padrão, porque o campo é opcional.
export function normalizeGymName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, GYM_NAME_MAX_LENGTH) || DEFAULT_GYM_NAME;
}

function findToday(checkins: GymCheckin[], now: number) {
  const today = dayKey(now);

  // A lista já vem do mais novo para o mais antigo: o primeiro de hoje é o mais recente.
  return checkins.find((checkin) => dayKey(checkin.at) === today) ?? null;
}

/** A academia marcada, ou null enquanto a pessoa não marcou nenhuma. */
export function getGym(userId: string): Promise<Gym | null> {
  // Passa pela fila para ler depois de qualquer gravação pendente.
  return serialize(async () => (await read(userId)).gym);
}

/** Marca (ou substitui) a academia e devolve o que ficou salvo. O histórico não é tocado. */
export function saveGym(userId: string, input: GymInput): Promise<Gym> {
  return serialize(async () => {
    const store = await read(userId);
    const gym: Gym = {
      latitude: input.latitude,
      longitude: input.longitude,
      name: normalizeGymName(input.name),
      radiusM: input.radiusM && input.radiusM > 0 ? input.radiusM : DEFAULT_GYM_RADIUS_M,
      savedAt: Date.now(),
    };

    await write(userId, { ...store, gym });

    return gym;
  });
}

/** Desmarca a academia. Os check-ins ficam: valem para a academia da época. */
export function clearGym(userId: string): Promise<void> {
  return serialize(async () => {
    const store = await read(userId);
    await write(userId, { ...store, gym: null });
  });
}

/** Check-ins do mais novo para o mais antigo. Sem `limit`, todos os guardados (até 200). */
export function listCheckins(userId: string, limit = MAX_CHECKINS): Promise<GymCheckin[]> {
  return serialize(async () => (await read(userId)).checkins.slice(0, limit));
}

/** O check-in de hoje (no calendário do aparelho), ou null. */
export function getTodayCheckin(userId: string): Promise<GymCheckin | null> {
  return serialize(async () => findToday((await read(userId)).checkins, Date.now()));
}

/**
 * Registra a visita de hoje e devolve o que ficou salvo. É um por dia: se já houver um hoje, devolve
 * esse em vez de criar outro (dois toques rápidos não viram dois registros).
 */
export function addCheckin(userId: string, input: GymCheckinInput): Promise<GymCheckin> {
  return serialize(async () => {
    const store = await read(userId);
    const now = Date.now();
    const existing = findToday(store.checkins, now);

    if (existing) {
      return existing;
    }

    const checkin: GymCheckin = {
      at: now,
      atGym: input.atGym,
      // O GPS erra dezenas de metros; casa decimal aqui seria precisão de mentira.
      distanceM: Math.max(0, Math.round(input.distanceM)),
      id: createId(),
    };

    await write(userId, { ...store, checkins: [checkin, ...store.checkins].slice(0, MAX_CHECKINS) });

    return checkin;
  });
}

/** Apaga tudo da funcionalidade (academia e histórico). É o que roda ao apagar a conta. */
export function clearGymCheckins(userId: string): Promise<void> {
  return serialize(() => storage.remove(storageKeys.gymCheckin(userId)));
}
