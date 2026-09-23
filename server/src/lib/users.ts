import type { User } from '../../generated/prisma/client.js';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { hashToken, newSessionToken } from './tokens.js';

const SESSION_DAYS = 60;

// O que o app recebe sobre a pessoa. Nunca inclui o hash da senha.
export function publicUser(user: User) {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role === 'ADMIN' ? ('admin' as const) : ('user' as const),
  };
}

export function isAdminEmail(email: string) {
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function startSession(userId: string) {
  const token = newSessionToken();
  const now = new Date();

  await prisma.$transaction([
    // Sessões vencidas da mesma pessoa saem aqui, sem precisar de rotina de limpeza.
    prisma.authSession.deleteMany({ where: { expiresAt: { lte: now }, userId } }),
    prisma.authSession.create({
      data: {
        expiresAt: new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000),
        tokenHash: hashToken(token),
        userId,
      },
    }),
    prisma.user.update({ data: { lastSeenAt: now }, where: { id: userId } }),
  ]);

  return token;
}
