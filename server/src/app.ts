import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';

import { prisma } from './db.js';
import { env } from './env.js';
import { handleError, HttpError } from './lib/http.js';
import { clientIp, createRateLimiter } from './lib/rate-limit.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { challengeRoutes } from './routes/challenges.js';
import { inviteRoutes, landingRoutes } from './routes/invites.js';
import { meRoutes } from './routes/me.js';
import { syncRoutes } from './routes/sync.js';
import type { AppEnv } from './types.js';

// Mensagens de validação sem texto próprio saem em português.
z.config(z.locales.ptBR());

// Cada instância tem os próprios contadores de tentativas (os testes criam uma por arquivo).
export function createApp() {
  const app = new Hono<AppEnv>();
  const limiter = createRateLimiter();

  app.use(secureHeaders());

  // O app nativo não precisa de CORS; só a versão web, nas origens listadas no .env.
  if (env.CORS_ORIGINS.length > 0) {
    app.use(cors({ origin: env.CORS_ORIGINS }));
  }

  app.use(
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dados grandes demais para uma vez só.');
      },
    }),
  );

  app.use(async (c, next) => {
    c.set('limit', limiter);
    c.set('ip', clientIp(c, env.TRUST_PROXY));
    await next();
  });

  app.get('/health', async (c) => {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ ok: true });
  });

  app.route('/auth', authRoutes);
  app.route('/me', meRoutes);
  app.route('/admin', adminRoutes);
  app.route('/sync', syncRoutes);
  app.route('/challenges', challengeRoutes);
  app.route('/invites', inviteRoutes);
  app.route('/', landingRoutes);

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }, 404));
  app.onError(handleError);

  return app;
}
