import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { WebInputStyleReset } from '@/src/components/web/WebInputStyleReset';
import { ThemeProvider, useTheme } from '@/src/theme';

// A splash nativa fica na tela até fontes e tema salvo estarem prontos.
// O primeiro quadro da splash animada é igual a ela, então a troca é invisível.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 200, fade: true });

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isReady, theme } = useTheme();

  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <View onLayout={handleLayout} style={{ backgroundColor: theme.bg.base, flex: 1 }}>
      <WebInputStyleReset />
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: { backgroundColor: theme.bg.base },
          headerShown: false,
        }}
      />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}
