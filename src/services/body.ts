import { Directory, File, Paths } from 'expo-file-system';

import { createId, getDatabase } from '@/src/db/client';
import { queueSync } from '@/src/db/outbox';
import type { BodyTrend, Measurement, ProgressPhoto, Pose } from '@/src/types/body';

type MeasurementRow = {
  arm_cm: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  id: string;
  note: string | null;
  taken_at: number;
  thigh_cm: number | null;
  waist_cm: number | null;
  weight_kg: number | null;
};

type PhotoRow = {
  created_at: number;
  id: string;
  month: string;
  note: string | null;
  pose: Pose;
  taken_at: number;
  uri: string;
};

const PHOTOS_FOLDER = 'evolucao';

function toMeasurement(row: MeasurementRow): Measurement {
  return {
    armCm: row.arm_cm ?? undefined,
    bodyFatPct: row.body_fat_pct ?? undefined,
    chestCm: row.chest_cm ?? undefined,
    hipCm: row.hip_cm ?? undefined,
    id: row.id,
    note: row.note ?? undefined,
    takenAt: row.taken_at,
    thighCm: row.thigh_cm ?? undefined,
    waistCm: row.waist_cm ?? undefined,
    weightKg: row.weight_kg ?? undefined,
  };
}

function toPhoto(row: PhotoRow): ProgressPhoto {
  return {
    createdAt: row.created_at,
    id: row.id,
    month: row.month,
    note: row.note ?? undefined,
    pose: row.pose,
    takenAt: row.taken_at,
    uri: row.uri,
  };
}

export async function saveMeasurement(values: Omit<Measurement, 'id'>) {
  const database = await getDatabase();
  const id = createId();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO measurements
       (id, taken_at, weight_kg, body_fat_pct, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, note, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      values.takenAt,
      values.weightKg ?? null,
      values.bodyFatPct ?? null,
      values.waistCm ?? null,
      values.hipCm ?? null,
      values.chestCm ?? null,
      values.armCm ?? null,
      values.thighCm ?? null,
      values.note ?? null,
      now,
    ],
  );
  await queueSync('measurement', id, 'create');

  return id;
}

export async function listMeasurements(limit = 60) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<MeasurementRow>(
    'SELECT * FROM measurements ORDER BY taken_at DESC LIMIT ?',
    [limit],
  );

  return rows.map(toMeasurement);
}

export async function countMeasurements() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM measurements');

  return row?.total ?? 0;
}

export async function deleteMeasurement(id: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM measurements WHERE id = ?', [id]);
  await queueSync('measurement', id, 'delete');
}

/** Primeira e última medição com peso, para dizer quanto mudou desde o começo. */
export async function getBodyTrend(): Promise<BodyTrend> {
  const database = await getDatabase();
  const [first, latest, total] = await Promise.all([
    database.getFirstAsync<MeasurementRow>(
      'SELECT * FROM measurements WHERE weight_kg IS NOT NULL ORDER BY taken_at ASC LIMIT 1',
    ),
    database.getFirstAsync<MeasurementRow>(
      'SELECT * FROM measurements WHERE weight_kg IS NOT NULL ORDER BY taken_at DESC LIMIT 1',
    ),
    database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM measurements'),
  ]);

  const deltaKg =
    first && latest && first.id !== latest.id && first.weight_kg && latest.weight_kg
      ? latest.weight_kg - first.weight_kg
      : undefined;

  return {
    deltaKg,
    first: first ? toMeasurement(first) : undefined,
    latest: latest ? toMeasurement(latest) : undefined,
    measurementCount: total?.total ?? 0,
  };
}

/** Série de peso em ordem cronológica, do mais antigo para o mais novo. */
export async function getWeightSeries(limit = 40) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ taken_at: number; weight_kg: number }>(
    `SELECT taken_at, weight_kg FROM measurements
     WHERE weight_kg IS NOT NULL
     ORDER BY taken_at DESC LIMIT ?`,
    [limit],
  );

  return rows.map((row) => ({ takenAt: row.taken_at, weightKg: row.weight_kg })).reverse();
}

function photosDirectory() {
  const directory = new Directory(Paths.document, PHOTOS_FOLDER);

  if (!directory.exists) {
    directory.create({ idempotent: true });
  }

  return directory;
}

/**
 * Copia a foto escolhida para a pasta privada do app. O arquivo original fica
 * na galeria ou no cache da câmera e pode sumir; a cópia é nossa e não sai do
 * aparelho enquanto não houver compartilhamento explícito.
 */
export async function savePhoto(values: { month: string; pose: Pose; takenAt?: number; uri: string }) {
  const database = await getDatabase();
  const id = createId();
  const source = new File(values.uri);
  const extension = source.extension || '.jpg';
  const destination = new File(photosDirectory(), `${id}${extension}`);

  source.copy(destination);

  const now = Date.now();
  await database.runAsync(
    'INSERT INTO photos (id, uri, month, pose, taken_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, destination.uri, values.month, values.pose, values.takenAt ?? now, now],
  );
  await queueSync('photo', id, 'create');

  return id;
}

export async function listPhotos(filter: { month?: string; pose?: Pose } = {}) {
  const database = await getDatabase();
  const conditions: string[] = [];
  const params: string[] = [];

  if (filter.month) {
    conditions.push('month = ?');
    params.push(filter.month);
  }

  if (filter.pose) {
    conditions.push('pose = ?');
    params.push(filter.pose);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await database.getAllAsync<PhotoRow>(
    `SELECT * FROM photos ${where} ORDER BY month DESC, taken_at DESC`,
    params,
  );

  return rows.map(toPhoto);
}

/** Meses que têm foto, do mais novo para o mais antigo. */
export async function listPhotoMonths() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ month: string; total: number }>(
    'SELECT month, COUNT(*) AS total FROM photos GROUP BY month ORDER BY month DESC',
  );

  return rows;
}

// Apaga os arquivos de todas as fotos da conta atual (quando a pessoa apaga a conta). A pasta
// de fotos é do app inteiro; quais arquivos são dela está no banco dela.
export async function deleteAllPhotoFiles() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ uri: string }>('SELECT uri FROM photos');

  for (const { uri } of rows) {
    const file = new File(uri);

    if (file.exists) {
      file.delete();
    }
  }
}

export async function deletePhoto(id: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', [id]);

  if (!row) {
    return;
  }

  const file = new File(row.uri);

  if (file.exists) {
    file.delete();
  }

  await database.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  await queueSync('photo', id, 'delete');
}
