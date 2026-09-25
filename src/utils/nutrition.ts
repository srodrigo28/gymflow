import type { EatingStyleSuggestion, MealType } from '@/src/types/nutrition';
import type { OnboardingProfile } from '@/src/types/onboarding';
import { journeyLabel, targetJourneyLevel } from '@/src/utils/journey';

const startingPoint: EatingStyleSuggestion = {
  id: 'equilibrada',
  reason: 'Um ponto de partida que cabe em qualquer rotina.',
};

/**
 * Estilo em destaque a partir do questionário. Quem disse que não quer dicas de alimentação não
 * recebe destaque nenhum, mesmo que outra resposta apontasse um: a lista continua lá para quando
 * quiser olhar. Sem questionário neste aparelho, vale o ponto de partida.
 */
export function suggestEatingStyle(profile: OnboardingProfile | null): EatingStyleSuggestion | null {
  if (!profile) {
    return startingPoint;
  }

  if (profile.wantsNutritionTips === 'no') {
    return null;
  }

  if (profile.drinksSoda === 'yes' && (profile.sodaFrequency === 'weekly_3_5' || profile.sodaFrequency === 'daily')) {
    return {
      id: 'menos_acucar',
      reason:
        profile.sodaFrequency === 'daily'
          ? 'Porque você contou que toma refrigerante todos os dias.'
          : 'Porque você contou que toma refrigerante 3 vezes por semana ou mais.',
    };
  }

  // A meta é a mesma que o Perfil mostra: a escolhida na escala ou, sem escolha, o padrão dela.
  const target = targetJourneyLevel(profile);

  if (target === 'performance' || target === 'evolution') {
    return { id: 'mais_proteina', reason: `Porque sua meta é ${journeyLabel(target)}.` };
  }

  return startingPoint;
}

/** Frase curta do questionário para o topo do diário. Sem cobrança: só lembra o que a pessoa contou. */
export function foodMonitoringSummary(profile: OnboardingProfile | null) {
  switch (profile?.monitorsFood) {
    case 'yes':
      return 'Você disse que acompanha a alimentação com frequência. O diário guarda isso num lugar só.';
    case 'sometimes':
      return 'Você disse que acompanha a alimentação às vezes. Registrar só o que der já vale.';
    case 'no':
      return 'Você disse que não acompanha a alimentação. Um registro por dia, quando lembrar, já conta.';
    default:
      return null;
  }
}

/** Tipo pré-selecionado pela hora: quem abre o diário ao meio-dia quase sempre vai anotar o almoço. */
export function defaultMealType(hour = new Date().getHours()): MealType {
  if (hour < 4) return 'ceia';
  if (hour < 10) return 'cafe';
  if (hour < 11) return 'lanche_manha';
  if (hour < 14) return 'almoco';
  if (hour < 18) return 'lanche_tarde';
  if (hour < 21) return 'jantar';

  return 'ceia';
}
