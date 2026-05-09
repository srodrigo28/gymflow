import { env } from '@/src/config/env';

type RequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}) {
  if (!env.apiUrl) {
    throw new Error('API_URL nao configurada.');
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel concluir a solicitacao.');
  }

  return response.json() as Promise<TResponse>;
}
