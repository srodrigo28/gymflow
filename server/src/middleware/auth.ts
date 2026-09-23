import { createMiddleware } from 'hono/factory';

import { prisma } from '../db.js';
import { HttpError } from '../lib/http.js';
import { hashToken } from '../lib/tokens.js';
import type { AppEnv } from '../types.js';

const HOUR = 60 * 60 * 1000;

function unauthorized() {
  return new HttpError(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre de novo.');
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const [scheme, token] = (c.req.header('authorization') ?? '').split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw unauthorized();
  }

  const session = await prisma.authSession.findUnique({
    include: { user: true },
    where: { tokenHash: hashToken(token) },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw unauthorized();
  }

  let { user } = session;

  // "Ativo na semana" não precisa de precisão de minuto: uma escrita por hora basta.
  if (Date.now() - user.lastSeenAt.getTime() > HOUR) {
    user = await prisma.user.update({ data: { lastSeenAt: new Date() }, where: { id: user.id } });
  }

  c.set('user', user);
  c.set('sessionId', session.id);
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('user').role !== 'ADMIN') {
    throw new HttpError(403, 'FORBIDDEN', 'Esta área é só para administradores.');
  }

  await next();
});
