import type { OnboardingProfile } from '@/src/types/onboarding';

// Fase da jornada, calculada das respostas do onboarding. Mostrada no fim do onboarding e na home.
export type JourneyLevel = 'start' | 'consistency' | 'evolution' | 'performance';

export const journeyLevels: {
  description: string;
  label: string;
  value: JourneyLevel;
}[] = [
  {
    description: 'Começar com segurança',
    label: 'Início',
    value: 'start',
  },
  {
    description: 'Manter rotina',
    label: 'Constância',
    value: 'consistency',
  },
  {
    description: 'Evoluir medidas e força',
    label: 'Evolução',
    value: 'evolution',
  },
  {
    description: 'Treinar com alta exigência',
    label: 'Performance',
    value: 'performance',
  },
];

export function currentJourneyLevel(profile: OnboardingProfile): JourneyLevel {
  if (profile.trainsProfessionally === 'yes' || profile.gymExperience === 'currently_training') {
    return 'performance';
  }

  if (profile.gymExperience === 'more_than_1_year' || profile.gymExperience === 'few_months') {
    return 'evolution';
  }

  if (profile.gymExperience === 'short_time' || (profile.trainingDaysPerWeek && profile.trainingDaysPerWeek >= 4)) {
    return 'consistency';
  }

  return 'start';
}

export function journeyLabel(level: JourneyLevel) {
  return journeyLevels.find((item) => item.value === level)?.label ?? '';
}
