import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/src/contexts/session-context';
import { useBodySync } from '@/src/services/body-sync';
import { useDailyLogSync } from '@/src/services/daily-log';
import { usePhotoSync } from '@/src/services/photo-sync';
import { usePushNavigation } from '@/src/services/push';
import { syncQuestionnaire } from '@/src/services/questionnaire-sync';
import { useWorkoutSync } from '@/src/services/sync';
import { useTheme } from '@/src/theme';

export default function AppLayout() {
  const { theme } = useTheme();
  const { session } = useSession();

  // Enquanto houver alguém logado, os treinos concluídos sobem para a conta; as medidas, as fotos de
  // evolução e o diário do dia (sono, água e humor), só com o consentimento específico de cada um.
  useWorkoutSync(session?.token);
  useBodySync(session?.token, session?.user.bodyDataConsentAt);
  usePhotoSync(session?.user.id, session?.token, session?.user.bodyPhotoConsentAt);
  useDailyLogSync(session?.user.id, session?.token, session?.user.dailyLogConsentAt);
  // Tocar numa notificação de desafio abre o desafio.
  usePushNavigation();

  // As respostas do questionário sobem ou descem uma vez por abertura, se houver consentimento.
  useEffect(() => {
    if (session?.user.questionnaireConsentAt) {
      void syncQuestionnaire(session).catch(() => {});
    }
    // Só quando a conta ou o consentimento mudam; a sessão em si muda a cada refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, session?.user.questionnaireConsentAt]);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg.base },
        headerShown: false,
      }}
    />
  );
}
