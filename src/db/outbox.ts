import { getDatabase } from '@/src/db/client';

/**
 * Fila de sincronização. Tudo é gravado primeiro no aparelho; aqui fica a lista
 * do que ainda precisa subir para a API quando ela existir. Assim o app funciona
 * inteiro sem rede e nada se perde quando a rede volta.
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
}

export async function countPendingSync() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');

  return row?.total ?? 0;
}
