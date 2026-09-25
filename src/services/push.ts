import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { apiRequest } from '@/src/services/api';
import { storage, storageKeys } from '@/src/services/storage';
import type { AuthResponse } from '@/src/types/auth';

// Notificações dos desafios (lembrete do dia e placar final). O servidor decide o que sai; aqui o
// aparelho só se registra (PUT /me/push-token) e abre o desafio quando a pessoa toca no aviso.
// O Expo Go não recebe notificações remotas no Android desde o SDK 53: nele nada disto roda, e o
// registro só acontece num development build ou no app da loja.

export type PushStatus = 'denied' | 'registered' | 'unavailable';

export function pushAvailable() {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && Platform.OS !== 'web';
}

// O módulo só é carregado fora do Expo Go: importar o expo-notifications lá já dispara um erro vermelho
// (um efeito do próprio pacote registra um ouvinte de token), e nada daqui roda nele de qualquer jeito.
function loadNotifications(): typeof NotificationsModule | null {
  if (!pushAvailable()) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof NotificationsModule;
}

// O token do Expo Push é emitido por projeto EAS; sem o id (build sem EAS), não há como registrar.
function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

// Registra este aparelho para a conta logada. Pede a permissão só na primeira vez; se a pessoa
// negar, não insiste. O mesmo token não sobe duas vezes.
export async function registerPushToken(session: AuthResponse): Promise<PushStatus> {
  const id = projectId();
  const Notifications = loadNotifications();

  if (!Notifications || !id) {
    return 'unavailable';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('desafios', {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: 'Desafios',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted' && current.canAskAgain) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== 'granted') {
    return 'denied';
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const key = storageKeys.pushToken(session.user.id);

  if ((await storage.get(key)) !== token) {
    await apiRequest('/me/push-token', {
      body: { platform: Platform.OS === 'ios' ? 'ios' : 'android', token },
      method: 'PUT',
      token: session.token,
    });
    await storage.set(key, token);
  }

  return 'registered';
}

// Ao sair da conta, o aparelho deixa de receber as notificações dela.
export async function forgetPushToken(session: AuthResponse) {
  const key = storageKeys.pushToken(session.user.id);
  const token = await storage.get(key);

  if (!token) {
    return;
  }

  await apiRequest('/me/push-token', { body: { token }, method: 'DELETE', timeoutMs: 4000, token: session.token }).catch(
    () => undefined,
  );
  await storage.remove(key);
}

// O `kind` diz de onde veio o aviso: o resultado da liga abre a Liga, o fechamento da temporada abre
// a Temporada e o resto (lembrete e placar dos desafios) abre o desafio.
function openNotification(response: NotificationsModule.NotificationResponse | null) {
  const data = response?.notification.request.content.data;

  if (data?.kind === 'league') {
    router.push('/(app)/liga');
    return;
  }

  if (data?.kind === 'season') {
    router.push('/(app)/liga/temporada');
    return;
  }

  const challengeId = data?.challengeId;

  if (typeof challengeId === 'string') {
    router.push({ params: { id: challengeId }, pathname: '/(app)/desafios/[id]' });
  }
}

// Mostra a notificação mesmo com o app aberto e, ao toque, abre a tela do aviso (inclusive quando o
// toque foi o que abriu o app).
export function usePushNavigation() {
  useEffect(() => {
    const Notifications = loadNotifications();

    if (!Notifications) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    void Notifications.getLastNotificationResponseAsync().then(openNotification, () => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);

    return () => subscription.remove();
  }, []);
}
