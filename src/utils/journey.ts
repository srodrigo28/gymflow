import type { JourneyLevel, OnboardingProfile } from '@/src/types/onboarding';

export type { JourneyLevel };

// Fase da jornada, calculada das respostas do onboarding. Mostrada no fim do onboarding e na home.
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

// A fase sai da experiência de treino, que o questionário sempre pergunta. Quem só tem peso,
// altura ou objetivo salvos pelo Perfil (sem o questionário neste aparelho) fica sem fase.
export function hasJourneyAnswers(profile: OnboardingProfile | null): profile is OnboardingProfile {
  return Boolean(profile?.gymExperience);
}

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

// O objetivo escolhido na escala. Quem ainda não escolheu (respostas de antes de a meta ser salva)
// fica com o mesmo padrão da escala: Evolução, ou Performance para quem já está nela.
export function targetJourneyLevel(profile: OnboardingProfile): JourneyLevel {
  if (profile.targetLevel) {
    return profile.targetLevel;
  }

  return currentJourneyLevel(profile) === 'performance' ? 'performance' : 'evolution';
}

export function journeyLabel(level: JourneyLevel) {
  return journeyLevels.find((item) => item.value === level)?.label ?? '';
}
