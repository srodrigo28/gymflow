import { ApiError, apiRequest } from '@/src/services/api';
import { secureStorage, storageKeys } from '@/src/services/storage';
import type { AuthResponse, AuthUser, SignInPayload, SignUpPayload } from '@/src/types/auth';

async function persistSession(response: AuthResponse) {
  await secureStorage.set(storageKeys.session, JSON.stringify(response));
  return response;
}

export async function signIn({ email, password }: SignInPayload) {
  return persistSession(
    await apiRequest<AuthResponse>('/auth/sign-in', { body: { email, password }, method: 'POST' }),
  );
}

// A confirmação de senha é checada no formulário; o servidor recebe só a senha.
export async function signUp({ email, name, password }: SignUpPayload) {
  return persistSession(
    await apiRequest<AuthResponse>('/auth/sign-up', { body: { email, name, password }, method: 'POST' }),
  );
}

export async function updateProfile(session: AuthResponse, name: string) {
  const { user } = await apiRequest<{ user: AuthUser }>('/me', {
    body: { name },
    method: 'PATCH',
    token: session.token,
  });

  return persistSession({ ...session, user });
}

// O servidor encerra as outras sessões da conta; a deste aparelho continua valendo.
export async function changePassword(session: AuthResponse, currentPassword: string, newPassword: string) {
  await apiRequest('/me/password', {
    body: { currentPassword, newPassword },
    method: 'PUT',
    token: session.token,
  });
}

export async function getSession(): Promise<AuthResponse | null> {
  const storedSession = await secureStorage.get(storageKeys.session);

  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as Partial<AuthResponse>;

    if (!session.token || !session.user) {
      return null;
    }

    // Sessões gravadas antes de existir o papel entram como pessoa comum.
    return { token: session.token, user: { ...session.user, role: session.user.role ?? 'user' } };
  } catch {
    return null;
  }
}

// Confere a sessão salva e traz os dados atuais da pessoa. Devolve null quando o servidor
// recusa o token (vencido, ou de antes da API). Sem rede, lança o erro e a sessão continua.
export async function refreshSession(session: AuthResponse): Promise<AuthResponse | null> {
  try {
    const { user } = await apiRequest<{ user: AuthUser }>('/me', { token: session.token });
    return await persistSession({ ...session, user });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await secureStorage.remove(storageKeys.session);
      return null;
    }

    throw error;
  }
}

export async function signOut() {
  const session = await getSession();

  // Encerra a sessão no servidor quando dá. Sem rede, ela sai só do aparelho e vence sozinha.
  if (session) {
    await apiRequest('/auth/sign-out', { method: 'POST', timeoutMs: 4000, token: session.token }).catch(
      () => undefined,
    );
  }

  await secureStorage.remove(storageKeys.session);
}
