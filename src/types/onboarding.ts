export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

export type WorkRoutine =
  | 'mostly_sitting'
  | 'mostly_standing'
  | 'moderate_physical'
  | 'intense_physical'
  | 'varies';

export type TrainingDaysPerWeek = 2 | 3 | 4 | 5 | 6;

export type TrainingDuration = 'up_to_30' | '30_to_45' | '45_to_60' | 'over_60';

export type DayPeriod = 'morning' | 'afternoon' | 'night' | 'varies';

export type SleepHours = 'less_than_5' | '5_to_6' | '7_to_8' | 'more_than_8' | 'varies';

export type RestedWakeUp = 'yes' | 'sometimes' | 'no';

export type GymExperience =
  | 'never'
  | 'short_time'
  | 'few_months'
  | 'more_than_1_year'
  | 'currently_training';

export type PreviousTrainingTime =
  | 'less_than_3_months'
  | '3_to_6_months'
  | '6_to_12_months'
  | '1_to_2_years'
  | 'more_than_2_years';

export type InterestLevel = 'yes' | 'moderate' | 'no';

export type OptionalConsent = 'yes' | 'maybe_later' | 'no';

export type HabitFrequency = 'no' | 'rarely' | 'weekly_1_2' | 'weekly_3_plus';

export type SodaFrequency = 'rarely' | 'weekly_1_2' | 'weekly_3_5' | 'daily';

export type SodaAmount = 'up_to_200' | '200_to_350' | '350_to_600' | 'over_600';

export type FoodMonitoring = 'yes' | 'sometimes' | 'no';

export type RelationshipStatus = 'single' | 'married' | 'serious_relationship' | 'other';

export type SocialDifficulty = 'no' | 'sometimes' | 'often';

export type MoodPattern = 'stable' | 'motivated' | 'anxious' | 'irritated' | 'discouraged' | 'varies';

export type SmokingStatus = 'yes' | 'no' | 'stopped';

export type BinaryAnswer = 'yes' | 'no';

export type ProfessionalTrainingPurpose =
  | 'competition'
  | 'bodybuilding'
  | 'professional_performance'
  | 'physical_test'
  | 'other';

export type OnboardingProfile = {
  sex?: BiologicalSex;
  workRoutine?: WorkRoutine;
  profession?: string;
  trainingDaysPerWeek?: TrainingDaysPerWeek;
  trainingDuration?: TrainingDuration;
  preferredTrainingPeriod?: DayPeriod;
  weightKg?: number;
  heightCm?: number;
  sleepHours?: SleepHours;
  wakesUpRested?: RestedWakeUp;
  gymExperience?: GymExperience;
  previousTrainingTime?: PreviousTrainingTime;
  wantsNutritionTips?: InterestLevel;
  wantsDailyAdvice?: InterestLevel;
  wantsMealPhotoDiary?: OptionalConsent;
  wantsProgressPhotos?: OptionalConsent;
  smokes?: SmokingStatus;
  beerConsumption?: HabitFrequency;
  drinksSoda?: BinaryAnswer;
  sodaFrequency?: SodaFrequency;
  sodaAmount?: SodaAmount;
  monitorsFood?: FoodMonitoring;
  relationshipStatus?: RelationshipStatus;
  hasRelationshipDifficulty?: SocialDifficulty;
  moodPattern?: MoodPattern;
  trainsProfessionally?: InterestLevel;
  professionalTrainingPurpose?: ProfessionalTrainingPurpose;
};
