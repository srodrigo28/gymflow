import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { WebInputStyleReset } from '@/src/components/web/WebInputStyleReset';
import { SessionProvider, useSession } from '@/src/contexts/session-context';
import { ThemeProvider, useTheme } from '@/src/theme';

// A splash nativa fica na tela até fontes e tema salvo estarem prontos.
// O primeiro quadro da splash animada é igual a ela, então a troca é invisível.
SplashScreen.preventAutoHideAsync().catch(() => {});

// No Expo Go a splash é a do próprio Expo Go e não aceita opções (só em development build).
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ duration: 200, fade: true });
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Mede o teclado de verdade, inclusive quando ele muda de altura sem fechar
          (no Android 11+ o React Native só avisa quando ele abre ou fecha). */}
      <KeyboardProvider>
        <ThemeProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isReady, theme } = useTheme();
  const { session } = useSession();

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
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        {/* Sem sessão, home e onboarding não existem: link direto volta para o início (splash → hero). */}
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}
