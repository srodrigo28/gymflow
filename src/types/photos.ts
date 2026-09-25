import type { Pose } from '@/src/types/body';

// Foto de evolução guardada na conta (Fase 2, 22-estrategia.md seções 2.3 e 4). Só existe com o
// consentimento das fotos. O arquivo fica num armazenamento privado do servidor; o app recebe URLs
// assinadas que valem 10 minutos (`expiresAt`): depois disso, peça a lista de novo.
export type RemotePhoto = {
  expiresAt: string;
  height: number;
  id: string;
  // Mês de referência (AAAA-MM).
  month: string;
  note: string | null;
  pose: Pose;
  // Quando a foto foi tirada (ms).
  takenAt: number;
  // Miniatura de 320 px de largura: é o que as listas mostram primeiro.
  thumbUrl: string;
  // Quando a foto mudou no aparelho (ms). A versão mais nova vence.
  updatedAt: number;
  // A foto inteira, até 1600 px de largura, em JPEG e sem metadados (sem GPS).
  url: string;
  width: number;
};

export type RemotePhotoPage = { nextCursor: string | null; photos: RemotePhoto[] };

// O que o app manda junto com o arquivo (multipart).
export type PhotoUpload = {
  id: string;
  month: string;
  note: string | null;
  pose: Pose;
  takenAt: number;
  updatedAt: number;
  // O arquivo local (file://…), em JPEG.
  uri: string;
};
