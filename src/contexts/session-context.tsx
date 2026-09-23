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

import { setDatabaseUser } from '@/src/db/client';
import * as account from '@/src/services/account';
import * as auth from '@/src/services/auth';
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/src/types/auth';

// Se o armazenamento travar, o app segue como se não houvesse sessão.
const LOAD_TIMEOUT = 4000;

type SessionContextValue = {
  deleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
  session: AuthResponse | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentToken = useRef<string | null>(null);

  // Toda troca de sessão passa por aqui. O banco local é por conta e precisa trocar antes de
  // as telas pedirem dados: os efeitos das telas rodam antes dos efeitos deste provider.
  const applySession = useCallback((next: AuthResponse | null) => {
    setDatabaseUser(next?.user.id ?? null);
    currentToken.current = next?.token ?? null;
    setSession(next);
  }, []);

  useEffect(() => {
    let isActive = true;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT));

    Promise.race([auth.getSession(), timeout]).then((storedSession) => {
      if (!isActive) {
        return;
      }

      applySession(storedSession);
      setIsLoading(false);

      if (!storedSession) {
        return;
      }

      // Confere com o servidor depois de abrir, sem segurar a splash. Sem rede, segue com a
      // sessão salva (o app funciona offline). Só aplica se ninguém trocou de conta no meio.
      auth
        .refreshSession(storedSession)
        .then((freshSession) => {
          if (isActive && currentToken.current === storedSession.token) {
            applySession(freshSession);
          }
        })
        .catch(() => {});
    });

    return () => {
      isActive = false;
    };
  }, [applySession]);

  const signIn = useCallback(
    async (payload: SignInPayload) => {
      applySession(await auth.signIn(payload));
    },
    [applySession],
  );

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      applySession(await auth.signUp(payload));
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    applySession(null);
  }, [applySession]);

  const updateName = useCallback(
    async (name: string) => {
      if (!session) {
        return;
      }

      const freshSession = await auth.updateProfile(session, name);

      // Só aplica se ninguém saiu nem trocou de conta enquanto salvava.
      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }
    },
    [applySession, session],
  );

  // Com a senha errada ou sem rede, lança o erro e nada muda. Deu certo: sai da rota protegida
  // antes de limpar a sessão (como em "Sair da conta"), senão a pessoa veria a splash de novo.
  const deleteAccount = useCallback(
    async (password: string) => {
      if (!session) {
        return;
      }

      await account.deleteAccount(session, password);
      router.replace('/(auth)/welcome');
      applySession(null);
    },
    [applySession, session],
  );

  const value = useMemo(
    () => ({ deleteAccount, isLoading, session, signIn, signOut, signUp, updateName }),
    [deleteAccount, isLoading, session, signIn, signOut, signUp, updateName],
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
