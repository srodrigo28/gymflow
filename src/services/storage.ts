import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storageKeys = {
  onboardingCompleted: (userId: string) => `gynflow.onboarding.${userId}`,
  session: 'gynflow.session',
  theme: 'gynflow.theme',
};

// Preferências (tema, flags). Falhas nunca derrubam o app: leitura vira null.
export const storage = {
  async get(key: string) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Preferência não persistida; o app segue com o valor em memória.
    }
  },
  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Nada a fazer: na próxima leitura o valor antigo ainda pode aparecer.
    }
  },
};

// Dados sensíveis (token). O SecureStore não existe no web, então lá o fallback é o AsyncStorage.
export const secureStorage = {
  async get(key: string) {
    if (Platform.OS === 'web') {
      return storage.get(key);
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      return storage.set(key, value);
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Sessão não persistida; o usuário precisará entrar de novo na próxima abertura.
    }
  },
  async remove(key: string) {
    if (Platform.OS === 'web') {
      return storage.remove(key);
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nada a fazer.
    }
  },
};
