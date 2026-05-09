import Constants from 'expo-constants';

type ExtraConfig = {
  apiUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  apiUrl: extra.apiUrl ?? '',
};
