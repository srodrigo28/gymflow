import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// A imagem do card num arquivo temporário do aparelho. No navegador vale capture-card.web.ts.
export function captureCard(ref: RefObject<View | null>) {
  return captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
}
