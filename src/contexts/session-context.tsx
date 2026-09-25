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
import { stopPhotoSync } from '@/src/services/photo-sync';
import { forgetPushToken } from '@/src/services/push';
import { syncQuestionnaire } from '@/src/services/questionnaire-sync';
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/src/types/auth';

// Se o armazenamento travar, o app segue como se não houvesse sessão.
const LOAD_TIMEOUT = 4000;

type SessionContextValue = {
  confirmEmail: (code: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
  session: AuthResponse | null;
  setBodyDataConsent: (granted: boolean) => Promise<void>;
  setBodyPhotoConsent: (granted: boolean) => Promise<void>;
  setDailyLogConsent: (granted: boolean) => Promise<void>;
  setQuestionnaireConsent: (granted: boolean) => Promise<void>;
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
    // O aparelho deixa de receber as notificações desta conta antes de a sessão acabar.
    if (session) {
      await forgetPushToken(session).catch(() => undefined);
    }

    await auth.signOut();
    applySession(null);
  }, [applySession, session]);

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

  const confirmEmail = useCallback(
    async (code: string) => {
      if (!session) {
        return;
      }

      const freshSession = await auth.confirmEmailVerification(session, code);

      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }
    },
    [applySession, session],
  );

  // O consentimento vive na sessão: é ele que liga e desliga a sincronização das medidas.
  const setBodyDataConsent = useCallback(
    async (granted: boolean) => {
      if (!session) {
        return;
      }

      const freshSession = await auth.setBodyDataConsent(session, granted);

      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }
    },
    [applySession, session],
  );

  // Separado do das medidas, porque foto de corpo é o dado mais sensível do app. Ao aceitar, o
  // usePhotoSync vê o consentimento novo e sobe as fotos; ao retirar, o servidor já apagou todas da conta
  // e a sincronização para.
  const setBodyPhotoConsent = useCallback(
    async (granted: boolean) => {
      if (!session) {
        return;
      }

      // Retirar espera o envio em andamento terminar: uma foto que chegasse ao servidor depois da limpeza
      // ficaria guardada lá sem consentimento.
      if (!granted) {
        await stopPhotoSync();
      }

      const freshSession = await auth.setBodyPhotoConsent(session, granted);

      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }
    },
    [applySession, session],
  );

  // Como o das medidas: ao aceitar, o useDailyLogSync vê o consentimento novo e sobe o diário na hora;
  // ao retirar, o servidor já apagou tudo e a sincronização para.
  const setDailyLogConsent = useCallback(
    async (granted: boolean) => {
      if (!session) {
        return;
      }

      const freshSession = await auth.setDailyLogConsent(session, granted);

      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }
    },
    [applySession, session],
  );

  // Ao aceitar, as respostas locais sobem na hora; ao retirar, o servidor já apagou.
  const setQuestionnaireConsent = useCallback(
    async (granted: boolean) => {
      if (!session) {
        return;
      }

      const freshSession = await auth.setQuestionnaireConsent(session, granted);

      if (currentToken.current === freshSession.token) {
        applySession(freshSession);
      }

      if (granted) {
        void syncQuestionnaire(freshSession).catch(() => {});
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
    () => ({
      confirmEmail,
      deleteAccount,
      isLoading,
      session,
      setBodyDataConsent,
      setBodyPhotoConsent,
      setDailyLogConsent,
      setQuestionnaireConsent,
      signIn,
      signOut,
      signUp,
      updateName,
    }),
    [
      confirmEmail,
      deleteAccount,
      isLoading,
      session,
      setBodyDataConsent,
      setBodyPhotoConsent,
      setDailyLogConsent,
      setQuestionnaireConsent,
      signIn,
      signOut,
      signUp,
      updateName,
    ],
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
