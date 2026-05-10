import { env } from '@/src/config/env';

type RequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}) {
  if (!env.apiUrl) {
    throw new Error('API_URL não configurada.');
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
    throw new Error('Não foi possível concluir a solicitação.');
  }

  return response.json() as Promise<TResponse>;
}
