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
  `
  -- O que a sincronização já fez neste aparelho (por exemplo, baixar os treinos da conta).
  -- Fica no banco da conta, então sai junto quando a conta é apagada.
  CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  `
  -- Modalidade do exercício (corrida, natação, luta, yoga...). O que já estava no banco nasce como
  -- musculação e o catálogo acerta cada um logo em seguida (seedExercises). Os que vieram só da
  -- conta, fora do catálogo, ficam com a modalidade do tipo de série: cardio quando não é força.
  ALTER TABLE exercises ADD COLUMN modality TEXT NOT NULL DEFAULT 'musculacao';
  UPDATE exercises SET modality = 'cardio' WHERE kind <> 'forca';
  `,
  `
  -- Fotos na conta, com o consentimento das fotos (services/photo-sync.ts). synced_epoch: o
  -- consentimento (o instante do aceite) com que a foto está na conta; nula, só neste aparelho.
  -- sync_error: por que o servidor recusou a foto (formato ou tamanho); ela continua só aqui.
  -- full_pending: 1 enquanto só a miniatura da conta chegou; a foto inteira vem logo depois.
  ALTER TABLE photos ADD COLUMN synced_epoch TEXT;
  ALTER TABLE photos ADD COLUMN sync_error TEXT;
  ALTER TABLE photos ADD COLUMN full_pending INTEGER NOT NULL DEFAULT 0;
  `,
  `
  -- Treino começado por uma prescrição do personal (Fase 5): qual prescrição e qual dia dela (a posição
  -- na lista de dias, a partir de 0). Sobem com o treino (planId e planDay) e voltam no download. Nulos
  -- no treino livre e em todos os de antes.
  ALTER TABLE sessions ADD COLUMN plan_id TEXT;
  ALTER TABLE sessions ADD COLUMN plan_day INTEGER;
  `,
  `
  -- Treino começado pelo plano da semana da IA (Fase 6): a semana do plano (a segunda-feira, AAAA-MM-DD) e o
  -- dia (0 = segunda). Ficam só no aparelho: o plano da IA não é prescrição de ninguém e não sobe com o
  -- treino. A sessão usa os dois para achar os alvos na cópia do plano guardada aqui.
  ALTER TABLE sessions ADD COLUMN ai_week TEXT;
  ALTER TABLE sessions ADD COLUMN ai_weekday INTEGER;
  `,
];

let currentUserId: string | null = null;
// Uma conexão por conta, mantida até o app fechar. Reabrir o mesmo arquivo no Android fazia o
// coletor de lixo fechar a conexão antiga por baixo da nova (NullPointerException no
// expo-sqlite) quando alguém saía e voltava a entrar sem fechar o app.
const openedByUser = new Map<string, Promise<SQLiteDatabase>>();

// Cada conta tem o próprio arquivo de banco. Quem entra depois no mesmo aparelho não vê nem
// sincroniza os treinos de outra pessoa, e nada é apagado na troca de conta.
export function setDatabaseUser(userId: string | null) {
  currentUserId = userId;
}

// A conta dona do banco que getDatabase() abre agora. Uma sincronização pedida por outra conta (que
// saiu no meio da rodada) confere aqui antes de ler o banco: o que é de uma conta não sobe na outra.
export function getDatabaseUser() {
  return currentUserId;
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
      `INSERT INTO exercises (id, name, muscle, pattern, equipment, kind, modality)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, muscle = excluded.muscle,
         pattern = excluded.pattern, equipment = excluded.equipment, kind = excluded.kind,
         modality = excluded.modality`,
      [
        exercise.id,
        exercise.name,
        exercise.muscle,
        exercise.pattern,
        exercise.equipment,
        exercise.kind,
        exercise.modality,
      ],
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

  let database = openedByUser.get(userId);

  if (!database) {
    database = openDatabase(userId);
    openedByUser.set(userId, database);
    // Se a abertura falhar, a próxima chamada tenta de novo.
    database.catch(() => openedByUser.delete(userId));
  }

  return database;
}

// Apaga o arquivo de banco de uma conta (usado quando a pessoa apaga a conta). Sem adotar o
// banco antigo por engano: só apaga o que já pertence a ela.
export async function deleteLocalDatabase(userId: string) {
  if (currentUserId === userId) {
    currentUserId = null;
  }

  const opened = openedByUser.get(userId);
  openedByUser.delete(userId);
  await (await opened?.catch(() => null))?.closeAsync();

  const isFirstOwner = (await storage.get(FIRST_DATABASE_OWNER_KEY)) === userId;
  const sqlite = await loadSQLite();
  await sqlite.deleteDatabaseAsync(isFirstOwner ? FIRST_DATABASE_NAME : `gynflow-${userId}.db`);

  if (isFirstOwner) {
    await storage.remove(FIRST_DATABASE_OWNER_KEY);
  }
}

export function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
