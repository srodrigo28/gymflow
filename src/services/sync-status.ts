import { getDatabase } from '@/src/db/client';
import { syncMeasurements } from '@/src/services/body-sync';
import { getPhotoBackupStatus, syncPhotos, type PhotoBackupStatus } from '@/src/services/photo-sync';
import { syncWorkouts } from '@/src/services/sync';
import type { AuthResponse, AuthUser } from '@/src/types/auth';

// Marcas que a sincronização deixa em sync_state. Apagá-las faz a próxima rodada baixar tudo de novo.
const WORKOUTS_RESTORED_KEY = 'workouts_restored_at';
const MEASUREMENTS_EPOCH_KEY = 'measurements_consent_epoch';
const PHOTOS_EPOCH_KEY = 'photos_consent_epoch';
const LAST_SYNC_KEY = 'last_manual_sync_at';

// Os consentimentos que decidem o que sobe além dos treinos.
export type SyncConsents = Pick<AuthUser, 'bodyDataConsentAt' | 'bodyPhotoConsentAt'>;

export type SyncStatus = {
  lastManualSyncAt: number | null;
  measurements: { hasConsent: boolean; pending: number; total: number };
  photos: PhotoBackupStatus & { hasConsent: boolean };
  // Quando este aparelho baixou os treinos da conta pela primeira vez.
  workoutsRestoredAt: number | null;
  workouts: { finished: number; pending: number; synced: number };
};

async function stateValue(key: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key]);

  return row?.value ?? null;
}

// O retrato do que está neste aparelho e do que já está na conta, para a tela Sincronizar.
export async function getSyncStatus({ bodyDataConsentAt, bodyPhotoConsentAt }: SyncConsents): Promise<SyncStatus> {
  const database = await getDatabase();
  const [workouts, pendingWorkouts, measurements, pendingMeasurements, photos, restoredAt, lastSync] =
    await Promise.all([
      database.getFirstAsync<{ finished: number; synced: number }>(
        `SELECT COUNT(*) AS finished, SUM(CASE WHEN synced_at IS NOT NULL THEN 1 ELSE 0 END) AS synced
         FROM sessions WHERE finished_at IS NOT NULL`,
      ),
      database.getFirstAsync<{ total: number }>(
        `SELECT COUNT(DISTINCT entity_id) AS total FROM outbox WHERE entity = 'session'`,
      ),
      database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM measurements'),
      database.getFirstAsync<{ total: number }>(
        `SELECT COUNT(DISTINCT entity_id) AS total FROM outbox WHERE entity = 'measurement'`,
      ),
      getPhotoBackupStatus(bodyPhotoConsentAt),
      stateValue(WORKOUTS_RESTORED_KEY),
      stateValue(LAST_SYNC_KEY),
    ]);

  return {
    lastManualSyncAt: lastSync ? Number(lastSync) : null,
    measurements: {
      hasConsent: Boolean(bodyDataConsentAt),
      pending: pendingMeasurements?.total ?? 0,
      total: measurements?.total ?? 0,
    },
    photos: { ...photos, hasConsent: Boolean(bodyPhotoConsentAt) },
    workoutsRestoredAt: restoredAt ? Number(restoredAt) : null,
    workouts: {
      finished: workouts?.finished ?? 0,
      pending: pendingWorkouts?.total ?? 0,
      synced: workouts?.synced ?? 0,
    },
  };
}

// Sobe o que está na fila e baixa o que falta, agora. É o mesmo caminho dos gatilhos automáticos.
export async function syncNow({ token, user }: AuthResponse) {
  await syncWorkouts(token);
  await syncMeasurements(token, user.bodyDataConsentAt);
  await syncPhotos(user.id, token, user.bodyPhotoConsentAt);

  const database = await getDatabase();
  await database.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
    LAST_SYNC_KEY,
    String(Date.now()),
  ]);
}

// Esquece que este aparelho já baixou a conta e baixa de novo. Não apaga nada daqui: o que já
// existe no aparelho continua com a versão daqui; só entra o que falta.
export async function restoreFromAccount(session: AuthResponse) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_state WHERE key IN (?, ?, ?)', [
    WORKOUTS_RESTORED_KEY,
    MEASUREMENTS_EPOCH_KEY,
    PHOTOS_EPOCH_KEY,
  ]);
  await syncNow(session);
}
