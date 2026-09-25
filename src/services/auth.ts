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

// Consentimento específico (LGPD) para guardar as medidas do corpo na conta. Retirar apaga todas
// as medidas da conta no servidor; as do aparelho continuam.
export async function setBodyDataConsent(session: AuthResponse, granted: boolean) {
  const { user } = await apiRequest<{ user: AuthUser }>('/me/consents/body-data', {
    body: { granted },
    method: 'PUT',
    token: session.token,
  });

  return persistSession({ ...session, user });
}

// Recuperar a senha: o código de 6 números chega por e-mail e vale 15 minutos. A resposta é a
// mesma com ou sem conta.
export async function requestPasswordReset(email: string) {
  const { message } = await apiRequest<{ message: string }>('/auth/password-reset/request', {
    body: { email },
    method: 'POST',
  });

  return message;
}

// A senha nova encerra todas as sessões da conta, inclusive a de outro aparelho que estivesse aberto.
export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  await apiRequest('/auth/password-reset/confirm', { body: { code, email, newPassword }, method: 'POST' });
}

export async function requestEmailVerification(session: AuthResponse) {
  const { message } = await apiRequest<{ message: string; user: AuthUser }>('/auth/email-verification/request', {
    method: 'POST',
    token: session.token,
  });

  return message;
}

export async function confirmEmailVerification(session: AuthResponse, code: string) {
  const { user } = await apiRequest<{ user: AuthUser }>('/auth/email-verification/confirm', {
    body: { code },
    method: 'POST',
    token: session.token,
  });

  return persistSession({ ...session, user });
}

// Consentimento próprio para as respostas do questionário na conta. Retirar apaga as respostas
// do servidor; as do aparelho continuam.
export async function setQuestionnaireConsent(session: AuthResponse, granted: boolean) {
  const { user } = await apiRequest<{ user: AuthUser }>('/me/consents/questionnaire', {
    body: { granted },
    method: 'PUT',
    token: session.token,
  });

  return persistSession({ ...session, user });
}

// Consentimento próprio para o diário do dia (sono, água e humor) na conta. Sono e humor são dado
// de saúde. Retirar apaga todos os registros do servidor; os do aparelho continuam.
export async function setDailyLogConsent(session: AuthResponse, granted: boolean) {
  const { user } = await apiRequest<{ user: AuthUser }>('/me/consents/daily-log', {
    body: { granted },
    method: 'PUT',
    token: session.token,
  });

  return persistSession({ ...session, user });
}

// Consentimento próprio para guardar as fotos de evolução na conta. Retirar apaga todas as fotos da conta
// no servidor na hora (e corta as URLs que ainda estavam no prazo); as do aparelho continuam.
export async function setBodyPhotoConsent(session: AuthResponse, granted: boolean) {
  const { user } = await apiRequest<{ user: AuthUser }>('/me/consents/body-photos', {
    body: { granted },
    method: 'PUT',
    token: session.token,
  });

  return persistSession({ ...session, user });
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

    // Sessões gravadas antes de existir o papel entram como pessoa comum; antes de um consentimento
    // (medidas, fotos, questionário, diário do dia), como quem ainda não aceitou. O servidor confirma ao
    // abrir o app.
    return {
      token: session.token,
      user: {
        ...session.user,
        bodyDataConsentAt: session.user.bodyDataConsentAt ?? null,
        bodyPhotoConsentAt: session.user.bodyPhotoConsentAt ?? null,
        dailyLogConsentAt: session.user.dailyLogConsentAt ?? null,
        emailVerifiedAt: session.user.emailVerifiedAt ?? null,
        gymRankingOptOut: session.user.gymRankingOptOut ?? false,
        questionnaireConsentAt: session.user.questionnaireConsentAt ?? null,
        role: session.user.role ?? 'user',
      },
    };
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
