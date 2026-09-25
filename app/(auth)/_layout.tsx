import { Stack } from 'expo-router';

import { useTheme } from '@/src/theme';

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 280,
        contentStyle: { backgroundColor: theme.bg.base },
        headerShown: false,
      }}>
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade', animationDuration: 400 }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="recuperar-senha" />
    </Stack>
  );
}
