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

export async function signIn(payload: SignInPayload) {
  await wait();

  if (payload.email === 'erro@gymflow.com') {
    throw new Error('E-mail ou senha invalidos.');
  }

  return createAuthResponse('Rodrigo Gonçalves', payload.email);
}

export async function signUp(payload: SignUpPayload) {
  await wait();

  if (payload.email === 'erro@gymflow.com') {
    throw new Error('Este e-mail ja esta em uso.');
  }

  return createAuthResponse(payload.name, payload.email);
}

export async function signOut() {
  await wait(300);
}
