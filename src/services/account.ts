import { deleteLocalDatabase } from '@/src/db/client';
import { apiRequest } from '@/src/services/api';
import { deleteAllPhotoFiles } from '@/src/services/body';
import { removeProfilePhoto } from '@/src/services/profile-photo';
import { secureStorage, storage, storageKeys } from '@/src/services/storage';
import type { AuthResponse } from '@/src/types/auth';

// Apaga a conta na API e, depois, tudo o que ela deixou neste aparelho: fotos, treinos e
// medidas (o banco local dela), foto de capa, respostas do onboarding e a sessão. Se a API recusar (senha
// errada, sem rede), nada daqui é tocado.
export async function deleteAccount(session: AuthResponse, password: string) {
  await apiRequest('/me', { body: { password }, method: 'DELETE', token: session.token });

  const userId = session.user.id;
  // As fotos saem antes do banco: é o banco que diz quais arquivos são dela.
  const steps: [string, () => Promise<unknown>][] = [
    ['as fotos', deleteAllPhotoFiles],
    ['o banco local', () => deleteLocalDatabase(userId)],
    ['a foto de capa', () => removeProfilePhoto(userId)],
    ['as respostas do onboarding', () => secureStorage.remove(storageKeys.profile(userId))],
    ['a marca de onboarding concluído', () => storage.remove(storageKeys.onboardingCompleted(userId))],
    ['a sessão', () => secureStorage.remove(storageKeys.session)],
  ];

  // A conta já não existe no servidor: cada limpeza segue mesmo que a anterior falhe.
  for (const [label, step] of steps) {
    try {
      await step();
    } catch (error) {
      if (__DEV__) {
        console.warn(`Não foi possível apagar ${label} do aparelho:`, error);
      }
    }
  }
}
