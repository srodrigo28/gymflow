import { Stack } from 'expo-router';

import { useTheme } from '@/src/theme';

export default function AppLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.bg.base },
        headerShown: false,
      }}
    />
  );
}
