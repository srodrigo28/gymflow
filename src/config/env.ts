import Constants from 'expo-constants';

type ExtraConfig = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

// EXPO_PUBLIC_API_URL vem do .env.local em desenvolvimento (veja .env.example); o app.json
// fica com o endereço de produção.
export const env = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || '').replace(/\/+$/, ''),
};
