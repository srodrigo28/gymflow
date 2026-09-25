import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { MealFeeling, MealType } from '@/src/types/nutrition';

type MealTypeSpec = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: MealType;
};

// Na ordem do dia: é assim que as refeições aparecem no diário, independentemente de quando
// foram anotadas.
export const mealTypes: MealTypeSpec[] = [
  { icon: 'coffee-outline', label: 'Café da manhã', value: 'cafe' },
  { icon: 'food-apple-outline', label: 'Lanche da manhã', value: 'lanche_manha' },
  { icon: 'silverware-fork-knife', label: 'Almoço', value: 'almoco' },
  { icon: 'cookie-outline', label: 'Lanche da tarde', value: 'lanche_tarde' },
  { icon: 'bowl-mix-outline', label: 'Jantar', value: 'jantar' },
  { icon: 'weather-night', label: 'Ceia', value: 'ceia' },
];

export const mealFeelings: { label: string; value: MealFeeling }[] = [
  { label: 'Leve', value: 'leve' },
  { label: 'Satisfeito', value: 'satisfeito' },
  { label: 'Pesado', value: 'pesado' },
];

export function mealTypeLabel(type: MealType) {
  return mealTypes.find((item) => item.value === type)?.label ?? type;
}

export function mealFeelingLabel(feeling: MealFeeling) {
  return mealFeelings.find((item) => item.value === feeling)?.label ?? feeling;
}
