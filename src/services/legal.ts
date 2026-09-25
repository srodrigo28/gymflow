import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { env } from '@/src/config/env';

export type LegalPage = 'termos' | 'privacidade';

export const legalLabels: Record<LegalPage, string> = {
  privacidade: 'Política de Privacidade',
  termos: 'Termos de Uso',
};

// As páginas moram na API (a mesma que serve os links de convite): um endereço só, igual no app e
// na loja. Abrem no navegador dentro do app; no web, numa aba nova.
export function legalUrl(page: LegalPage) {
  return `${env.apiUrl}/${page}`;
}

export async function openLegalPage(page: LegalPage) {
  const url = legalUrl(page);

  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
}
