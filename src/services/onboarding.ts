import { getSession } from '@/src/services/auth';
import { secureStorage, storage, storageKeys } from '@/src/services/storage';
import type { OnboardingProfile } from '@/src/types/onboarding';

// As respostas ficam só no aparelho, como medidas e fotos: não sobem para a API.
export async function saveOnboardingProfile(profile: OnboardingProfile) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const session = await getSession();

  if (session) {
    await secureStorage.set(storageKeys.profile(session.user.id), JSON.stringify(profile));
    await storage.set(storageKeys.onboardingCompleted(session.user.id), 'true');
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

export async function hasCompletedOnboarding(userId: string) {
  return (await storage.get(storageKeys.onboardingCompleted(userId))) === 'true';
}
