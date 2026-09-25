import { deleteLocalDatabase } from '@/src/db/client';
import { apiRequest } from '@/src/services/api';
import { deleteAllPhotoFiles } from '@/src/services/body';
import { clearDailyLog } from '@/src/services/daily-log';
import { clearGymCheckins } from '@/src/services/gym-checkin';
import { clearNutritionData } from '@/src/services/nutrition';
import { stopPhotoSync } from '@/src/services/photo-sync';
import { removePersonalPhrase } from '@/src/services/phrases';
import { removeProfilePhoto } from '@/src/services/profile-photo';
import { secureStorage, storage, storageKeys } from '@/src/services/storage';
import { clearTrainingPreferences } from '@/src/services/training-preferences';
import type { AuthResponse } from '@/src/types/auth';

// Apaga a conta na API e, depois, tudo o que ela deixou neste aparelho: fotos, treinos, medidas e a
// fila do que ainda ia subir (o banco local dela), foto de capa, respostas do onboarding, diários e a
// sessão. Se a API recusar (senha errada, sem rede), nada daqui é tocado.
export async function deleteAccount(session: AuthResponse, password: string) {
  await apiRequest('/me', { body: { password }, method: 'DELETE', token: session.token });

  const userId = session.user.id;
  // As fotos saem antes do banco: é o banco que diz quais arquivos são dela. Antes delas, a
  // sincronização das fotos é interrompida: nenhum download chega depois da limpeza.
  const steps: [string, () => Promise<unknown>][] = [
    ['a sincronização das fotos', stopPhotoSync],
    ['as fotos', deleteAllPhotoFiles],
    ['o banco local', () => deleteLocalDatabase(userId)],
    ['a foto de capa', () => removeProfilePhoto(userId)],
    ['a frase pessoal', () => removePersonalPhrase(userId)],
    ['as respostas do onboarding', () => secureStorage.remove(storageKeys.profile(userId))],
    ['a marca de onboarding concluído', () => storage.remove(storageKeys.onboardingCompleted(userId))],
    ['a marca das respostas enviadas', () => storage.remove(storageKeys.questionnaireUploaded(userId))],
    ['as escolhas de treino', () => clearTrainingPreferences(userId)],
    ['a cópia das prescrições do personal', () => storage.remove(storageKeys.coachingPlans(userId))],
    ['a cópia do plano da IA', () => storage.remove(storageKeys.aiWeeklyPlan(userId))],
    ['a academia e os check-ins', () => clearGymCheckins(userId)],
    ['o diário do dia', () => clearDailyLog(userId)],
    ['o diário alimentar', () => clearNutritionData(userId)],
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
