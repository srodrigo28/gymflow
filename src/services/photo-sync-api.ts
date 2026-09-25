import { apiRequest, apiUpload, formFile } from '@/src/services/api';
import type { PhotoUpload, RemotePhoto, RemotePhotoPage } from '@/src/types/photos';

// As chamadas das fotos de evolução na conta. Precisam do consentimento das fotos
// (setBodyPhotoConsent, em services/auth.ts): sem ele, a API responde 403 CONSENT_REQUIRED. Com o
// servidor ainda sem armazenamento de fotos configurado, responde 503 FOTOS_NAO_CONFIGURADAS: as fotos
// continuam no aparelho e a fila tenta de novo mais tarde.

/** Sobe uma foto (JPEG) com o mês, a pose e as datas. O servidor refaz a imagem e tira os metadados. */
export async function uploadPhoto(token: string, photo: PhotoUpload) {
  const form = new FormData();
  form.append('id', photo.id);
  form.append('month', photo.month);
  form.append('pose', photo.pose);
  form.append('takenAt', String(photo.takenAt));
  form.append('updatedAt', String(photo.updatedAt));

  if (photo.note) {
    form.append('note', photo.note);
  }

  form.append('photo', formFile(photo.uri, `${photo.id}.jpg`));
  const { photo: saved } = await apiUpload<{ photo: RemotePhoto }>('/sync/photos', form, { token });

  return saved;
}

/** Uma página das fotos da conta, em ordem de id, com URLs assinadas de 10 minutos. */
export function listRemotePhotos(token: string, after?: string, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit) });

  if (after) {
    query.set('after', after);
  }

  return apiRequest<RemotePhotoPage>(`/sync/photos?${query.toString()}`, { token });
}

/** Apaga a foto da conta (o arquivo sai do servidor na hora). */
export async function deleteRemotePhoto(token: string, id: string) {
  await apiRequest(`/sync/photos/${encodeURIComponent(id)}`, { method: 'DELETE', token });
}
