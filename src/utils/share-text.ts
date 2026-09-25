import { Platform, Share } from 'react-native';

import { showAlert } from '@/src/utils/alert';

// Abre a folha de compartilhar com a mensagem. No navegador sem essa folha (a maioria dos computadores), o
// Share do React Native só falha; lá a mensagem vai para a área de transferência, com um aviso para colar.
export async function shareText(message: string) {
  if (Platform.OS !== 'web' || typeof navigator.share === 'function') {
    await Share.share({ message });
    return;
  }

  await navigator.clipboard.writeText(message);
  showAlert('Mensagem copiada', 'É só colar onde quiser mandar.');
}
