import { z } from 'zod';

const requiredMessage = 'Escolha uma opcao para continuar.';

export const baseOnboardingSchema = z.object({
  sex: z.enum(['male', 'female', 'prefer_not_to_say'], { message: requiredMessage }),
  workRoutine: z.enum(
    ['mostly_sitting', 'mostly_standing', 'moderate_physical', 'intense_physical', 'varies'],
    { message: requiredMessage },
  ),
  profession: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= 2, 'Informe pelo menos 2 caracteres.'),
  trainingDaysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)], {
    message: requiredMessage,
  }),
  trainingDuration: z.enum(['up_to_30', '30_to_45', '45_to_60', 'over_60'], {
    message: requiredMessage,
  }),
  preferredTrainingPeriod: z.enum(['morning', 'afternoon', 'night', 'varies'], {
    message: requiredMessage,
  }),
  weightKg: z
    .number({ message: 'Informe seu peso.' })
    .min(30, 'Peso minimo: 30 kg.')
    .max(300, 'Peso maximo: 300 kg.'),
  heightCm: z
    .number({ message: 'Informe sua altura.' })
    .min(100, 'Altura minima: 100 cm.')
    .max(250, 'Altura maxima: 250 cm.'),
  sleepHours: z.enum(['less_than_5', '5_to_6', '7_to_8', 'more_than_8', 'varies'], {
    message: requiredMessage,
  }),
  wakesUpRested: z.enum(['yes', 'sometimes', 'no'], { message: requiredMessage }),
  gymExperience: z.enum(['never', 'short_time', 'few_months', 'more_than_1_year', 'currently_training'], {
    message: requiredMessage,
  }),
  previousTrainingTime: z
    .enum(['less_than_3_months', '3_to_6_months', '6_to_12_months', '1_to_2_years', 'more_than_2_years'])
    .optional(),
  wantsNutritionTips: z.enum(['yes', 'moderate', 'no'], { message: requiredMessage }),
  wantsDailyAdvice: z.enum(['yes', 'moderate', 'no'], { message: requiredMessage }),
  wantsMealPhotoDiary: z.enum(['yes', 'maybe_later', 'no'], { message: requiredMessage }),
  wantsProgressPhotos: z.enum(['yes', 'maybe_later', 'no'], { message: requiredMessage }),
  smokes: z.enum(['yes', 'no', 'stopped'], { message: requiredMessage }),
  beerConsumption: z.enum(['no', 'rarely', 'weekly_1_2', 'weekly_3_plus'], {
    message: requiredMessage,
  }),
  drinksSoda: z.enum(['yes', 'no'], { message: requiredMessage }),
  sodaFrequency: z.enum(['rarely', 'weekly_1_2', 'weekly_3_5', 'daily']).optional(),
  sodaAmount: z.enum(['up_to_200', '200_to_350', '350_to_600', 'over_600']).optional(),
  monitorsFood: z.enum(['yes', 'sometimes', 'no'], { message: requiredMessage }),
  relationshipStatus: z.enum(['single', 'married', 'serious_relationship', 'other'], {
    message: requiredMessage,
  }),
  hasRelationshipDifficulty: z.enum(['no', 'sometimes', 'often'], { message: requiredMessage }),
  moodPattern: z.enum(['stable', 'motivated', 'anxious', 'irritated', 'discouraged', 'varies'], {
    message: requiredMessage,
  }),
  trainsProfessionally: z.enum(['yes', 'moderate', 'no'], { message: requiredMessage }),
  professionalTrainingPurpose: z
    .enum(['competition', 'bodybuilding', 'professional_performance', 'physical_test', 'other'])
    .optional(),
});

export const onboardingSchema = baseOnboardingSchema.superRefine((data, ctx) => {
    if (data.gymExperience !== 'never' && !data.previousTrainingTime) {
      ctx.addIssue({
        code: 'custom',
        message: requiredMessage,
        path: ['previousTrainingTime'],
      });
    }

    if (data.drinksSoda === 'yes' && !data.sodaFrequency) {
      ctx.addIssue({
        code: 'custom',
        message: requiredMessage,
        path: ['sodaFrequency'],
      });
    }

    if (data.drinksSoda === 'yes' && !data.sodaAmount) {
      ctx.addIssue({
        code: 'custom',
        message: requiredMessage,
        path: ['sodaAmount'],
      });
    }

    if (data.trainsProfessionally === 'yes' && !data.professionalTrainingPurpose) {
      ctx.addIssue({
        code: 'custom',
        message: requiredMessage,
        path: ['professionalTrainingPurpose'],
      });
    }
  });

export const bodyMetricsSchema = baseOnboardingSchema.pick({
  weightKg: true,
  heightCm: true,
});
