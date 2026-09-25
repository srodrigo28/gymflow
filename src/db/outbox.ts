import { getDatabase } from '@/src/db/client';

const listeners = new Set<() => void>();

// Avisado a cada item novo na fila; é o gatilho da sincronização (src/services/sync.ts).
export function onSyncQueued(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fila de sincronização. Tudo é gravado primeiro no aparelho; aqui fica a lista do que
 * precisa subir para a API. Assim o app funciona inteiro sem rede e nada se perde quando a
 * rede volta. Os treinos sobem sempre; medidas e fotos são dados sensíveis e ficam na fila
 * até existir o consentimento específico de cada uma (body-sync.ts e photo-sync.ts).
 */
export async function queueSync(
  entity: string,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO outbox (entity, entity_id, operation, created_at) VALUES (?, ?, ?, ?)',
    [entity, entityId, operation, Date.now()],
  );

  for (const listener of listeners) {
    listener();
  }
}

export async function countPendingSync() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');

  return row?.total ?? 0;
}
