export type ChallengeStatus = 'upcoming' | 'active' | 'ended';

export type Challenge = {
  days: number;
  endsAt: string;
  id: string;
  inviteCode: string;
  // Link http(s) da página do convite: é o que vai no WhatsApp.
  inviteUrl: string;
  isOwner: boolean;
  memberCount: number;
  name: string;
  startsAt: string;
  status: ChallengeStatus;
  timezone: string;
};

export type ChallengeSummary = Challenge & {
  myPoints: number;
  myRank: number | null;
};

export type Standing = {
  isMe: boolean;
  name: string;
  points: number;
  rank: number;
  userId: string;
};

export type InvitePreview = {
  code: string;
  days: number;
  endsAt: string;
  memberCount: number;
  name: string;
  ownerFirstName: string | null;
  startsAt: string;
  status: ChallengeStatus;
};

// Check-in com foto num desafio (Fase 3, 22-estrategia.md seção 3.4): um por pessoa por dia, no fuso do
// desafio, visível só para quem participa. O dia com check-in conta no placar como um dia com treino. O
// grupo modera: quem criou o desafio, ou dois participantes, ocultam para todos, e o dia deixa de contar.
export type ChallengeCheckin = {
  caption: string | null;
  createdAt: string;
  // O dia do check-in (AAAA-MM-DD), no fuso do desafio.
  day: string;
  // URLs assinadas (10 minutos). null quando oculto.
  expiresAt: string | null;
  // Quantas pessoas pediram para ocultar (a partir de 2, fica oculto).
  flags: number;
  flaggedByMe: boolean;
  // Oculto pelo grupo. Só o autor recebe um check-in oculto, e sem a foto.
  hidden: boolean;
  id: string;
  isMine: boolean;
  name: string;
  thumbUrl: string | null;
  url: string | null;
  userId: string;
};

export type ChallengeCheckinDay = {
  // Eu criei o desafio: oculto na hora. Os outros participantes somam pedidos.
  canHide: boolean;
  checkins: ChallengeCheckin[];
  day: string;
  // O meu check-in com foto deste dia, se já fiz.
  mine: ChallengeCheckin | null;
};
