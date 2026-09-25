import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';

import { captureCard } from '@/src/utils/capture-card';

export type ShareImageResult = 'downloaded' | 'shared' | 'unavailable';

/**
 * Gera a imagem do card no aparelho e abre a folha de compartilhar. Só o app escolhido na folha recebe o
 * arquivo: nada é publicado por conta própria.
 *
 * No navegador, a folha do expo-sharing só compartilha endereços, não arquivos. Lá a imagem vai como arquivo
 * pelo navigator.share quando o navegador aceita (celulares, em geral) e, senão, é baixada.
 */
export async function shareCardImage(ref: RefObject<View | null>, fileName = 'gynflow.png'): Promise<ShareImageResult> {
  if (Platform.OS !== 'web') {
    if (!(await Sharing.isAvailableAsync())) {
      return 'unavailable';
    }

    const uri = await captureCard(ref);
    await Sharing.shareAsync(uri, { UTI: 'public.png', mimeType: 'image/png' });
    return 'shared';
  }

  const dataUri = await captureCard(ref);
  const blob = await (await fetch(dataUri)).blob();
  const file = new window.File([blob], fileName, { type: 'image/png' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      // Fechar a folha sem escolher um app não é erro.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    }

    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return 'downloaded';
}
