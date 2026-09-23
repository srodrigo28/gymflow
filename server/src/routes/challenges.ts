import { Hono } from 'hono';
import { z } from 'zod';

import { isUniqueViolation, prisma } from '../db.js';
import {
  challengeStatus,
  DAY,
  safeTimezone,
  serializeChallenge,
  standings,
} from '../lib/challenges.js';
import { HttpError, readJson } from '../lib/http.js';
import { newInviteCode } from '../lib/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../types.js';

const MINUTE = 60 * 1000;

const createSchema = z.object({
  days: z.union([z.literal(7), z.literal(14), z.literal(30)], 'Escolha 7, 14 ou 30 dias.'),
  name: z
    .string('Dê um nome ao desafio.')
    .trim()
    .min(2, 'Dê um nome ao desafio.')
    .max(60, 'Use um nome com até 60 caracteres.'),
  // Meia-noite de hoje no aparelho. Sem ela, o desafio começa agora.
  startsAt: z.number().int().nonnegative().optional(),
  timezone: z.string().max(64).optional(),
});

const joinSchema = z.object({
  code: z
    .string('Informe o código do convite.')
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,12}$/, 'Código de convite inválido.'),
});

export const challengeRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const userId = c.get('user').id;
    const challenges = await prisma.challenge.findMany({
      orderBy: { endsAt: 'desc' },
      where: { members: { some: { userId } } },
    });

    const items = await Promise.all(
      challenges.map(async (challenge) => {
        const table = await standings(challenge.id, userId);
        const me = table.find((row) => row.isMe);

        return {
          ...serializeChallenge(challenge, userId),
          memberCount: table.length,
          myPoints: me?.points ?? 0,
          myRank: me?.rank ?? null,
        };
      }),
    );

    return c.json({ challenges: items });
  })
  .post('/', async (c) => {
    const user = c.get('user');
    c.get('limit')(`challenge-create:${user.id}`, 20, DAY);
    const input = await readJson(c, createSchema);
    const now = Date.now();
    const startsAt = input.startsAt ?? now;

    if (startsAt < now - DAY || startsAt > now + 2 * DAY) {
      throw new HttpError(400, 'INVALID_INPUT', 'O desafio precisa começar hoje ou amanhã.');
    }

    // O código é aleatório; em caso de colisão (raríssima), tenta outro.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const challenge = await prisma.challenge.create({
          data: {
            endsAt: new Date(startsAt + input.days * DAY),
            inviteCode: newInviteCode(),
            members: { create: { userId: user.id } },
            name: input.name,
            ownerId: user.id,
            startsAt: new Date(startsAt),
            timezone: safeTimezone(input.timezone),
          },
        });

        return c.json(
          { challenge: { ...serializeChallenge(challenge, user.id), memberCount: 1, myPoints: 0, myRank: 1 } },
          201,
        );
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new Error('Não foi possível gerar um código de convite único.');
  })
  .post('/join', async (c) => {
    const user = c.get('user');
    c.get('limit')(`challenge-join:${c.get('ip')}`, 30, 15 * MINUTE);
    const { code } = await readJson(c, joinSchema);
    const challenge = await prisma.challenge.findUnique({ where: { inviteCode: code } });

    if (!challenge) {
      throw new HttpError(404, 'INVITE_NOT_FOUND', 'Convite não encontrado. Confira o código.');
    }

    if (challengeStatus(challenge) === 'ended') {
      throw new HttpError(410, 'CHALLENGE_ENDED', 'Este desafio já terminou.');
    }

    // Entrar duas vezes pelo mesmo link não duplica nada.
    await prisma.challengeMember.upsert({
      create: { challengeId: challenge.id, userId: user.id },
      update: {},
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
    });

    return c.json({ challengeId: challenge.id });
  })
  .get('/:id', async (c) => {
    const userId = c.get('user').id;
    // Só quem participa vê o placar.
    const challenge = await prisma.challenge.findFirst({
      where: { id: c.req.param('id'), members: { some: { userId } } },
    });

    if (!challenge) {
      throw new HttpError(404, 'NOT_FOUND', 'Desafio não encontrado.');
    }

    const leaderboard = await standings(challenge.id, userId);

    return c.json({
      challenge: { ...serializeChallenge(challenge, userId), memberCount: leaderboard.length },
      leaderboard,
    });
  })
  .delete('/:id/membership', async (c) => {
    await prisma.challengeMember.deleteMany({
      where: { challengeId: c.req.param('id'), userId: c.get('user').id },
    });

    return c.body(null, 204);
  });
