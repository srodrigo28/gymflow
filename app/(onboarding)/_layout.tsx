import { Stack } from 'expo-router';

import { useTheme } from '@/src/theme';

export default function OnboardingStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'fade_from_bottom',
        animationDuration: 260,
        contentStyle: { backgroundColor: theme.bg.base },
        headerShown: false,
      }}
    />
  );
}
