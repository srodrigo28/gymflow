import { apiRequest } from '@/src/services/api';
import type {
  CoachingInvite,
  CoachingInvitePreview,
  CoachingPermissions,
  CoachRanking,
  GymBoard,
  GymNotice,
  MyCoach,
  PlanInput,
  ProfessionalProfile,
  StudentDetail,
  StudentSummary,
  TrainingPlan,
} from '@/src/types/coaching';

// Fase 5: as chamadas do personal, do aluno e do mural da academia. Tudo fala com a API; nada fica no
// aparelho, a não ser o treino que o aluno faz a partir de uma prescrição (ele sobe com planId e planDay).

const enc = encodeURIComponent;

// --- Perfil de personal -------------------------------------------------------------------------

export async function getProfessional(token: string) {
  const { profile } = await apiRequest<{ profile: ProfessionalProfile | null }>('/me/professional', { token });

  return profile;
}

/** Liga ou atualiza o perfil. Sem `slug`, o endereço sai do nome. 409 SLUG_TAKEN se o endereço for de outro. */
export async function saveProfessional(
  token: string,
  input: { bio?: string | null; city?: string | null; cref?: string | null; slug?: string },
) {
  const { profile } = await apiRequest<{ profile: ProfessionalProfile }>('/me/professional', { body: input, method: 'PUT', token });

  return profile;
}

/** Deixar de ser personal: convites, vínculos como personal e prescrições saem juntos. */
export async function deleteProfessional(token: string) {
  await apiRequest('/me/professional', { method: 'DELETE', token });
}

export async function createCoachingInvite(token: string) {
  const { invite } = await apiRequest<{ invite: CoachingInvite }>('/coaching/invites', { method: 'POST', token });

  return invite;
}

/** Texto do convite para o WhatsApp. */
export function coachingInviteMessage(coachName: string, invite: CoachingInvite) {
  return `${coachName} quer acompanhar seus treinos no Gyn Flow. Você escolhe o que compartilha: ${invite.url} (código ${invite.code}, vale 7 dias).`;
}

// --- Aluno -------------------------------------------------------------------------------------

/** Prévia pública do convite: quem convida. */
export async function getCoachingInvite(code: string) {
  const { invite } = await apiRequest<{ invite: CoachingInvitePreview }>(`/invites/personal/${enc(code.trim().toUpperCase())}`);

  return invite;
}

export async function joinCoach(token: string, code: string, permissions: CoachingPermissions) {
  const { link } = await apiRequest<{ link: MyCoach }>('/coaching/join', { body: { code, ...permissions }, method: 'POST', token });

  return link;
}

export async function listMyCoaches(token: string) {
  const { coaches } = await apiRequest<{ coaches: MyCoach[] }>('/me/coaches', { token });

  return coaches;
}

/** Só o aluno: liga ou desliga cada permissão e a vitrine. Desligar corta o acesso do personal na hora. */
export async function updateCoachingLink(token: string, linkId: string, patch: Partial<CoachingPermissions> & { showcase?: boolean }) {
  const { link } = await apiRequest<{ link: MyCoach }>(`/coaching/links/${enc(linkId)}`, { body: patch, method: 'PATCH', token });

  return link;
}

/** Qualquer um dos dois desfaz o vínculo. As prescrições entre eles saem; os treinos do aluno ficam. */
export async function deleteCoachingLink(token: string, linkId: string) {
  await apiRequest(`/coaching/links/${enc(linkId)}`, { method: 'DELETE', token });
}

/** O depoimento do aluno (10 a 500 caracteres). Só aparece na página depois que o personal aprova. */
export async function saveTestimonial(token: string, linkId: string, text: string) {
  const { link } = await apiRequest<{ link: MyCoach }>(`/coaching/links/${enc(linkId)}/testimonial`, {
    body: { text },
    method: 'PUT',
    token,
  });

  return link;
}

export async function deleteTestimonial(token: string, linkId: string) {
  const { link } = await apiRequest<{ link: MyCoach }>(`/coaching/links/${enc(linkId)}/testimonial`, { method: 'DELETE', token });

  return link;
}

/** As prescrições ativas que o aluno recebeu. */
export async function listMyPlans(token: string) {
  const { plans } = await apiRequest<{ plans: TrainingPlan[] }>('/me/plans', { token });

  return plans;
}

// --- Personal ----------------------------------------------------------------------------------

export async function listStudents(token: string) {
  const { students } = await apiRequest<{ students: StudentSummary[] }>('/coaching/students', { token });

  return students;
}

export function getStudent(token: string, studentId: string) {
  return apiRequest<StudentDetail>(`/coaching/students/${enc(studentId)}`, { token });
}

/**
 * Aprova o depoimento com o texto que o personal leu. Se o aluno trocou o texto nesse meio tempo, a API
 * responde 409 (TESTIMONIAL_CHANGED) e nada muda: a tela recarrega e mostra o texto novo.
 */
export async function approveTestimonial(token: string, linkId: string, text: string) {
  await apiRequest(`/coaching/links/${enc(linkId)}/testimonial/approve`, { body: { text }, method: 'POST', token });
}

export async function listPlans(token: string, studentId?: string) {
  const query = studentId ? `?studentId=${enc(studentId)}` : '';
  const { plans } = await apiRequest<{ plans: TrainingPlan[] }>(`/coaching/plans${query}`, { token });

  return plans;
}

export async function createPlan(token: string, studentId: string, input: PlanInput) {
  const { plan } = await apiRequest<{ plan: TrainingPlan }>('/coaching/plans', { body: { ...input, studentId }, method: 'POST', token });

  return plan;
}

export async function updatePlan(token: string, planId: string, input: PlanInput) {
  const { plan } = await apiRequest<{ plan: TrainingPlan }>(`/coaching/plans/${enc(planId)}`, { body: input, method: 'PUT', token });

  return plan;
}

export async function deletePlan(token: string, planId: string) {
  await apiRequest(`/coaching/plans/${enc(planId)}`, { method: 'DELETE', token });
}

export function getCoachRanking(token: string) {
  return apiRequest<CoachRanking>('/coaching/ranking', { token });
}

// --- Academia ----------------------------------------------------------------------------------

export function getGymBoard(token: string, gymId: string) {
  return apiRequest<GymBoard>(`/gyms/${enc(gymId)}/board`, { token });
}

/** Só o responsável pelo mural publica (403 NOT_GYM_OWNER para os outros). */
export async function createGymNotice(token: string, gymId: string, input: { body: string; title: string }) {
  const { notice } = await apiRequest<{ notice: GymNotice }>(`/gyms/${enc(gymId)}/notices`, { body: input, method: 'POST', token });

  return notice;
}

export async function deleteGymNotice(token: string, gymId: string, noticeId: string) {
  await apiRequest(`/gyms/${enc(gymId)}/notices/${enc(noticeId)}`, { method: 'DELETE', token });
}

/** Aparecer (ou não) no ranking da academia. */
export async function setGymRanking(token: string, show: boolean) {
  const { show: saved } = await apiRequest<{ show: boolean }>('/me/gym-ranking', { body: { show }, method: 'PUT', token });

  return saved;
}
