import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { WebInputStyleReset } from '@/src/components/web/WebInputStyleReset';
import { colors } from '@/src/constants/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WebInputStyleReset />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
