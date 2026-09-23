import { router, type Href } from 'expo-router';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as auth from '@/src/services/auth';
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/src/types/auth';

// Se o armazenamento travar, o app segue como se não houvesse sessão.
const LOAD_TIMEOUT = 4000;

type SessionContextValue = {
  isLoading: boolean;
  session: AuthResponse | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT));

    Promise.race([auth.getSession(), timeout]).then((storedSession) => {
      if (!isActive) {
        return;
      }

      setSession(storedSession);
      setIsLoading(false);

      if (!storedSession) {
        return;
      }

      // Confere com o servidor depois de abrir, sem segurar a splash. Sem rede, segue com a
      // sessão salva (o app funciona offline). Só aplica se ninguém trocou de conta no meio.
      auth
        .refreshSession(storedSession)
        .then((freshSession) => {
          if (isActive) {
            setSession((current) => (current?.token === storedSession.token ? freshSession : current));
          }
        })
        .catch(() => {});
    });

    return () => {
      isActive = false;
    };
  }, []);

  const signIn = useCallback(async (payload: SignInPayload) => {
    setSession(await auth.signIn(payload));
  }, []);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    setSession(await auth.signUp(payload));
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ isLoading, session, signIn, signOut, signUp }),
    [isLoading, session, signIn, signOut, signUp],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return context;
}

// Agenda a navegação para uma rota protegida até a sessão existir. Navegar logo após o
// signIn falharia: o guard do Stack.Protected só libera a rota no render seguinte.
export function useRedirectAfterSignIn() {
  const { session } = useSession();
  const pendingHref = useRef<Href | null>(null);

  useEffect(() => {
    if (!session || !pendingHref.current) {
      return;
    }

    const href = pendingHref.current;
    pendingHref.current = null;
    router.replace(href);
  }, [session]);

  return useCallback((href: Href | null) => {
    pendingHref.current = href;
  }, []);
}
