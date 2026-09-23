import { env } from '@/src/config/env';

const DEFAULT_TIMEOUT = 15000;

// Erro com mensagem pronta para a tela: a do servidor quando ele respondeu, ou uma nossa
// quando nem chegou a responder (status 0).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: unknown;
  timeoutMs?: number;
  token?: string;
};

export async function apiRequest<TResponse>(
  path: string,
  { body, timeoutMs = DEFAULT_TIMEOUT, token, ...options }: RequestOptions = {},
) {
  if (!env.apiUrl) {
    throw new ApiError('O endereço do servidor não está configurado.', 0, 'NO_API_URL');
  }

  const headers = new Headers(options.headers);

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...options,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Confira sua internet e tente de novo.', 0, 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const data = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message ?? 'Não foi possível concluir a solicitação.',
      response.status,
      data?.error?.code ?? 'HTTP_ERROR',
    );
  }

  return data as TResponse;
}
