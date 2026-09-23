import type { Challenge } from '../../generated/prisma/client.js';
import { prisma, table } from '../db.js';
import { env } from '../env.js';

export const DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export type ChallengeStatus = 'upcoming' | 'active' | 'ended';

export function challengeStatus(challenge: Pick<Challenge, 'endsAt' | 'startsAt'>, now = Date.now()): ChallengeStatus {
  if (now < challenge.startsAt.getTime()) {
    return 'upcoming';
  }

  return now >= challenge.endsAt.getTime() ? 'ended' : 'active';
}

// Link que vai no WhatsApp. Precisa ser http(s): o WhatsApp não deixa clicar em gymflow://.
export function inviteUrl(code: string) {
  return `${env.PUBLIC_URL}/c/${code}`;
}

export function serializeChallenge(challenge: Challenge, userId: string) {
  return {
    days: Math.round((challenge.endsAt.getTime() - challenge.startsAt.getTime()) / DAY),
    endsAt: challenge.endsAt.toISOString(),
    id: challenge.id,
    inviteCode: challenge.inviteCode,
    inviteUrl: inviteUrl(challenge.inviteCode),
    isOwner: challenge.ownerId === userId,
    name: challenge.name,
    startsAt: challenge.startsAt.toISOString(),
    status: challengeStatus(challenge),
    timezone: challenge.timezone,
  };
}

export function safeTimezone(timezone?: string) {
  if (!timezone) {
    return DEFAULT_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

type StandingRow = { name: string; points: number; user_id: string };

// Placar: um ponto por dia com treino concluído dentro do período, no fuso do desafio.
// Treinar duas vezes no mesmo dia não vale dois pontos (teto diário, contra maratona de
// registro), e treino sem nenhuma série feita não conta.
export async function standings(challengeId: string, userId: string) {
  const rows = await prisma.$queryRawUnsafe<StandingRow[]>(
    `SELECT m.user_id, u.name,
            COUNT(DISTINCT (w.started_at AT TIME ZONE c.timezone)::date)::int AS points
       FROM ${table('challenge_members')} m
       JOIN ${table('challenges')} c ON c.id = m.challenge_id
       JOIN ${table('users')} u ON u.id = m.user_id
       LEFT JOIN ${table('workouts')} w
              ON w.user_id = m.user_id
             AND w.deleted_at IS NULL
             AND w.finished_at IS NOT NULL
             AND w.started_at >= c.starts_at
             AND w.started_at < c.ends_at
             AND EXISTS (
               SELECT 1
                 FROM ${table('workout_exercises')} we
                 JOIN ${table('workout_sets')} s ON s.workout_exercise_id = we.id
                WHERE we.workout_id = w.id AND s.done
             )
      WHERE m.challenge_id = $1
      GROUP BY m.user_id, u.name, m.joined_at
      ORDER BY points DESC, m.joined_at ASC`,
    challengeId,
  );

  // Empate divide a posição (1, 1, 3), para ninguém ficar atrás só por ter entrado depois.
  let rank = 0;
  let previous = -1;

  return rows.map((row, index) => {
    const points = Number(row.points);

    if (points !== previous) {
      rank = index + 1;
      previous = points;
    }

    return { isMe: row.user_id === userId, name: row.name, points, rank, userId: row.user_id };
  });
}

export function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? null;
}

// Prévia pública do convite: o suficiente para decidir entrar, sem expor quem já está no grupo.
export async function findInvite(rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  if (!/^[A-Z0-9]{6,12}$/.test(code)) {
    return null;
  }

  const challenge = await prisma.challenge.findUnique({
    include: { _count: { select: { members: true } }, owner: { select: { name: true } } },
    where: { inviteCode: code },
  });

  if (!challenge) {
    return null;
  }

  return {
    code,
    days: Math.round((challenge.endsAt.getTime() - challenge.startsAt.getTime()) / DAY),
    endsAt: challenge.endsAt.toISOString(),
    memberCount: challenge._count.members,
    name: challenge.name,
    ownerFirstName: firstName(challenge.owner?.name),
    startsAt: challenge.startsAt.toISOString(),
    status: challengeStatus(challenge),
  };
}
