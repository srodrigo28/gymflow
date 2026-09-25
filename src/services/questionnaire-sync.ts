import { ApiError, apiRequest } from '@/src/services/api';
import { secureStorage, storage, storageKeys } from '@/src/services/storage';
import type { AuthResponse } from '@/src/types/auth';
import type { OnboardingProfile } from '@/src/types/onboarding';

// As respostas do questionário têm dados de saúde (sono, humor, fumo), então não sobem com os
// treinos: só com o consentimento próprio, guardado na sessão. Este módulo não importa o serviço
// de onboarding (que o chama) para não criar um ciclo; ele lê e grava direto no armazenamento.

type RemoteQuestionnaire = { answers: Record<string, unknown> | null; updatedAt: string | null };

const listeners = new Set<() => void>();

// Avisado quando respostas chegam da conta num aparelho novo: a home recarrega o resumo.
export function onQuestionnaireRestored(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// Sobe o questionário inteiro. Sem rede, falha em silêncio: a próxima abertura do app tenta de novo,
// porque a versão enviada por último fica guardada e é comparada com a local.
export async function uploadQuestionnaire(session: AuthResponse, profile: OnboardingProfile) {
  if (!session.user.questionnaireConsentAt) {
    return;
  }

  try {
    await apiRequest('/me/questionnaire', { body: { answers: profile }, method: 'PUT', token: session.token });
    await storage.set(storageKeys.questionnaireUploaded(session.user.id), JSON.stringify(profile));
  } catch {
    // Fica para a próxima rodada.
  }
}

// Ao abrir com consentimento: respostas locais que ainda não subiram sobem; sem respostas locais,
// as da conta descem e o onboarding fica marcado como feito, como num aparelho novo.
export async function syncQuestionnaire(session: AuthResponse) {
  if (!session.user.questionnaireConsentAt) {
    return;
  }

  const userId = session.user.id;
  const local = await secureStorage.get(storageKeys.profile(userId));

  if (local) {
    const uploaded = await storage.get(storageKeys.questionnaireUploaded(userId));

    if (uploaded !== local) {
      try {
        await uploadQuestionnaire(session, JSON.parse(local) as OnboardingProfile);
      } catch {
        // Respostas locais ilegíveis: nada a subir.
      }
    }

    return;
  }

  try {
    const remote = await apiRequest<RemoteQuestionnaire>('/me/questionnaire', { token: session.token });

    if (!remote.answers) {
      return;
    }

    const serialized = JSON.stringify(remote.answers);
    await secureStorage.set(storageKeys.profile(userId), serialized);
    await storage.set(storageKeys.onboardingCompleted(userId), 'true');
    await storage.set(storageKeys.questionnaireUploaded(userId), serialized);

    for (const listener of listeners) {
      listener();
    }
  } catch (error) {
    // API publicada ainda sem a rota (404) ou consentimento retirado em outro aparelho: silêncio.
    if (error instanceof ApiError && (error.status === 404 || error.code === 'CONSENT_REQUIRED')) {
      return;
    }

    throw error;
  }
}
