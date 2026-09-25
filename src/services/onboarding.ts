import { getSession } from '@/src/services/auth';
import { uploadQuestionnaire } from '@/src/services/questionnaire-sync';
import { secureStorage, storage, storageKeys } from '@/src/services/storage';
import type { OnboardingProfile } from '@/src/types/onboarding';

// As respostas ficam no aparelho e só sobem para a conta com o consentimento próprio, dado no
// Perfil (têm dados de saúde: sono, humor, fumo).
export async function saveOnboardingProfile(profile: OnboardingProfile) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const session = await getSession();

  if (session) {
    await secureStorage.set(storageKeys.profile(session.user.id), JSON.stringify(profile));
    await storage.set(storageKeys.onboardingCompleted(session.user.id), 'true');
    void uploadQuestionnaire(session, profile);
  }

  return {
    saved: true,
    profile,
  };
}

export async function getOnboardingProfile(userId: string): Promise<OnboardingProfile | null> {
  const stored = await secureStorage.get(storageKeys.profile(userId));

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as OnboardingProfile;
  } catch {
    return null;
  }
}

// Troca só alguns campos (o Perfil edita peso, altura e objetivo) e mantém as outras respostas.
export async function updateOnboardingProfile(userId: string, changes: Partial<OnboardingProfile>) {
  const profile = { ...(await getOnboardingProfile(userId)), ...changes };
  await secureStorage.set(storageKeys.profile(userId), JSON.stringify(profile));

  const session = await getSession();

  if (session && session.user.id === userId) {
    void uploadQuestionnaire(session, profile);
  }

  return profile;
}

export async function hasCompletedOnboarding(userId: string) {
  return (await storage.get(storageKeys.onboardingCompleted(userId))) === 'true';
}
