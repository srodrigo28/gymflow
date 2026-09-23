import type * as SQLiteTypes from 'expo-sqlite';

import { exercisesSeed } from '@/src/db/exercises-seed';
import { storage } from '@/src/services/storage';

type SQLiteDatabase = SQLiteTypes.SQLiteDatabase;

// O expo-sqlite no web carrega WebAssembly e um worker, o que quebra a renderização
// das rotas no servidor. Por isso o módulo só é carregado quando há navegador/app.
async function loadSQLite() {
  if (typeof window === 'undefined') {
    throw new Error('O banco local só existe no app; não use durante a renderização no servidor.');
  }

  return import('expo-sqlite');
}

// O banco de antes das contas. Fica com a primeira pessoa que entrar no aparelho.
const FIRST_DATABASE_NAME = 'gynflow.db';
const FIRST_DATABASE_OWNER_KEY = 'gynflow.db.firstOwner';

// Cada item é uma migração. Para mudar o banco, acrescente no fim da lista;
// nunca edite uma migração já publicada.
const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    muscle TEXT NOT NULL,
    pattern TEXT NOT NULL,
    equipment TEXT NOT NULL,
    kind TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    note TEXT,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_exercise_id TEXT NOT NULL REFERENCES session_exercises (id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    weight_kg REAL,
    reps INTEGER,
    duration_sec INTEGER,
    distance_m REAL,
    rpe INTEGER,
    done INTEGER NOT NULL DEFAULT 0,
    is_pr INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Fila de sincronização: o que ainda não subiu para a API.
  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises (session_id);
  CREATE INDEX IF NOT EXISTS idx_sets_session_exercise ON sets (session_exercise_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions (started_at DESC);
  `,
  `
  -- Medidas do corpo. Só a data é obrigatória: quem só se pesa registra o peso.
  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY NOT NULL,
    taken_at INTEGER NOT NULL,
    weight_kg REAL,
    body_fat_pct REAL,
    waist_cm REAL,
    hip_cm REAL,
    chest_cm REAL,
    arm_cm REAL,
    thigh_cm REAL,
    note TEXT,
    updated_at INTEGER NOT NULL
  );

  -- Fotos de evolução. O arquivo fica na pasta privada do app; aqui guardamos o
  -- caminho, o mês de referência e a pose.
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    uri TEXT NOT NULL,
    month TEXT NOT NULL,
    pose TEXT NOT NULL,
    taken_at INTEGER NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_measurements_taken ON measurements (taken_at DESC);
  CREATE INDEX IF NOT EXISTS idx_photos_month ON photos (month DESC, pose);
  `,
];

let currentUserId: string | null = null;
let opened: { promise: Promise<SQLiteDatabase>; userId: string } | null = null;

// Cada conta tem o próprio arquivo de banco. Quem entra depois no mesmo aparelho não vê nem
// sincroniza os treinos de outra pessoa, e nada é apagado na troca de conta.
export function setDatabaseUser(userId: string | null) {
  currentUserId = userId;
}

async function databaseNameFor(userId: string) {
  const firstOwner = await storage.get(FIRST_DATABASE_OWNER_KEY);

  if (firstOwner === userId) {
    return FIRST_DATABASE_NAME;
  }

  if (!firstOwner) {
    await storage.set(FIRST_DATABASE_OWNER_KEY, userId);
    return FIRST_DATABASE_NAME;
  }

  return `gynflow-${userId}.db`;
}

async function migrate(database: SQLiteDatabase) {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version += 1) {
    await database.execAsync(migrations[version]);
    await database.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

async function seedExercises(database: SQLiteDatabase) {
  for (const exercise of exercisesSeed) {
    await database.runAsync(
      `INSERT INTO exercises (id, name, muscle, pattern, equipment, kind)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, muscle = excluded.muscle,
         pattern = excluded.pattern, equipment = excluded.equipment, kind = excluded.kind`,
      [exercise.id, exercise.name, exercise.muscle, exercise.pattern, exercise.equipment, exercise.kind],
    );
  }
}

async function openDatabase(userId: string) {
  const sqlite = await loadSQLite();
  const database = await sqlite.openDatabaseAsync(await databaseNameFor(userId));
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(database);
  await seedExercises(database);
  return database;
}

// Abre o banco da conta atual uma única vez por execução do app.
export function getDatabase() {
  const userId = currentUserId;

  if (!userId) {
    return Promise.reject(new Error('O banco local pertence a uma conta: entre para ver seus treinos.'));
  }

  if (!opened || opened.userId !== userId) {
    opened = { promise: openDatabase(userId), userId };
  }

  return opened.promise;
}

export function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
