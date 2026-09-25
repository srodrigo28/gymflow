import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getDatabase, getDatabaseUser } from '@/src/db/client';
import { ApiError } from '@/src/services/api';
import { photosDirectory } from '@/src/services/body';
import { deleteRemotePhoto, listRemotePhotos, uploadPhoto } from '@/src/services/photo-sync-api';
import { useSyncTriggers } from '@/src/services/sync';
import type { Pose } from '@/src/types/body';
import type { RemotePhoto } from '@/src/types/photos';

// Fotos de evolução na conta (22-estrategia.md, seções 2.3 e 4), no molde das medidas (body-sync.ts): a
// fila é a do banco (outbox, entity 'photo'), o instante do consentimento das fotos é a época, e cada
// consentimento novo sobe o que falta na conta e baixa o que já estava nela. Foto de corpo é o dado mais
// sensível do app: sem esse consentimento, separado do das medidas, nada sai daqui. O servidor refaz cada
// foto sem os metadados e só a entrega por URLs assinadas que valem 10 minutos.

// Por rodada, abaixo das 120 por hora que a API aceita. O resto sobe na rodada seguinte.
const MAX_UPLOADS = 100;
const RESTORE_PAGE = 50;
// O limite da API. Acima dele a foto nem sai do aparelho: a resposta seria 413 depois de subir tudo.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// A URL assinada vale 10 minutos: com menos de um de prazo, a página é pedida de novo antes de baixar...
const URL_MARGIN = 60 * 1000;
// ...no máximo uma vez por minuto, para um relógio adiantado no aparelho não virar uma consulta por foto.
const RENEW_MIN_AGE = 60 * 1000;
// Depois do limite de envios por hora (429), quanto esperar antes de mandar outro arquivo.
const RATE_LIMIT_PAUSE = 15 * 60 * 1000;
// A miniatura que chega primeiro na restauração. A foto inteira fica em `<id>.jpg`.
const THUMB_SUFFIX = '-miniatura.jpg';
// O instante do consentimento com que este aparelho já acertou as fotos com a conta (enviou e baixou tudo).
const EPOCH_KEY = 'photos_consent_epoch';
// O consentimento para o qual a fila já foi refeita. Fica separado da época: com o servidor ainda sem
// armazenamento (503) por semanas, a época não fecha, e a fila não pode ser refeita a cada rodada.
const REQUEUED_KEY = 'photos_requeued_for';
// Recusas que tentar de novo não resolve: formato que o servidor não lê, foto grande demais, id de outra
// conta ou campo fora do formato. A foto continua no aparelho e sai da fila para não segurar as outras.
const REFUSALS = new Set(['ID_TAKEN', 'INVALID_IMAGE', 'INVALID_INPUT', 'PAYLOAD_TOO_LARGE']);
// No web não existe a pasta privada (expo-file-system): lá as fotos não sincronizam.
const canSync = Platform.OS !== 'web';

type PhotoRow = {
  created_at: number;
  id: string;
  month: string;
  note: string | null;
  pose: Pose;
  taken_at: number;
  uri: string;
};

// O que a sincronização das fotos faz agora.
export type PhotoSyncActivity = 'idle' | 'sending' | 'restoring';

export type PhotoBackupStatus = {
  activity: PhotoSyncActivity;
  // Na conta, com o consentimento de agora.
  inAccount: number;
  // Na fila para subir. Sem consentimento, é o que vai subir quando ele for dado.
  pending: number;
  // Recusadas pelo servidor (formato ou tamanho): continuam só aqui.
  refused: number;
  // O servidor ainda não guarda fotos: elas esperam na fila, seguras no aparelho.
  serverWaiting: boolean;
  total: number;
};

const listeners = new Set<() => void>();
let activity: PhotoSyncActivity = 'idle';
// A API respondeu 503 FOTOS_NAO_CONFIGURADAS (ou ainda não tem as rotas das fotos). Só na memória: cada
// rodada pergunta de novo.
let serverWaiting = false;

// Avisado quando fotos sobem, chegam da conta ou o envio muda de estado: a galeria e o cartão recarregam.
export function onPhotosSynced(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setActivity(next: PhotoSyncActivity) {
  if (activity !== next) {
    activity = next;
    notify();
  }
}

function setServerWaiting(next: boolean) {
  if (serverWaiting !== next) {
    serverWaiting = next;
    notify();
  }
}

// O retrato das fotos para o cartão e para a tela Sincronizar. Sem consentimento, nenhuma está na conta.
export async function getPhotoBackupStatus(consentAt: string | null): Promise<PhotoBackupStatus> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    in_account: number | null;
    pending: number | null;
    refused: number | null;
    total: number;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN p.synced_epoch = ? THEN 1 ELSE 0 END) AS in_account,
       SUM(CASE WHEN q.entity_id IS NOT NULL THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN q.entity_id IS NULL AND p.sync_error IS NOT NULL THEN 1 ELSE 0 END) AS refused
     FROM photos p
     LEFT JOIN (SELECT DISTINCT entity_id FROM outbox WHERE entity = 'photo') q ON q.entity_id = p.id`,
    [consentAt],
  );

  return {
    activity,
    inAccount: consentAt ? (row?.in_account ?? 0) : 0,
    pending: row?.pending ?? 0,
    refused: consentAt ? (row?.refused ?? 0) : 0,
    serverWaiting,
    total: row?.total ?? 0,
  };
}

// Cada parada (stopPhotoSync) troca a geração: a rodada que começou antes para no próximo passo.
let generation = 0;

class PhotoSyncStopped extends Error {}

function assertNotStopped(started: number) {
  if (started !== generation) {
    throw new PhotoSyncStopped('A sincronização das fotos parou.');
  }
}

// Tira um arquivo que não vai ser usado. Uma falha aqui não pode esconder o erro que trouxe até aqui.
function removeFile(file: File) {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Já tinha saído, ou o sistema não deixou: segue sem ele.
  }
}

// O tamanho da foto no aparelho, ou null quando o arquivo não existe mais.
function localSize(uri: string) {
  try {
    const file = new File(uri);

    return file.exists ? file.size : null;
  } catch {
    return null;
  }
}

// Sobe uma foto. Devolve o motivo quando o servidor a recusa de vez, e null quando ela chegou à conta.
async function upload(token: string, row: PhotoRow) {
  const size = localSize(row.uri);

  if (size === null) {
    return 'FILE_MISSING';
  }

  if (size > MAX_UPLOAD_BYTES) {
    return 'PAYLOAD_TOO_LARGE';
  }

  try {
    await uploadPhoto(token, {
      id: row.id,
      month: row.month,
      note: row.note,
      pose: row.pose,
      takenAt: row.taken_at,
      // A foto não muda depois de salva: a versão dela é o instante em que entrou no aparelho.
      updatedAt: row.created_at,
      uri: row.uri,
    });

    return null;
  } catch (error) {
    if (error instanceof ApiError && REFUSALS.has(error.code)) {
      if (__DEV__) {
        console.warn('Foto recusada pelo servidor, ficou só no aparelho:', row.id, error.message);
      }

      return error.code;
    }

    throw error;
  }
}

// Sobe (ou tira da conta) a foto mais antiga da fila. Devolve false quando a fila acabou.
async function pushNext(database: SQLiteDatabase, token: string, consentAt: string) {
  const next = await database.getFirstAsync<{ entity_id: string; last_id: number }>(
    `SELECT entity_id, MAX(id) AS last_id
     FROM outbox
     WHERE entity = 'photo'
     GROUP BY entity_id
     ORDER BY last_id
     LIMIT 1`,
  );

  if (!next) {
    return false;
  }

  const row = await database.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', [next.entity_id]);

  if (row) {
    const refusal = await upload(token, row);
    await database.runAsync('UPDATE photos SET synced_epoch = ?, sync_error = ? WHERE id = ?', [
      refusal ? null : consentAt,
      refusal,
      row.id,
    ]);
  } else {
    // Apagada no aparelho: sai da conta também. 404 é a foto que nunca chegou lá.
    try {
      await deleteRemotePhoto(token, next.entity_id);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        throw error;
      }
    }
  }

  // Só até o registro lido: uma mudança que chegou durante o envio sobe na próxima rodada.
  await database.runAsync(`DELETE FROM outbox WHERE entity = 'photo' AND entity_id = ? AND id <= ?`, [
    next.entity_id,
    next.last_id,
  ]);

  return true;
}

// Sobe a fila uma foto por vez: cada envio é um arquivo inteiro.
async function pushPhotos(database: SQLiteDatabase, token: string, consentAt: string, started: number) {
  if (!(await database.getFirstAsync(`SELECT 1 FROM outbox WHERE entity = 'photo' LIMIT 1`))) {
    return;
  }

  // Uma consulta leve antes do primeiro arquivo: com o servidor ainda sem armazenamento (503) ou o
  // consentimento retirado em outro aparelho (403), a resposta chega sem gastar os megas de uma foto.
  await listRemotePhotos(token, undefined, 1);
  setServerWaiting(false);
  setActivity('sending');

  for (let sent = 0; sent < MAX_UPLOADS; sent += 1) {
    assertNotStopped(started);

    if (!(await pushNext(database, token, consentAt))) {
      break;
    }

    notify();
  }
}

type Page = { fetchedAt: number; nextCursor: string | null; photos: RemotePhoto[] };

async function fetchPage(token: string, after: string | undefined): Promise<Page> {
  const { nextCursor, photos } = await listRemotePhotos(token, after, RESTORE_PAGE);
  setServerWaiting(false);

  return { fetchedAt: Date.now(), nextCursor, photos };
}

// Uma página das fotos da conta, com as URLs assinadas. Elas vencem em 10 minutos: `renew` pede a mesma
// página de novo e devolve a foto com as URLs novas (ou nada, se ela saiu da conta nesse meio-tempo).
async function openPage(token: string, after: string | undefined) {
  let page = await fetchPage(token, after);

  return {
    find: (id: string) => page.photos.find((photo) => photo.id === id),
    ids: () => page.photos.map((photo) => photo.id),
    // Perto de vencer pelo relógio daqui. Uma página pedida há menos de um minuto vale de qualquer jeito.
    isExpiring: (photo: RemotePhoto) =>
      Date.now() - page.fetchedAt >= RENEW_MIN_AGE && Date.parse(photo.expiresAt) - URL_MARGIN <= Date.now(),
    nextCursor: () => page.nextCursor,
    renew: async (id: string) => {
      page = await fetchPage(token, after);

      return page.photos.find((photo) => photo.id === id);
    },
  };
}

type RemotePageLinks = Awaited<ReturnType<typeof openPage>>;

// Baixa um arquivo da foto (a miniatura ou a inteira) para `destination`. Com a URL perto de vencer, ou se
// o download falhar, a página é pedida de novo e a foto tenta mais uma vez. Devolve false quando o arquivo
// não veio: a foto saiu da conta, ou falhou de novo e fica para a próxima rodada.
async function downloadPhotoFile(
  links: RemotePageLinks,
  id: string,
  pick: (photo: RemotePhoto) => string,
  destination: File,
) {
  let photo = links.find(id);
  let renewed = false;

  if (photo && links.isExpiring(photo)) {
    photo = await links.renew(id);
    renewed = true;
  }

  while (photo) {
    try {
      await File.downloadFileAsync(pick(photo), destination, { idempotent: true });
      return true;
    } catch (error) {
      // No Android, um download que cai no meio deixa o arquivo pela metade.
      removeFile(destination);

      if (renewed) {
        if (__DEV__) {
          console.warn('Foto da conta não baixou, fica para a próxima rodada:', id, error);
        }

        return false;
      }

      photo = await links.renew(id);
      renewed = true;
    }
  }

  return false;
}

// Já está no aparelho, ou ainda na fila (apagada aqui, esperando sair da conta): fica a versão daqui.
async function isLocal(database: SQLiteDatabase, id: string) {
  const row = await database.getFirstAsync(
    `SELECT 1 FROM photos WHERE id = ?
     UNION ALL SELECT 1 FROM outbox WHERE entity = 'photo' AND entity_id = ?
     LIMIT 1`,
    [id, id],
  );

  return row !== null;
}

// A miniatura chega primeiro e já entra na galeria, marcada como incompleta. Não entra na fila: a foto já
// está na conta. A versão da conta vira a daqui (created_at), para o servidor reconhecer a mesma foto se
// ela subir de novo num consentimento novo.
async function saveThumbnail(
  database: SQLiteDatabase,
  links: RemotePageLinks,
  photo: RemotePhoto,
  consentAt: string,
  started: number,
) {
  const destination = new File(photosDirectory(), `${photo.id}${THUMB_SUFFIX}`);

  if (!(await downloadPhotoFile(links, photo.id, (item) => item.thumbUrl, destination))) {
    return false;
  }

  try {
    assertNotStopped(started);
    await database.runAsync(
      `INSERT INTO photos (id, uri, month, pose, taken_at, note, created_at, synced_epoch, full_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [photo.id, destination.uri, photo.month, photo.pose, photo.takenAt, photo.note, photo.updatedAt, consentAt],
    );
  } catch (error) {
    removeFile(destination);
    throw error;
  }

  return true;
}

// Troca a miniatura pela foto inteira. Devolve true quando trocou.
async function saveFullPhoto(database: SQLiteDatabase, links: RemotePageLinks, id: string, started: number) {
  const row = await database.getFirstAsync<{ uri: string }>(
    'SELECT uri FROM photos WHERE id = ? AND full_pending = 1',
    [id],
  );

  if (!row) {
    return false;
  }

  const destination = new File(photosDirectory(), `${id}.jpg`);

  if (!(await downloadPhotoFile(links, id, (item) => item.url, destination))) {
    return false;
  }

  try {
    assertNotStopped(started);
    const { changes } = await database.runAsync(
      'UPDATE photos SET uri = ?, full_pending = 0 WHERE id = ? AND full_pending = 1',
      [destination.uri, id],
    );

    // Apagada enquanto baixava: a foto inteira sai junto.
    if (changes === 0) {
      removeFile(destination);
      return false;
    }
  } catch (error) {
    removeFile(destination);
    throw error;
  }

  if (row.uri !== destination.uri) {
    removeFile(new File(row.uri));
  }

  return true;
}

// Baixa as fotos da conta que não estão neste aparelho, página a página: primeiro as miniaturas (a galeria
// enche logo), depois as fotos inteiras, que tomam o lugar delas.
async function restorePhotos(database: SQLiteDatabase, token: string, consentAt: string, started: number) {
  const seen = new Set<string>();
  let after: string | undefined;

  setActivity('restoring');

  do {
    const links = await openPage(token, after);
    let saved = 0;

    for (const id of links.ids()) {
      seen.add(id);
      assertNotStopped(started);
      const photo = links.find(id);

      if (photo && !(await isLocal(database, id)) && (await saveThumbnail(database, links, photo, consentAt, started))) {
        saved += 1;
      }
    }

    if (saved > 0) {
      notify();
    }

    for (const id of links.ids()) {
      assertNotStopped(started);

      if (await saveFullPhoto(database, links, id, started)) {
        notify();
      }
    }

    after = links.nextCursor() ?? undefined;
  } while (after);

  // Miniatura sem a foto inteira na conta (apagada em outro aparelho, ou a conta foi esvaziada): fica a
  // miniatura, só neste aparelho.
  const partial = await database.getAllAsync<{ id: string }>('SELECT id FROM photos WHERE full_pending = 1');

  for (const { id } of partial) {
    if (!seen.has(id)) {
      await database.runAsync('UPDATE photos SET full_pending = 0, synced_epoch = NULL WHERE id = ?', [id]);
    }
  }
}

type SyncArgs = { consentAt: string; token: string; userId: string };

let running: Promise<void> | null = null;
// O pedido que chegou durante uma execução: roda no fim, com a conta e o consentimento mais recentes.
let queued: SyncArgs | null = null;
// A API publicada ainda sem as rotas das fotos (404): não insiste até o app abrir de novo.
let unavailable = false;
// Depois do limite de envios por hora (429): até quando esperar.
let pausedUntil = 0;

// Sobe as fotos da fila e, a cada consentimento novo (o primeiro, ou um dado de novo depois de retirado),
// reenvia o que não está na conta e baixa o que já estava nela. Sem consentimento, nada sai daqui. Uma
// execução por vez; um pedido no meio de outra roda no fim.
export function syncPhotos(userId: string, token: string, consentAt: string | null): Promise<void> {
  // Um pedido de uma conta que já saiu (e deixou a vez para outra) não lê o banco da que entrou.
  if (!consentAt || !canSync || unavailable || Date.now() < pausedUntil || getDatabaseUser() !== userId) {
    return Promise.resolve();
  }

  if (running) {
    queued = { consentAt, token, userId };
    return running;
  }

  const started = generation;

  running = (async () => {
    try {
      // O primeiro passo sempre espera: a rodada não pode terminar antes de `running` apontar para ela,
      // senão o `finally` limparia a vaga cedo demais e nenhuma rodada rodaria de novo.
      const database = await getDatabase();
      const state = await database.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM sync_state WHERE key IN (?, ?)',
        [EPOCH_KEY, REQUEUED_KEY],
      );
      const stateOf = (key: string) => state.find((item) => item.key === key)?.value;
      const isNewConsent = stateOf(EPOCH_KEY) !== consentAt;

      if (stateOf(REQUEUED_KEY) !== consentAt) {
        // Uma vez por consentimento, o que não está na conta com ele volta para a fila: um consentimento
        // retirado esvaziou a conta, e uma foto recusada ganha outra chance. O que já subiu com ele não
        // sobe de novo, porque cada envio é a foto inteira.
        const { changes } = await database.runAsync(
          `INSERT INTO outbox (entity, entity_id, operation, created_at)
           SELECT 'photo', id, 'update', ? FROM photos
           WHERE synced_epoch IS NOT ?
             AND id NOT IN (SELECT entity_id FROM outbox WHERE entity = 'photo')`,
          [Date.now(), consentAt],
        );
        await database.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
          REQUEUED_KEY,
          consentAt,
        ]);

        if (changes > 0) {
          notify();
        }
      }

      await pushPhotos(database, token, consentAt, started);

      // Só depois do envio: uma foto apagada aqui já saiu da conta e não volta no download. A que chegou
      // pela metade (só a miniatura) tenta a foto inteira de novo a cada rodada.
      if (isNewConsent || (await database.getFirstAsync('SELECT 1 FROM photos WHERE full_pending = 1 LIMIT 1'))) {
        await restorePhotos(database, token, consentAt, started);
      }

      if (isNewConsent) {
        await database.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [
          EPOCH_KEY,
          consentAt,
        ]);
      }
    } catch (error) {
      if (error instanceof PhotoSyncStopped) {
        return;
      }

      if (error instanceof ApiError) {
        // O servidor ainda não guarda fotos: a fila fica, e a próxima rodada pergunta de novo.
        if (error.code === 'FOTOS_NAO_CONFIGURADAS') {
          setServerWaiting(true);
          return;
        }

        // A API publicada ainda sem as rotas das fotos: o mesmo "ainda não dá", até o app abrir de novo.
        if (error.status === 404) {
          unavailable = true;
          setServerWaiting(true);
          return;
        }

        // O limite de envios por hora da API: as fotos esperam um pouco na fila.
        if (error.status === 429) {
          pausedUntil = Date.now() + RATE_LIMIT_PAUSE;
          return;
        }

        // Consentimento retirado em outro aparelho: a sessão, quando atualizar, para de chamar.
        if (error.code === 'CONSENT_REQUIRED') {
          return;
        }
      }

      throw error;
    } finally {
      running = null;
      setActivity('idle');

      if (queued) {
        const next = queued;
        queued = null;
        void syncPhotos(next.userId, next.token, next.consentAt).catch(() => {});
      }
    }
  })();

  return running;
}

// Para a sincronização das fotos e espera a rodada em andamento terminar. Usado ao apagar a conta, antes
// de apagar os arquivos (nenhuma foto chega ao aparelho depois da limpeza), e ao retirar o consentimento
// (nenhuma chega ao servidor depois de ele apagar tudo). A próxima rodada, se houver, começa do zero.
export async function stopPhotoSync() {
  generation += 1;
  queued = null;
  await running?.catch(() => undefined);
}

// Mantém as fotos em dia com a conta enquanto houver o consentimento das fotos. A chave muda com a conta e
// com cada consentimento novo, e cada mudança dispara uma rodada na hora.
export function usePhotoSync(userId?: string, token?: string, consentAt?: string | null) {
  useSyncTriggers(
    userId && token && consentAt ? `${token}:${consentAt}` : null,
    () => syncPhotos(userId as string, token as string, consentAt ?? null),
    'fotos',
  );
}
