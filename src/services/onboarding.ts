import type { OnboardingProfile } from '@/src/types/onboarding';

export async function saveOnboardingProfile(profile: OnboardingProfile) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    saved: true,
    profile,
  };
}
