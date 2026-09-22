import { secureStorage, storageKeys } from '@/src/services/storage';
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/src/types/auth';

const MOCK_DELAY = 700;

function wait(delay = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function createAuthResponse(name: string, email: string): AuthResponse {
  return {
    token: 'mock-token',
    user: {
      id: 'user-1',
      name,
      email,
    },
  };
}

async function persistSession(response: AuthResponse) {
  await secureStorage.set(storageKeys.session, JSON.stringify(response));
  return response;
}

export async function signIn(payload: SignInPayload) {
  await wait();

  if (payload.email === 'erro@gymflow.com') {
    throw new Error('E-mail ou senha inválidos.');
  }

  return persistSession(createAuthResponse('Rodrigo Gonçalves', payload.email));
}

export async function signUp(payload: SignUpPayload) {
  await wait();

  if (payload.email === 'erro@gymflow.com') {
    throw new Error('Este e-mail já está em uso.');
  }

  return persistSession(createAuthResponse(payload.name, payload.email));
}

export async function getSession(): Promise<AuthResponse | null> {
  const storedSession = await secureStorage.get(storageKeys.session);

  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as Partial<AuthResponse>;
    return session.token && session.user ? (session as AuthResponse) : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  await wait(300);
  await secureStorage.remove(storageKeys.session);
}
