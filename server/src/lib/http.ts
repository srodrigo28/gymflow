import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

// Erro com mensagem pronta para a pessoa: o app mostra `message` como está.
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function readJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Não foi possível ler os dados enviados.');
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new HttpError(400, 'INVALID_INPUT', result.error.issues[0]?.message ?? 'Dados inválidos.');
  }

  return result.data;
}

export function handleError(error: Error, c: Context) {
  if (error instanceof HttpError) {
    return c.json({ error: { code: error.code, message: error.message } }, error.status);
  }

  if (error instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: error.message } }, error.status);
  }

  console.error(error);

  return c.json(
    { error: { code: 'INTERNAL', message: 'Algo deu errado do nosso lado. Tente de novo em instantes.' } },
    500,
  );
}
