import { getSession } from '@/src/services/auth';
import { storage, storageKeys } from '@/src/services/storage';
import type { OnboardingProfile } from '@/src/types/onboarding';

export async function saveOnboardingProfile(profile: OnboardingProfile) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const session = await getSession();

  if (session) {
    await storage.set(storageKeys.onboardingCompleted(session.user.id), 'true');
  }

  return {
    saved: true,
    profile,
  };
}

export async function hasCompletedOnboarding(userId: string) {
  return (await storage.get(storageKeys.onboardingCompleted(userId))) === 'true';
}
