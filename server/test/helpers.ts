import { createApp } from '../src/app.js';

let ipCounter = 0;

export function newIp() {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

type RequestOptions = { body?: unknown; ip?: string; token?: string };

// Respostas lidas nos testes sem tipar cada rota.
export type Json = any;

export function client() {
  const app = createApp();

  async function request(method: string, path: string, { body, ip, token }: RequestOptions = {}) {
    const headers: Record<string, string> = { 'x-forwarded-for': ip ?? newIp() };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await app.request(path, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
    });
    const text = await response.text();
    const isJson = response.headers.get('content-type')?.includes('application/json');

    return { body: (isJson && text ? JSON.parse(text) : text) as Json, status: response.status };
  }

  async function signUp(name = 'Ana Teste', email?: string, password = 'Treino2026') {
    const address = email ?? `${name.split(' ')[0]?.toLowerCase()}.${Math.random().toString(36).slice(2, 8)}@gynflow.test`;
    const response = await request('POST', '/auth/sign-up', { body: { email: address, name, password } });

    if (response.status !== 201) {
      throw new Error(`Cadastro falhou: ${response.status} ${JSON.stringify(response.body)}`);
    }

    return { email: address, password, token: response.body.token as string, user: response.body.user as Json };
  }

  return { request, signUp };
}

const HOUR = 60 * 60 * 1000;

// Meia-noite em São Paulo (UTC-3, sem horário de verão) de `daysAgo` dias atrás, em UTC.
export function saoPauloMidnight(daysAgo: number) {
  const wall = new Date(Date.now() - 3 * HOUR);
  return Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - daysAgo, 3);
}

let idCounter = 0;

export function clientId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter}`;
}

type WorkoutOptions = {
  done?: boolean;
  finishedAt?: number | null;
  id?: string;
  note?: string | null;
  sets?: number;
  startedAt?: number;
  updatedAt?: number;
};

// Treino no formato que o app envia: um exercício com `sets` séries de 60 kg × 10.
export function workoutPayload({
  done = true,
  finishedAt,
  id = clientId('w'),
  note = null,
  sets = 2,
  startedAt = Date.now() - HOUR,
  updatedAt = Date.now(),
}: WorkoutOptions = {}) {
  return {
    exercises: [
      {
        exerciseId: 'supino-reto',
        id: clientId('e'),
        kind: 'forca',
        muscle: 'peito',
        name: 'Supino reto',
        position: 0,
        sets: Array.from({ length: sets }, (_, index) => ({
          createdAt: startedAt + index * 60_000,
          distanceM: null,
          done,
          durationSec: null,
          id: clientId('s'),
          isPr: false,
          position: index,
          reps: 10,
          rpe: null,
          weightKg: 60,
        })),
      },
    ],
    finishedAt: finishedAt === undefined ? startedAt + HOUR / 2 : finishedAt,
    id,
    note,
    startedAt,
    updatedAt,
  };
}
