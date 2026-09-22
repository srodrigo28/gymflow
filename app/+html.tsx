import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { nativeSplashBackground } from '@/src/theme/themes';

// HTML raiz do web. O fundo já nasce na cor da splash, evitando o flash branco
// enquanto o JavaScript carrega (no celular, a splash nativa cobre esse intervalo).
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
        <meta content="width=device-width, initial-scale=1, shrink-to-fit=no" name="viewport" />
        <meta content={nativeSplashBackground} name="theme-color" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: ${nativeSplashBackground}; }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
