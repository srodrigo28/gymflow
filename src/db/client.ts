import type * as SQLiteTypes from 'expo-sqlite';

import { exercisesSeed } from '@/src/db/exercises-seed';

type SQLiteDatabase = SQLiteTypes.SQLiteDatabase;

// O expo-sqlite no web carrega WebAssembly e um worker, o que quebra a renderização
// das rotas no servidor. Por isso o módulo só é carregado quando há navegador/app.
async function loadSQLite() {
  if (typeof window === 'undefined') {
    throw new Error('O banco local só existe no app; não use durante a renderização no servidor.');
  }

  return import('expo-sqlite');
}

const DATABASE_NAME = 'gynflow.db';

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
];

let databasePromise: Promise<SQLiteDatabase> | null = null;

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

// Abre o banco uma única vez por execução do app.
export function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const sqlite = await loadSQLite();
      const database = await sqlite.openDatabaseAsync(DATABASE_NAME);
      await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(database);
      await seedExercises(database);
      return database;
    })();
  }

  return databasePromise;
}

export function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
