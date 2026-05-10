import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingFooter } from '@/src/components/onboarding/OnboardingFooter';
import { OnboardingLayout } from '@/src/components/onboarding/OnboardingLayout';
import { OnboardingOption } from '@/src/components/onboarding/OnboardingOption';
import { Input } from '@/src/components/ui/Input';
import { OnboardingProvider, useOnboarding } from '@/src/contexts/onboarding-context';
import { bodyMetricsSchema, onboardingSchema } from '@/src/schemas/onboarding';
import { saveOnboardingProfile } from '@/src/services/onboarding';
import { colors } from '@/src/constants/colors';
import { spacing } from '@/src/constants/spacing';
import type { OnboardingProfile } from '@/src/types/onboarding';

const previousTrainingStepIndex = 18;
const sodaFrequencyStepIndex = 14;
const sodaAmountStepIndex = 15;
const professionalPurposeStepIndex = 20;

export default function OnboardingScreen() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}

function OnboardingFlow() {
  const { profile, resetProfile, updateProfile } = useOnboarding();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const visibleStepIndexes = useMemo(() => getVisibleStepIndexes(profile), [profile]);
  const currentStepPosition = Math.max(visibleStepIndexes.indexOf(step), 0);
  const currentStepNumber = currentStepPosition + 1;
  const totalSteps = visibleStepIndexes.length;
  const canContinue = useMemo(() => isStepValid(step, profile), [profile, step]);

  useEffect(() => {
    if (!visibleStepIndexes.includes(step)) {
      setStep(visibleStepIndexes[Math.max(currentStepPosition - 1, 0)] ?? 0);
    }
  }, [currentStepPosition, step, visibleStepIndexes]);

  function goBack() {
    setStep(visibleStepIndexes[Math.max(currentStepPosition - 1, 0)] ?? 0);
  }

  async function goNext() {
    if (!canContinue) {
      return;
    }

    if (currentStepNumber < totalSteps) {
      setStep(visibleStepIndexes[currentStepPosition + 1]);
      return;
    }

    const result = onboardingSchema.safeParse(profile);

    if (!result.success) {
      return;
    }

    setIsSaving(true);
    await saveOnboardingProfile(result.data);
    resetProfile();
    router.replace('/(app)/home');
  }

  return (
    <>
      <OnboardingLayout
        currentStep={currentStepNumber}
        description={steps[step].description}
        footer={
          <OnboardingFooter
            canGoBack={currentStepPosition > 0}
            canGoNext={canContinue}
            loading={isSaving}
            nextLabel={currentStepNumber === totalSteps ? 'Finalizar' : step === 0 ? 'Começar' : 'Continuar'}
            onBack={goBack}
            onNext={goNext}
          />
        }
        illustration={steps[step].illustration}
        title={steps[step].title}
        totalSteps={totalSteps}>
        {step === 0 ? <WelcomeStep /> : null}
        {step === 1 ? <SexStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 2 ? <WorkStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 3 ? <RelationshipStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 4 ? <SocialStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 5 ? <MoodStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 6 ? <TrainingRoutineStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 7 ? <TrainingPeriodStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 8 ? <MetricsStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 9 ? <SleepHoursStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 10 ? <RestStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 11 ? <SmokingStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 12 ? <BeerStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 13 ? <SodaStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 14 ? <SodaFrequencyStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 15 ? <SodaAmountStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 16 ? <FoodMonitoringStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 17 ? <HistoryStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 18 ? <PreviousTrainingStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 19 ? <ProfessionalTrainingStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 20 ? <ProfessionalPurposeStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 21 ? <NutritionTipsStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 22 ? <DailyAdviceStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 23 ? <MealPhotosStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 24 ? <ProgressPhotosStep profile={profile} updateProfile={updateProfile} /> : null}
        {step === 25 ? <SummaryStep profile={profile} /> : null}
      </OnboardingLayout>
    </>
  );
}

const steps = [
  {
    description: 'Algumas respostas rápidas para personalizar treinos, rotina e recomendações.',
    illustration: 'welcome',
    title: 'Vamos ajustar sua jornada',
  },
  {
    description: 'Essa informação ajuda nas métricas e na personalização inicial.',
    illustration: 'sex',
    title: 'Como você prefere informar seu perfil?',
  },
  {
    description: 'Sua rotina muda bastante o tipo de treino que faz sentido para você.',
    illustration: 'work',
    title: 'Como é seu trabalho no dia a dia?',
  },
  {
    description: 'Relacionamento e rotina social também influenciam consistência, energia e tempo disponível.',
    illustration: 'work',
    title: 'Como está sua vida afetiva hoje?',
  },
  {
    description: 'Essa resposta ajuda a ajustar metas e comunicação sem criar pressão desnecessária.',
    illustration: 'work',
    title: 'Você sente dificuldade em se relacionar?',
  },
  {
    description: 'Humor e energia emocional mudam o jeito ideal de manter uma rotina de treino.',
    illustration: 'sleep',
    title: 'Como anda seu humor?',
  },
  {
    description: 'Vamos montar uma rotina realista, daquelas que cabem na vida de verdade.',
    illustration: 'training',
    title: 'Qual rotina de treinos você quer seguir?',
  },
  {
    description: 'Escolher um período ajuda a encaixar o treino na sua rotina.',
    illustration: 'training',
    title: 'Qual período combina melhor com você?',
  },
  {
    description: 'Esses dados ajudam a acompanhar evolução e ajustar metas futuras.',
    illustration: 'metrics',
    title: 'Peso e altura atuais',
  },
  {
    description: 'Sono e recuperação contam muito. Músculo também gosta de travesseiro.',
    illustration: 'sleep',
    title: 'Como anda seu sono?',
  },
  {
    description: 'Acordar bem ajuda a entender recuperação, energia e ritmo de treino.',
    illustration: 'sleep',
    title: 'Você costuma acordar descansado?',
  },
  {
    description: 'Alguns hábitos pesam bastante na recuperação e no progresso ao longo das semanas.',
    illustration: 'nutrition',
    title: 'Você fuma atualmente?',
  },
  {
    description: 'Essa informação ajuda a calibrar metas e recomendações sem julgamento.',
    illustration: 'nutrition',
    title: 'Você consome cerveja ou bebida alcoólica?',
  },
  {
    description: 'Vamos entender bebidas do dia a dia sem exagerar nas perguntas.',
    illustration: 'nutrition',
    title: 'Você costuma beber refrigerante?',
  },
  {
    description: 'Só aparece para quem informou que bebe refrigerante.',
    illustration: 'nutrition',
    title: 'Com que frequência você bebe refrigerante?',
  },
  {
    description: 'Essa medida ajuda a estimar melhor o consumo, mesmo que seja aproximado.',
    illustration: 'nutrition',
    title: 'Quanto refrigerante você toma por vez?',
  },
  {
    description: 'Monitorar ou não monitorar alimentação muda o tipo de dica que faz sentido.',
    illustration: 'nutrition',
    title: 'Você acompanha sua alimentação?',
  },
  {
    description: 'Assim evitamos jogar você no modo chefão logo no primeiro treino.',
    illustration: 'history',
    title: 'Você já treinou antes?',
  },
  {
    description: 'Isso ajuda a ajustar progressão, carga e nível de explicação.',
    illustration: 'history',
    title: 'Por quanto tempo você treinou?',
  },
  {
    description: 'Treino profissional pede outra intensidade de planejamento e acompanhamento.',
    illustration: 'training',
    title: 'Você treina com finalidade profissional?',
  },
  {
    description: 'A finalidade ajuda a definir prioridade, volume e tipo de evolução.',
    illustration: 'training',
    title: 'Qual é o foco profissional do treino?',
  },
  {
    description: 'Sem terrorismo alimentar. A ideia é dar dicas simples e úteis.',
    illustration: 'nutrition',
    title: 'Você quer dicas de alimentação?',
  },
  {
    description: 'Pequenos lembretes podem ajudar a manter consistência sem pressão.',
    illustration: 'nutrition',
    title: 'Você quer conselhos diários?',
  },
  {
    description: 'Fotos são opcionais e servem para acompanhar hábitos e evolução.',
    illustration: 'photos',
    title: 'Quer registrar fotos das refeições?',
  },
  {
    description: 'As fotos de evolução ajudam a enxergar progresso além da balança.',
    illustration: 'photos',
    title: 'Quer registrar fotos de evolução?',
  },
  {
    description: 'Confira suas respostas antes de finalizar a configuração.',
    illustration: 'summary',
    title: 'Resumo da sua jornada',
  },
] as const;

type StepProps = {
  profile: OnboardingProfile;
  updateProfile: (payload: Partial<OnboardingProfile>) => void;
};

function WelcomeStep() {
  return <Text style={styles.note}>Prometemos perguntas objetivas. Nada de entrevista de emprego com halter na mão.</Text>;
}

function SexStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="male-female-outline" label="Masculino" selected={profile.sex === 'male'} onPress={() => updateProfile({ sex: 'male' })} />
      <OnboardingOption icon="female-outline" label="Feminino" selected={profile.sex === 'female'} onPress={() => updateProfile({ sex: 'female' })} />
      <OnboardingOption icon="shield-outline" label="Prefiro não informar" selected={profile.sex === 'prefer_not_to_say'} onPress={() => updateProfile({ sex: 'prefer_not_to_say' })} />
    </>
  );
}

function WorkStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="desktop-outline" label="Passo a maior parte do dia sentado" selected={profile.workRoutine === 'mostly_sitting'} onPress={() => updateProfile({ workRoutine: 'mostly_sitting' })} />
      <OnboardingOption icon="walk-outline" label="Fico bastante tempo em pé" selected={profile.workRoutine === 'mostly_standing'} onPress={() => updateProfile({ workRoutine: 'mostly_standing' })} />
      <OnboardingOption icon="construct-outline" label="Tenho trabalho físico moderado" selected={profile.workRoutine === 'moderate_physical'} onPress={() => updateProfile({ workRoutine: 'moderate_physical' })} />
      <OnboardingOption icon="barbell-outline" label="Tenho trabalho físico intenso" selected={profile.workRoutine === 'intense_physical'} onPress={() => updateProfile({ workRoutine: 'intense_physical' })} />
      <OnboardingOption icon="shuffle-outline" label="Minha rotina varia muito" selected={profile.workRoutine === 'varies'} onPress={() => updateProfile({ workRoutine: 'varies' })} />
      <Input icon="briefcase-outline" label="Profissão ou área" placeholder="Ex: desenvolvedor, motorista, professora..." value={profile.profession ?? ''} onChangeText={(profession) => updateProfile({ profession })} />
    </>
  );
}

function RelationshipStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="person-outline" label="Solteiro(a)" selected={profile.relationshipStatus === 'single'} onPress={() => updateProfile({ relationshipStatus: 'single' })} />
      <OnboardingOption icon="heart-outline" label="Em relacionamento sério" selected={profile.relationshipStatus === 'serious_relationship'} onPress={() => updateProfile({ relationshipStatus: 'serious_relationship' })} />
      <OnboardingOption icon="people-outline" label="Casado(a)" selected={profile.relationshipStatus === 'married'} onPress={() => updateProfile({ relationshipStatus: 'married' })} />
      <OnboardingOption icon="ellipsis-horizontal-outline" label="Outro" selected={profile.relationshipStatus === 'other'} onPress={() => updateProfile({ relationshipStatus: 'other' })} />
    </>
  );
}

function SocialStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="happy-outline" label="Não tenho dificuldade" selected={profile.hasRelationshipDifficulty === 'no'} onPress={() => updateProfile({ hasRelationshipDifficulty: 'no' })} />
      <OnboardingOption icon="ellipse-outline" label="Às vezes sinto dificuldade" selected={profile.hasRelationshipDifficulty === 'sometimes'} onPress={() => updateProfile({ hasRelationshipDifficulty: 'sometimes' })} />
      <OnboardingOption icon="chatbubble-ellipses-outline" label="Tenho dificuldade com frequência" selected={profile.hasRelationshipDifficulty === 'often'} onPress={() => updateProfile({ hasRelationshipDifficulty: 'often' })} />
    </>
  );
}

function MoodStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="checkmark-circle-outline" label="Estável" selected={profile.moodPattern === 'stable'} onPress={() => updateProfile({ moodPattern: 'stable' })} />
      <OnboardingOption icon="flash-outline" label="Animado(a)" selected={profile.moodPattern === 'motivated'} onPress={() => updateProfile({ moodPattern: 'motivated' })} />
      <OnboardingOption icon="pulse-outline" label="Ansioso(a)" selected={profile.moodPattern === 'anxious'} onPress={() => updateProfile({ moodPattern: 'anxious' })} />
      <OnboardingOption icon="thunderstorm-outline" label="Irritado(a)" selected={profile.moodPattern === 'irritated'} onPress={() => updateProfile({ moodPattern: 'irritated' })} />
      <OnboardingOption icon="sad-outline" label="Desanimado(a)" selected={profile.moodPattern === 'discouraged'} onPress={() => updateProfile({ moodPattern: 'discouraged' })} />
      <OnboardingOption icon="shuffle-outline" label="Oscila bastante" selected={profile.moodPattern === 'varies'} onPress={() => updateProfile({ moodPattern: 'varies' })} />
    </>
  );
}

function TrainingRoutineStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <QuestionSection title="Pergunta 1: quantos dias por semana?">
        <View style={styles.inlineGrid}>
          {[2, 3, 4, 5, 6].map((days) => (
            <OnboardingOption
              key={days}
              label={`${days}x`}
              selected={profile.trainingDaysPerWeek === days}
              onPress={() => updateProfile({ trainingDaysPerWeek: days as OnboardingProfile['trainingDaysPerWeek'] })}
            />
          ))}
        </View>
      </QuestionSection>
      <QuestionSection title="Pergunta 2: quanto tempo por treino?">
        <OnboardingOption icon="timer-outline" label="Até 30 minutos" selected={profile.trainingDuration === 'up_to_30'} onPress={() => updateProfile({ trainingDuration: 'up_to_30' })} />
        <OnboardingOption icon="timer-outline" label="30 a 45 minutos" selected={profile.trainingDuration === '30_to_45'} onPress={() => updateProfile({ trainingDuration: '30_to_45' })} />
        <OnboardingOption icon="timer-outline" label="45 a 60 minutos" selected={profile.trainingDuration === '45_to_60'} onPress={() => updateProfile({ trainingDuration: '45_to_60' })} />
        <OnboardingOption icon="timer-outline" label="Mais de 60 minutos" selected={profile.trainingDuration === 'over_60'} onPress={() => updateProfile({ trainingDuration: 'over_60' })} />
      </QuestionSection>
    </>
  );
}

function TrainingPeriodStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="sunny-outline" label="Manhã" selected={profile.preferredTrainingPeriod === 'morning'} onPress={() => updateProfile({ preferredTrainingPeriod: 'morning' })} />
      <OnboardingOption icon="partly-sunny-outline" label="Tarde" selected={profile.preferredTrainingPeriod === 'afternoon'} onPress={() => updateProfile({ preferredTrainingPeriod: 'afternoon' })} />
      <OnboardingOption icon="moon-outline" label="Noite" selected={profile.preferredTrainingPeriod === 'night'} onPress={() => updateProfile({ preferredTrainingPeriod: 'night' })} />
      <OnboardingOption icon="shuffle-outline" label="Varia conforme o dia" selected={profile.preferredTrainingPeriod === 'varies'} onPress={() => updateProfile({ preferredTrainingPeriod: 'varies' })} />
    </>
  );
}

function MetricsStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <NumberInput
        helperText="Use seu peso atual, mesmo que seja aproximado."
        icon="speedometer-outline"
        label="Peso atual"
        onChange={(weightKg) => updateProfile({ weightKg })}
        placeholder="Ex: 83"
        rightText="kg"
        value={profile.weightKg}
      />
      <NumberInput
        helperText="Informe sua altura em centímetros."
        icon="resize-outline"
        label="Altura"
        onChange={(heightCm) => updateProfile({ heightCm })}
        placeholder="Ex: 170"
        rightText="cm"
        value={profile.heightCm}
      />
    </>
  );
}

function SleepHoursStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="cloudy-night-outline" label="Menos de 5 horas" selected={profile.sleepHours === 'less_than_5'} onPress={() => updateProfile({ sleepHours: 'less_than_5' })} />
      <OnboardingOption icon="moon-outline" label="5 a 6 horas" selected={profile.sleepHours === '5_to_6'} onPress={() => updateProfile({ sleepHours: '5_to_6' })} />
      <OnboardingOption icon="bed-outline" label="7 a 8 horas" selected={profile.sleepHours === '7_to_8'} onPress={() => updateProfile({ sleepHours: '7_to_8' })} />
      <OnboardingOption icon="bed-outline" label="Mais de 8 horas" selected={profile.sleepHours === 'more_than_8'} onPress={() => updateProfile({ sleepHours: 'more_than_8' })} />
      <OnboardingOption icon="shuffle-outline" label="Varia muito" selected={profile.sleepHours === 'varies'} onPress={() => updateProfile({ sleepHours: 'varies' })} />
    </>
  );
}

function RestStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="happy-outline" label="Sim, na maioria dos dias" selected={profile.wakesUpRested === 'yes'} onPress={() => updateProfile({ wakesUpRested: 'yes' })} />
      <OnboardingOption icon="ellipse-outline" label="Mais ou menos" selected={profile.wakesUpRested === 'sometimes'} onPress={() => updateProfile({ wakesUpRested: 'sometimes' })} />
      <OnboardingOption icon="sad-outline" label="Quase nunca" selected={profile.wakesUpRested === 'no'} onPress={() => updateProfile({ wakesUpRested: 'no' })} />
    </>
  );
}

function SmokingStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="flame-outline" label="Sim" selected={profile.smokes === 'yes'} onPress={() => updateProfile({ smokes: 'yes' })} />
      <OnboardingOption icon="checkmark-circle-outline" label="Não" selected={profile.smokes === 'no'} onPress={() => updateProfile({ smokes: 'no' })} />
      <OnboardingOption icon="leaf-outline" label="Parei de fumar" selected={profile.smokes === 'stopped'} onPress={() => updateProfile({ smokes: 'stopped' })} />
    </>
  );
}

function BeerStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="close-circle-outline" label="Não consumo" selected={profile.beerConsumption === 'no'} onPress={() => updateProfile({ beerConsumption: 'no' })} />
      <OnboardingOption icon="calendar-outline" label="Raramente" selected={profile.beerConsumption === 'rarely'} onPress={() => updateProfile({ beerConsumption: 'rarely' })} />
      <OnboardingOption icon="calendar-number-outline" label="1 a 2 vezes por semana" selected={profile.beerConsumption === 'weekly_1_2'} onPress={() => updateProfile({ beerConsumption: 'weekly_1_2' })} />
      <OnboardingOption icon="trending-up-outline" label="3 ou mais vezes por semana" selected={profile.beerConsumption === 'weekly_3_plus'} onPress={() => updateProfile({ beerConsumption: 'weekly_3_plus' })} />
    </>
  );
}

function SodaStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="checkmark-circle-outline" label="Sim" selected={profile.drinksSoda === 'yes'} onPress={() => updateProfile({ drinksSoda: 'yes' })} />
      <OnboardingOption
        icon="close-circle-outline"
        label="Não"
        selected={profile.drinksSoda === 'no'}
        onPress={() => updateProfile({ drinksSoda: 'no', sodaAmount: undefined, sodaFrequency: undefined })}
      />
    </>
  );
}

function SodaFrequencyStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="calendar-outline" label="Raramente" selected={profile.sodaFrequency === 'rarely'} onPress={() => updateProfile({ sodaFrequency: 'rarely' })} />
      <OnboardingOption icon="calendar-number-outline" label="1 a 2 vezes por semana" selected={profile.sodaFrequency === 'weekly_1_2'} onPress={() => updateProfile({ sodaFrequency: 'weekly_1_2' })} />
      <OnboardingOption icon="calendar-clear-outline" label="3 a 5 vezes por semana" selected={profile.sodaFrequency === 'weekly_3_5'} onPress={() => updateProfile({ sodaFrequency: 'weekly_3_5' })} />
      <OnboardingOption icon="today-outline" label="Todos os dias" selected={profile.sodaFrequency === 'daily'} onPress={() => updateProfile({ sodaFrequency: 'daily' })} />
    </>
  );
}

function SodaAmountStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="water-outline" label="Até 200 ml" selected={profile.sodaAmount === 'up_to_200'} onPress={() => updateProfile({ sodaAmount: 'up_to_200' })} />
      <OnboardingOption icon="water-outline" label="200 a 350 ml" selected={profile.sodaAmount === '200_to_350'} onPress={() => updateProfile({ sodaAmount: '200_to_350' })} />
      <OnboardingOption icon="water-outline" label="350 a 600 ml" selected={profile.sodaAmount === '350_to_600'} onPress={() => updateProfile({ sodaAmount: '350_to_600' })} />
      <OnboardingOption icon="water-outline" label="Mais de 600 ml" selected={profile.sodaAmount === 'over_600'} onPress={() => updateProfile({ sodaAmount: 'over_600' })} />
    </>
  );
}

function FoodMonitoringStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="analytics-outline" label="Sim, acompanho com frequência" selected={profile.monitorsFood === 'yes'} onPress={() => updateProfile({ monitorsFood: 'yes' })} />
      <OnboardingOption icon="ellipse-outline" label="Às vezes" selected={profile.monitorsFood === 'sometimes'} onPress={() => updateProfile({ monitorsFood: 'sometimes' })} />
      <OnboardingOption icon="close-circle-outline" label="Não monitoro" selected={profile.monitorsFood === 'no'} onPress={() => updateProfile({ monitorsFood: 'no' })} />
    </>
  );
}

function HistoryStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="sparkles-outline" label="Nunca treinei" selected={profile.gymExperience === 'never'} onPress={() => updateProfile({ gymExperience: 'never', previousTrainingTime: undefined })} />
      <OnboardingOption icon="footsteps-outline" label="Já treinei por pouco tempo" selected={profile.gymExperience === 'short_time'} onPress={() => updateProfile({ gymExperience: 'short_time' })} />
      <OnboardingOption icon="barbell-outline" label="Já treino atualmente" selected={profile.gymExperience === 'currently_training'} onPress={() => updateProfile({ gymExperience: 'currently_training' })} />
    </>
  );
}

function PreviousTrainingStep({ profile, updateProfile }: StepProps) {
  if (profile.gymExperience === 'never') {
    return <Text style={styles.note}>Como você nunca treinou, vamos começar do jeito certo: sem pressa e com orientação.</Text>;
  }

  return (
    <>
      <OnboardingOption label="Menos de 3 meses" selected={profile.previousTrainingTime === 'less_than_3_months'} onPress={() => updateProfile({ previousTrainingTime: 'less_than_3_months' })} />
      <OnboardingOption label="3 a 6 meses" selected={profile.previousTrainingTime === '3_to_6_months'} onPress={() => updateProfile({ previousTrainingTime: '3_to_6_months' })} />
      <OnboardingOption label="6 a 12 meses" selected={profile.previousTrainingTime === '6_to_12_months'} onPress={() => updateProfile({ previousTrainingTime: '6_to_12_months' })} />
      <OnboardingOption label="1 a 2 anos" selected={profile.previousTrainingTime === '1_to_2_years'} onPress={() => updateProfile({ previousTrainingTime: '1_to_2_years' })} />
      <OnboardingOption label="Mais de 2 anos" selected={profile.previousTrainingTime === 'more_than_2_years'} onPress={() => updateProfile({ previousTrainingTime: 'more_than_2_years' })} />
    </>
  );
}

function ProfessionalTrainingStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="trophy-outline" label="Sim" selected={profile.trainsProfessionally === 'yes'} onPress={() => updateProfile({ trainsProfessionally: 'yes' })} />
      <OnboardingOption icon="trending-up-outline" label="Pretendo no futuro" selected={profile.trainsProfessionally === 'moderate'} onPress={() => updateProfile({ trainsProfessionally: 'moderate', professionalTrainingPurpose: undefined })} />
      <OnboardingOption icon="close-circle-outline" label="Não" selected={profile.trainsProfessionally === 'no'} onPress={() => updateProfile({ trainsProfessionally: 'no', professionalTrainingPurpose: undefined })} />
    </>
  );
}

function ProfessionalPurposeStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="medal-outline" label="Competição esportiva" selected={profile.professionalTrainingPurpose === 'competition'} onPress={() => updateProfile({ professionalTrainingPurpose: 'competition' })} />
      <OnboardingOption icon="barbell-outline" label="Estética ou fisiculturismo" selected={profile.professionalTrainingPurpose === 'bodybuilding'} onPress={() => updateProfile({ professionalTrainingPurpose: 'bodybuilding' })} />
      <OnboardingOption icon="speedometer-outline" label="Performance profissional" selected={profile.professionalTrainingPurpose === 'professional_performance'} onPress={() => updateProfile({ professionalTrainingPurpose: 'professional_performance' })} />
      <OnboardingOption icon="document-text-outline" label="Teste físico ou concurso" selected={profile.professionalTrainingPurpose === 'physical_test'} onPress={() => updateProfile({ professionalTrainingPurpose: 'physical_test' })} />
      <OnboardingOption icon="ellipsis-horizontal-outline" label="Outro" selected={profile.professionalTrainingPurpose === 'other'} onPress={() => updateProfile({ professionalTrainingPurpose: 'other' })} />
    </>
  );
}

function NutritionTipsStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="leaf-outline" label="Sim, quero dicas de alimentação" selected={profile.wantsNutritionTips === 'yes'} onPress={() => updateProfile({ wantsNutritionTips: 'yes' })} />
      <OnboardingOption icon="remove-circle-outline" label="Quero de forma moderada" selected={profile.wantsNutritionTips === 'moderate'} onPress={() => updateProfile({ wantsNutritionTips: 'moderate' })} />
      <OnboardingOption icon="close-circle-outline" label="Não quero agora" selected={profile.wantsNutritionTips === 'no'} onPress={() => updateProfile({ wantsNutritionTips: 'no' })} />
    </>
  );
}

function DailyAdviceStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="notifications-outline" label="Sim, quero receber" selected={profile.wantsDailyAdvice === 'yes'} onPress={() => updateProfile({ wantsDailyAdvice: 'yes' })} />
      <OnboardingOption icon="remove-circle-outline" label="Apenas quando fizer sentido" selected={profile.wantsDailyAdvice === 'moderate'} onPress={() => updateProfile({ wantsDailyAdvice: 'moderate' })} />
      <OnboardingOption icon="close-circle-outline" label="Não quero agora" selected={profile.wantsDailyAdvice === 'no'} onPress={() => updateProfile({ wantsDailyAdvice: 'no' })} />
    </>
  );
}

function MealPhotosStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="fast-food-outline" label="Sim, quero registrar" selected={profile.wantsMealPhotoDiary === 'yes'} onPress={() => updateProfile({ wantsMealPhotoDiary: 'yes' })} />
      <OnboardingOption icon="time-outline" label="Talvez depois" selected={profile.wantsMealPhotoDiary === 'maybe_later'} onPress={() => updateProfile({ wantsMealPhotoDiary: 'maybe_later' })} />
      <OnboardingOption icon="lock-closed-outline" label="Não quero" selected={profile.wantsMealPhotoDiary === 'no'} onPress={() => updateProfile({ wantsMealPhotoDiary: 'no' })} />
    </>
  );
}

function ProgressPhotosStep({ profile, updateProfile }: StepProps) {
  return (
    <>
      <OnboardingOption icon="camera-outline" label="Sim, quero acompanhar" selected={profile.wantsProgressPhotos === 'yes'} onPress={() => updateProfile({ wantsProgressPhotos: 'yes' })} />
      <OnboardingOption icon="time-outline" label="Talvez depois" selected={profile.wantsProgressPhotos === 'maybe_later'} onPress={() => updateProfile({ wantsProgressPhotos: 'maybe_later' })} />
      <OnboardingOption icon="lock-closed-outline" label="Não quero" selected={profile.wantsProgressPhotos === 'no'} onPress={() => updateProfile({ wantsProgressPhotos: 'no' })} />
    </>
  );
}

function SummaryStep({ profile }: { profile: OnboardingProfile }) {
  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const bmiResult = bmi ? getBmiResult(bmi) : null;
  const bmiValue = bmi?.toFixed(1);
  const currentLevel = getCurrentJourneyLevel(profile);
  const [targetLevel, setTargetLevel] = useState<JourneyScaleLevel>(
    currentLevel === 'performance' ? 'performance' : 'evolution',
  );

  return (
    <View style={styles.summaryWrapper}>
      <View style={styles.summary}>
        <SummaryRow emoji="🏋️" label="Treinos" value={`${profile.trainingDaysPerWeek ?? '-'}x por semana`} />
        <SummaryRow emoji="📏" label="Medidas" value={`${profile.weightKg ?? '-'} kg / ${profile.heightCm ?? '-'} cm`} />
        <SummaryRow emoji="😴" label="Sono" value={profile.sleepHours ? labels[profile.sleepHours] : '-'} />
        <SummaryRow emoji="🙂" label="Humor" value={profile.moodPattern ? labels[profile.moodPattern] : '-'} />
        <SummaryRow emoji="🥤" label="Refrigerante" value={profile.drinksSoda === 'yes' && profile.sodaFrequency ? labels[profile.sodaFrequency] : profile.drinksSoda ? labels[profile.drinksSoda] : '-'} />
        <SummaryRow emoji="⏱️" label="Academia" value={profile.gymExperience ? labels[profile.gymExperience] : '-'} />
        <SummaryRow emoji="🏆" label="Treino profissional" value={profile.trainsProfessionally ? labels[profile.trainsProfessionally] : '-'} />
        <SummaryRow emoji="📸" label="Fotos" value={profile.wantsProgressPhotos ? labels[profile.wantsProgressPhotos] : '-'} />
      </View>

      <JourneyScale
        currentLevel={currentLevel}
        onTargetChange={setTargetLevel}
        targetLevel={targetLevel}
      />

      {bmiResult && bmiValue ? (
        <View style={[styles.bmiCard, { borderColor: bmiResult.color }]}>
          <View style={styles.bmiHeader}>
            <Text style={styles.bmiEmoji}>{bmiResult.emoji}</Text>
            <View style={styles.bmiTitleGroup}>
              <Text style={styles.bmiTitle}>Seu IMC estimado</Text>
              <Text style={styles.bmiValue}>{bmiValue}</Text>
            </View>
          </View>
          <Text style={[styles.bmiStatus, { color: bmiResult.color }]}>{bmiResult.title}</Text>
          <Text style={styles.bmiDescription}>{bmiResult.description}</Text>
          <View style={styles.bmiScale}>
            <View style={[styles.bmiScaleFill, { backgroundColor: bmiResult.color, width: bmiResult.scaleWidth }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

type JourneyScaleLevel = 'start' | 'consistency' | 'evolution' | 'performance';

const journeyScaleLevels: {
  description: string;
  label: string;
  value: JourneyScaleLevel;
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

function JourneyScale({
  currentLevel,
  onTargetChange,
  targetLevel,
}: {
  currentLevel: JourneyScaleLevel;
  onTargetChange: (level: JourneyScaleLevel) => void;
  targetLevel: JourneyScaleLevel;
}) {
  const currentIndex = journeyScaleLevels.findIndex((level) => level.value === currentLevel);
  const targetIndex = journeyScaleLevels.findIndex((level) => level.value === targetLevel);
  const current = journeyScaleLevels[currentIndex];
  const target = journeyScaleLevels[targetIndex];

  return (
    <View style={styles.scaleCard}>
      <View style={styles.scaleHeader}>
        <Text style={styles.scaleTitle}>Sua escala de evolução</Text>
        <Text style={styles.scaleSubtitle}>Toque para escolher onde quer chegar.</Text>
      </View>

      <View style={styles.scaleTrack}>
        <View style={styles.scaleLine} />
        <View
          style={[
            styles.scaleLineFill,
            {
              left: `${(Math.min(currentIndex, targetIndex) / (journeyScaleLevels.length - 1)) * 100}%`,
              right: `${100 - (Math.max(currentIndex, targetIndex) / (journeyScaleLevels.length - 1)) * 100}%`,
            },
          ]}
        />
        {journeyScaleLevels.map((level, index) => {
          const isCurrent = level.value === currentLevel;
          const isTarget = level.value === targetLevel;
          const isActive = index >= Math.min(currentIndex, targetIndex) && index <= Math.max(currentIndex, targetIndex);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isTarget }}
              key={level.value}
              onPress={() => onTargetChange(level.value)}
              style={styles.scalePoint}>
              <View
                style={[
                  styles.scaleDot,
                  isActive ? styles.scaleDotActive : null,
                  isCurrent ? styles.scaleDotCurrent : null,
                  isTarget ? styles.scaleDotTarget : null,
                ]}>
                {isCurrent ? <Text style={styles.scaleDotText}>A</Text> : null}
                {isTarget && !isCurrent ? <Text style={styles.scaleDotText}>M</Text> : null}
              </View>
              <Text style={[styles.scalePointLabel, isTarget ? styles.scalePointLabelActive : null]}>
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scaleLegend}>
        <View style={styles.scaleLegendItem}>
          <Text style={styles.scaleLegendKicker}>Atual</Text>
          <Text style={styles.scaleLegendValue}>{current.label}</Text>
        </View>
        <View style={styles.scaleLegendItem}>
          <Text style={styles.scaleLegendKicker}>Meta</Text>
          <Text style={styles.scaleLegendValue}>{target.label}</Text>
        </View>
      </View>
      <Text style={styles.scaleDescription}>{target.description}</Text>
    </View>
  );
}

function SummaryRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <View style={styles.summaryTextGroup}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

function NumberInput({
  helperText,
  icon,
  label,
  onChange,
  placeholder,
  rightText,
  value,
}: {
  helperText?: string;
  icon: Parameters<typeof Input>[0]['icon'];
  label?: string;
  onChange: (value: number | undefined) => void;
  placeholder: string;
  rightText?: string;
  value?: number;
}) {
  return (
    <Input
      helperText={helperText}
      icon={icon}
      keyboardType="numeric"
      label={label}
      onChangeText={(text) => onChange(text ? Number(text.replace(',', '.')) : undefined)}
      placeholder={placeholder}
      rightText={rightText}
      value={value ? String(value) : ''}
    />
  );
}

function getVisibleStepIndexes(profile: OnboardingProfile) {
  return steps
    .map((_, index) => index)
    .filter((index) => index !== previousTrainingStepIndex || profile.gymExperience !== 'never')
    .filter((index) => index !== sodaFrequencyStepIndex || profile.drinksSoda === 'yes')
    .filter((index) => index !== sodaAmountStepIndex || profile.drinksSoda === 'yes')
    .filter((index) => index !== professionalPurposeStepIndex || profile.trainsProfessionally === 'yes');
}

function isStepValid(step: number, profile: OnboardingProfile) {
  if (step === 0) return true;
  if (step === 1) return Boolean(profile.sex);
  if (step === 2) return Boolean(profile.workRoutine);
  if (step === 3) return Boolean(profile.relationshipStatus);
  if (step === 4) return Boolean(profile.hasRelationshipDifficulty);
  if (step === 5) return Boolean(profile.moodPattern);
  if (step === 6) return Boolean(profile.trainingDaysPerWeek && profile.trainingDuration);
  if (step === 7) return Boolean(profile.preferredTrainingPeriod);
  if (step === 8) return bodyMetricsSchema.safeParse(profile).success;
  if (step === 9) return Boolean(profile.sleepHours);
  if (step === 10) return Boolean(profile.wakesUpRested);
  if (step === 11) return Boolean(profile.smokes);
  if (step === 12) return Boolean(profile.beerConsumption);
  if (step === 13) return Boolean(profile.drinksSoda);
  if (step === 14) return Boolean(profile.sodaFrequency);
  if (step === 15) return Boolean(profile.sodaAmount);
  if (step === 16) return Boolean(profile.monitorsFood);
  if (step === 17) return Boolean(profile.gymExperience);
  if (step === 18) return Boolean(profile.gymExperience === 'never' || profile.previousTrainingTime);
  if (step === 19) return Boolean(profile.trainsProfessionally);
  if (step === 20) return Boolean(profile.professionalTrainingPurpose);
  if (step === 21) return Boolean(profile.wantsNutritionTips);
  if (step === 22) return Boolean(profile.wantsDailyAdvice);
  if (step === 23) return Boolean(profile.wantsMealPhotoDiary);
  if (step === 24) return Boolean(profile.wantsProgressPhotos);
  return onboardingSchema.safeParse(profile).success;
}

const labels: Record<string, string> = {
  '5_to_6': '5 a 6 horas',
  '7_to_8': '7 a 8 horas',
  less_than_5: 'menos de 5 horas',
  more_than_8: 'mais de 8 horas',
  varies: 'varia bastante',
  never: 'nunca treinou',
  short_time: 'pouco tempo',
  few_months: 'alguns meses',
  more_than_1_year: 'mais de 1 ano',
  currently_training: 'treina atualmente',
  yes: 'sim',
  moderate: 'talvez no futuro',
  maybe_later: 'talvez depois',
  no: 'não',
  stopped: 'parou de fumar',
  rarely: 'raramente',
  weekly_1_2: '1 a 2 vezes por semana',
  weekly_3_plus: '3+ vezes por semana',
  weekly_3_5: '3 a 5 vezes por semana',
  daily: 'todos os dias',
  up_to_200: 'até 200 ml',
  '200_to_350': '200 a 350 ml',
  '350_to_600': '350 a 600 ml',
  over_600: 'mais de 600 ml',
  sometimes: 'às vezes',
  single: 'solteiro(a)',
  married: 'casado(a)',
  serious_relationship: 'relacionamento sério',
  other: 'outro',
  often: 'com frequência',
  stable: 'estável',
  motivated: 'animado(a)',
  anxious: 'ansioso(a)',
  irritated: 'irritado(a)',
  discouraged: 'desanimado(a)',
  competition: 'competição esportiva',
  bodybuilding: 'estética ou fisiculturismo',
  professional_performance: 'performance profissional',
  physical_test: 'teste físico ou concurso',
};

function calculateBmi(weightKg?: number, heightCm?: number) {
  if (!weightKg || !heightCm) {
    return null;
  }

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function getCurrentJourneyLevel(profile: OnboardingProfile): JourneyScaleLevel {
  if (profile.trainsProfessionally === 'yes' || profile.gymExperience === 'currently_training') {
    return 'performance';
  }

  if (profile.gymExperience === 'more_than_1_year' || profile.gymExperience === 'few_months') {
    return 'evolution';
  }

  if (profile.gymExperience === 'short_time' || profile.trainingDaysPerWeek && profile.trainingDaysPerWeek >= 4) {
    return 'consistency';
  }

  return 'start';
}

function getBmiResult(bmi: number) {
  if (bmi < 18.5) {
    return {
      color: '#F5B041',
      description: 'Seu corpo pode precisar de mais atenção com energia, força e alimentação.',
      emoji: '🌱',
      scaleWidth: '28%' as const,
      title: 'Atenção ao ganho saudável',
    };
  }

  if (bmi < 25) {
    return {
      color: colors.primary,
      description: 'Boa base inicial. Agora o foco é consistência, evolução e qualidade de treino.',
      emoji: '✅',
      scaleWidth: '55%' as const,
      title: 'Faixa considerada adequada',
    };
  }

  if (bmi < 30) {
    return {
      color: '#F5B041',
      description: 'Vale acompanhar evolução com calma e usar treino, sono e rotina a seu favor.',
      emoji: '⚠️',
      scaleWidth: '74%' as const,
      title: 'Ponto de atenção',
    };
  }

  return {
    color: '#F75A68',
    description: 'Vamos avançar com cuidado, metas realistas e acompanhamento consistente.',
    emoji: '🧭',
    scaleWidth: '92%' as const,
    title: 'Atenção redobrada',
  };
}

function QuestionSection({ children, title }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View accessibilityRole="summary" style={styles.questionSection}>
      <Text accessibilityRole="header" style={styles.questionTitle}>
        {title}
      </Text>
      <View style={styles.questionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  inlineGrid: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  questionSection: {
    gap: spacing.sm,
  },
  questionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  questionContent: {
    gap: spacing.sm,
  },
  summaryWrapper: {
    alignItems: 'center',
    gap: spacing.md,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.md,
    width: '100%',
  },
  summaryRow: {
    alignItems: 'center',
    flexBasis: '47%',
    gap: 6,
    justifyContent: 'flex-start',
    minHeight: 86,
    minWidth: 132,
    paddingVertical: 4,
  },
  summaryEmoji: {
    fontSize: 24,
    textAlign: 'center',
  },
  summaryTextGroup: {
    alignItems: 'center',
    gap: 2,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryValue: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  scaleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  scaleHeader: {
    alignItems: 'center',
    gap: 4,
  },
  scaleTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  scaleSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  scaleTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 74,
    position: 'relative',
  },
  scaleLine: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 999,
    height: 6,
    left: 18,
    position: 'absolute',
    right: 18,
    top: 15,
  },
  scaleLineFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    top: 15,
  },
  scalePoint: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    zIndex: 1,
  },
  scaleDot: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.surfaceStrong,
    borderRadius: 999,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scaleDotActive: {
    borderColor: colors.primary,
  },
  scaleDotCurrent: {
    backgroundColor: colors.surfaceStrong,
  },
  scaleDotTarget: {
    backgroundColor: colors.primaryDark,
  },
  scaleDotText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  scalePointLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },
  scalePointLabelActive: {
    color: colors.text,
  },
  scaleLegend: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scaleLegendItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  scaleLegendKicker: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scaleLegendValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  scaleDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  bmiCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
  },
  bmiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  bmiEmoji: {
    fontSize: 34,
  },
  bmiTitleGroup: {
    alignItems: 'center',
  },
  bmiTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  bmiValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  bmiStatus: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  bmiDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 360,
    textAlign: 'center',
  },
  bmiScale: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  bmiScaleFill: {
    borderRadius: 999,
    height: '100%',
  },
});
