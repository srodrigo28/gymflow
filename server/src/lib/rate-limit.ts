import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

import { HttpError } from './http.js';

type Bucket = { count: number; resetAt: number };

export type RateLimiter = (key: string, max: number, windowMs: number) => void;

// Janela fixa em memória. Serve para uma instância; com várias, a contagem precisa ir para
// um lugar compartilhado (Redis ou o próprio Postgres).
export function createRateLimiter(): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let calls = 0;

  return (key, max, windowMs) => {
    const now = Date.now();
    calls += 1;

    if (calls % 500 === 0) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    bucket.count += 1;

    if (bucket.count > max) {
      throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
    }
  };
}

export function clientIp(c: Context, trustProxy: boolean) {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();

    if (forwarded) {
      return forwarded;
    }
  }

  try {
    return getConnInfo(c).remote.address ?? 'desconhecido';
  } catch {
    return 'desconhecido';
  }
}
