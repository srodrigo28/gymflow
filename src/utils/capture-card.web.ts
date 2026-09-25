import html2canvas from 'html2canvas';
import type { RefObject } from 'react';
import type { View } from 'react-native';

// No navegador, o captureRef do react-native-view-shot passa pelo findNodeHandle, que o react-native-web não
// tem mais; a View já é o próprio elemento da página, então o html2canvas (o mesmo que o view-shot usaria)
// desenha o card direto. Escala 3, como num celular; a prévia pode estar reduzida por um transform no pai, e
// a cópia desenhada volta ao tamanho do card.
export async function captureCard(ref: RefObject<View | null>) {
  const element = ref.current as unknown as HTMLElement | null;

  if (!element) {
    throw new Error('O card ainda não está na tela.');
  }

  const canvas = await html2canvas(element, {
    backgroundColor: null,
    onclone: (_document, clone) => {
      if (clone.parentElement) {
        clone.parentElement.style.transform = 'none';
      }
    },
    scale: 3,
  });

  return canvas.toDataURL('image/png');
}
