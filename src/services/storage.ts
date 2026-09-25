import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storageKeys = {
  // Estilo de alimentação escolhido e diário alimentar (refeições e água por dia). Ficam só neste aparelho.
  eatingStyle: (userId: string) => `gynflow.eatingStyle.${userId}`,
  // Academia marcada e check-ins feitos nela ({ gym, checkins }). Ficam só neste aparelho.
  gymCheckin: (userId: string) => `gynflow.gymCheckin.${userId}`,
  nutritionDiary: (userId: string) => `gynflow.nutritionDiary.${userId}`,
  onboardingCompleted: (userId: string) => `gynflow.onboarding.${userId}`,
  // Frase que a pessoa guardou como sua ({ text, savedAt }). Fica só neste aparelho.
  personalPhrase: (userId: string) => `gynflow.personalPhrase.${userId}`,
  // Respostas do onboarding. Têm dados sensíveis (sono, humor, fumo): ficam no SecureStore.
  profile: (userId: string) => `gynflow.profile.${userId}`,
  // Onde está a foto de capa (no web, a própria imagem). Fica só neste aparelho.
  profilePhoto: (userId: string) => `gynflow.profilePhoto.${userId}`,
  // Token do Expo Push que este aparelho já registrou na conta, para não reenviar igual.
  pushToken: (userId: string) => `gynflow.pushToken.${userId}`,
  session: 'gynflow.session',
  // Última versão das respostas do questionário que subiu para a conta, para não reenviar igual.
  questionnaireUploaded: (userId: string) => `gynflow.questionnaireUploaded.${userId}`,
  theme: 'gynflow.theme',
  // Escolhas de treino (onde treina, tipos, foco, equipamentos, favoritos). Ficam só neste aparelho.
  trainingPreferences: (userId: string) => `gynflow.trainingPreferences.${userId}`,
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
