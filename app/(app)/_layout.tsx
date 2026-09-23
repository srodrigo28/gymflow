import { Stack } from 'expo-router';

import { useSession } from '@/src/contexts/session-context';
import { useWorkoutSync } from '@/src/services/sync';
import { useTheme } from '@/src/theme';

export default function AppLayout() {
  const { theme } = useTheme();
  const { session } = useSession();

  // Enquanto houver alguém logado, os treinos concluídos sobem para a conta.
  useWorkoutSync(session?.token);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg.base },
        headerShown: false,
      }}
    />
  );
}
