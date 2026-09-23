import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Keyboard, type ScrollView } from 'react-native';

export type AuthForm = {
  // Chame no foco do campo: a tela rola até o botão de enviar,
  // que de outro modo ficaria atrás do teclado.
  revealSubmit: () => void;
};

// Espera o teclado terminar de abrir e o layout encolher antes de rolar.
const SCROLL_DELAY = 80;
// O pedido de rolagem vale por este tempo depois do foco. Cobre o teclado que abre devagar e o
// que muda de altura ao trocar de campo (o de senha tem a fileira de números), sem rolar de novo
// quando a pessoa tocar outro campo mais tarde.
const REVEAL_WINDOW = 1500;

function scrollToSubmit(scrollRef: RefObject<ScrollView | null>) {
  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), SCROLL_DELAY);
}

// Rola a tela de login ou cadastro até o fim quando o teclado abre para um campo que pediu.
export function useKeyboardReveal() {
  const scrollRef = useRef<ScrollView>(null);
  const revealUntil = useRef(0);

  useEffect(() => {
    // No Android o evento também chega quando o teclado aberto só muda de altura.
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      if (Date.now() < revealUntil.current) {
        scrollToSubmit(scrollRef);
      }
    });

    return () => showListener.remove();
  }, []);

  const form = useMemo<AuthForm>(
    () => ({
      revealSubmit: () => {
        revealUntil.current = Date.now() + REVEAL_WINDOW;

        // Com o teclado já aberto pode não vir evento novo: rola agora.
        if (Keyboard.isVisible()) {
          scrollToSubmit(scrollRef);
        }
      },
    }),
    [],
  );

  return { form, scrollRef };
}
