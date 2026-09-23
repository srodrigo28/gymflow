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
