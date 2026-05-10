import { Stack } from 'expo-router';

export default function OnboardingStackLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade_from_bottom',
        animationDuration: 260,
        headerShown: false,
      }}
    />
  );
}
