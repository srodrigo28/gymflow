import { apiRequest, apiUpload, formFile } from '@/src/services/api';
import type { Challenge, ChallengeCheckin, ChallengeCheckinDay, ChallengeSummary, InvitePreview, Standing } from '@/src/types/challenges';

export type ChallengeDays = 7 | 14 | 30;

export async function listChallenges(token: string) {
  const { challenges } = await apiRequest<{ challenges: ChallengeSummary[] }>('/challenges', { token });
  return challenges;
}

export async function createChallenge(token: string, name: string, days: ChallengeDays) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { challenge } = await apiRequest<{ challenge: ChallengeSummary }>('/challenges', {
    // Começa à meia-noite de hoje no fuso do aparelho: o treino de hoje cedo já vale.
    body: {
      days,
      name,
      startsAt: startOfToday.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    method: 'POST',
    token,
  });

  return challenge;
}

export async function getChallenge(token: string, id: string) {
  return apiRequest<{ challenge: Challenge; leaderboard: Standing[] }>(`/challenges/${encodeURIComponent(id)}`, {
    token,
  });
}

export async function joinChallenge(token: string, code: string) {
  const { challengeId } = await apiRequest<{ challengeId: string }>('/challenges/join', {
    body: { code },
    method: 'POST',
    token,
  });

  return challengeId;
}

export async function leaveChallenge(token: string, id: string) {
  await apiRequest(`/challenges/${encodeURIComponent(id)}/membership`, { method: 'DELETE', token });
}

// Pública: funciona antes de a pessoa ter conta.
export async function getInvite(code: string) {
  const { invite } = await apiRequest<{ invite: InvitePreview }>(`/invites/${encodeURIComponent(code)}`);
  return invite;
}

// Mensagem pronta para o WhatsApp: o link abre a página do convite, que abre o app.
export function inviteMessage(challenge: Pick<Challenge, 'days' | 'inviteCode' | 'inviteUrl' | 'name'>) {
  return [
    `Bora treinar junto? Entra no meu desafio "${challenge.name}" no Gyn Flow: ${challenge.days} dias, e cada dia com treino vale um ponto.`,
    challenge.inviteUrl,
    `Código do convite: ${challenge.inviteCode}`,
  ].join('\n\n');
}

// "faltam 3 dias", "último dia", "começa amanhã", "terminou".
export function challengeTiming(challenge: Pick<Challenge, 'endsAt' | 'startsAt' | 'status'>, now = Date.now()) {
  const DAY = 24 * 60 * 60 * 1000;

  if (challenge.status === 'ended') {
    return 'Terminou';
  }

  if (challenge.status === 'upcoming') {
    const days = Math.ceil((Date.parse(challenge.startsAt) - now) / DAY);
    return days <= 1 ? 'Começa amanhã' : `Começa em ${days} dias`;
  }

  const left = Math.ceil((Date.parse(challenge.endsAt) - now) / DAY);
  return left <= 1 ? 'Último dia' : `Faltam ${left} dias`;
}

/** Os check-ins com foto de um dia do desafio (AAAA-MM-DD, no fuso dele). Sem dia, hoje. */
export function listChallengeCheckins(token: string, challengeId: string, day?: string) {
  const query = day ? `?day=${encodeURIComponent(day)}` : '';

  return apiRequest<ChallengeCheckinDay>(`/challenges/${encodeURIComponent(challengeId)}/checkins${query}`, { token });
}

/** Check-in com foto de hoje (um por dia). A foto vai em JPEG; a legenda tem até 140 caracteres. */
export async function sendChallengeCheckin(token: string, challengeId: string, input: { caption?: string; uri: string }) {
  const form = new FormData();
  form.append('photo', formFile(input.uri));

  if (input.caption?.trim()) {
    form.append('caption', input.caption.trim());
  }

  const { checkin } = await apiUpload<{ checkin: ChallengeCheckin }>(
    `/challenges/${encodeURIComponent(challengeId)}/checkins`,
    form,
    { token },
  );

  return checkin;
}

/** Apaga o meu check-in (a foto sai do servidor). */
export async function deleteChallengeCheckin(token: string, challengeId: string, checkinId: string) {
  await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/checkins/${encodeURIComponent(checkinId)}`, {
    method: 'DELETE',
    token,
  });
}

/**
 * Ocultar o check-in de outra pessoa: quem criou o desafio oculta na hora; os outros participantes
 * somam pedidos, e com 2 ele some para todos e o dia deixa de contar.
 */
export async function hideChallengeCheckin(token: string, challengeId: string, checkinId: string) {
  const { checkin } = await apiRequest<{ checkin: ChallengeCheckin }>(
    `/challenges/${encodeURIComponent(challengeId)}/checkins/${encodeURIComponent(checkinId)}/hide`,
    { method: 'POST', token },
  );

  return checkin;
}
