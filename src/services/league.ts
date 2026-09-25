import { apiRequest } from '@/src/services/api';
import type {
  AdminGym,
  Award,
  DotsFormula,
  LeagueOverview,
  LeagueTier,
  Season,
  ServerCheckin,
  ServerGym,
  StrengthProfile,
  WeeklyGoal,
  XpSummary,
} from '@/src/types/league';

// Fase 4: XP, ligas semanais, temporada entre amigos, força relativa (DOTS), academia e check-in
// verificados pelo servidor, troféus e selos. Tudo aqui fala com a API; nada fica no aparelho.

export const tierLabels: Record<LeagueTier, string> = {
  bronze: 'Bronze',
  elite: 'Elite',
  ouro: 'Ouro',
  prata: 'Prata',
};

const TIER_ORDER: LeagueTier[] = ['bronze', 'prata', 'ouro', 'elite'];

/** 0 (Bronze) a 3 (Elite): serve para comparar ligas e escolher a cor da insígnia. */
export function tierIndex(tier: LeagueTier) {
  return TIER_ORDER.indexOf(tier);
}

const xpFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** 1234 → "1.234 XP". */
export function formatXp(xp: number) {
  return `${xpFormatter.format(Math.round(xp))} XP`;
}

export function getXpSummary(token: string) {
  return apiRequest<XpSummary>('/xp', { token });
}

/** A primeira escolha vale já; as seguintes, a partir da próxima semana. */
export async function setWeeklyGoal(token: string, days: number) {
  const { goal } = await apiRequest<{ goal: WeeklyGoal }>('/me/weekly-goal', { body: { days }, method: 'PUT', token });

  return goal;
}

export async function setLeagueParticipation(token: string, participate: boolean) {
  const result = await apiRequest<{ participate: boolean }>('/me/league', {
    body: { participate },
    method: 'PUT',
    token,
  });

  return result.participate;
}

export function getLeague(token: string) {
  return apiRequest<LeagueOverview>('/leagues/current', { token });
}

/** Temporada de um mês (AAAA-MM). Sem mês, a atual. */
export function getSeason(token: string, month?: string) {
  return apiRequest<Season>(`/season${month ? `?month=${encodeURIComponent(month)}` : ''}`, { token });
}

/**
 * Mostrar (ou não) tonelagem, evolução e cardio aos amigos na temporada. Desligado, a pessoa some
 * dessas três categorias para os outros e deixa de ver os amigos nelas.
 */
export async function setSeasonSharing(token: string, share: boolean) {
  const result = await apiRequest<{ share: boolean }>('/me/season-sharing', { body: { share }, method: 'PUT', token });

  return result.share;
}

export async function listAwards(token: string) {
  const { awards } = await apiRequest<{ awards: Award[] }>('/awards', { token });

  return awards;
}

export async function getStrengthProfile(token: string) {
  const { profile } = await apiRequest<{ profile: StrengthProfile | null }>('/me/strength-profile', { token });

  return profile;
}

/** Entrar (ou atualizar o peso) no ranking de força relativa. É o consentimento: só com ação da pessoa. */
export async function saveStrengthProfile(token: string, input: { bodyweightKg: number; formula: DotsFormula }) {
  const { profile } = await apiRequest<{ profile: StrengthProfile }>('/me/strength-profile', {
    body: input,
    method: 'PUT',
    token,
  });

  return profile;
}

/** Sair do ranking de força: o peso e a fórmula são apagados da conta. */
export async function deleteStrengthProfile(token: string) {
  await apiRequest('/me/strength-profile', { method: 'DELETE', token });
}

export async function getServerGym(token: string) {
  const { gym } = await apiRequest<{ gym: ServerGym | null }>('/me/gym', { token });

  return gym;
}

/**
 * Marca a academia na conta. Se já existir uma academia marcada a até 100 m, a pessoa é ligada a ela
 * (`linked: 'joined'`) e o nome dela vale; senão, nasce uma nova (`linked: 'created'`).
 */
export function saveServerGym(token: string, input: { latitude: number; longitude: number; name: string }) {
  return apiRequest<{ gym: ServerGym; linked: 'created' | 'joined' }>('/me/gym', { body: input, method: 'PUT', token });
}

export async function clearServerGym(token: string) {
  await apiRequest('/me/gym', { method: 'DELETE', token });
}

/**
 * Check-in de hoje na conta. A posição vai só nesta chamada, para o servidor conferir a distância; ela
 * não fica guardada. Um por dia: repetir no mesmo dia só melhora um check-in que ficou fora do raio.
 */
export async function sendCheckin(token: string, input: { accuracyM?: number; latitude: number; longitude: number }) {
  const { checkin } = await apiRequest<{ checkin: ServerCheckin }>('/checkins', { body: input, method: 'POST', token });

  return checkin;
}

export async function listServerCheckins(token: string, limit = 30) {
  const { checkins } = await apiRequest<{ checkins: ServerCheckin[] }>(`/checkins?limit=${limit}`, { token });

  return checkins;
}

export async function listAdminGyms(token: string) {
  const { gyms } = await apiRequest<{ gyms: AdminGym[] }>('/admin/gyms', { token });

  return gyms;
}

/** Só administradores: confirmar (ou desfazer) uma academia para os check-ins nela valerem como verificados. */
export async function setGymConfirmation(token: string, id: string, confirmed: boolean) {
  const { gym } = await apiRequest<{ gym: AdminGym }>(`/admin/gyms/${encodeURIComponent(id)}/confirmation`, {
    method: confirmed ? 'POST' : 'DELETE',
    token,
  });

  return gym;
}
