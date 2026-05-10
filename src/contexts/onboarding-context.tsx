import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import type { OnboardingProfile } from '@/src/types/onboarding';

type OnboardingContextValue = {
  profile: OnboardingProfile;
  resetProfile: () => void;
  updateProfile: (payload: Partial<OnboardingProfile>) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<OnboardingProfile>({});

  const value = useMemo(
    () => ({
      profile,
      resetProfile: () => setProfile({}),
      updateProfile: (payload: Partial<OnboardingProfile>) => {
        setProfile((current) => ({ ...current, ...payload }));
      },
    }),
    [profile],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider.');
  }

  return context;
}
