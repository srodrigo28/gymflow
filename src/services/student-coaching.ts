import type { Href } from 'expo-router';

import { listMyPlans } from '@/src/services/coaching';
import { storage, storageKeys } from '@/src/services/storage';
import type { PlanExercise, TrainingPlan } from '@/src/types/coaching';
import type { SessionExercise } from '@/src/types/training';

// Fase 5, o lado do aluno: a cópia das prescrições neste aparelho, os textos do alvo de cada exercício e
// o caminho do convite de um personal.
//
// Por que a cópia: na academia a internet falha, e o treino do dia (com o alvo de cada exercício na
// sessão) precisa abrir mesmo assim. É só a última lista que veio da API, uma por conta, trocada inteira a
// cada carga; desfazer o vínculo tira na hora as prescrições daquele personal, e apagar a conta apaga tudo.

type SavedPlans = { plans: TrainingPlan[]; savedAt: number };

export type MyPlans = {
  // true: a API não respondeu e a lista é a cópia deste aparelho.
  offline: boolean;
  plans: TrainingPlan[];
  // Quando a lista veio da API.
  savedAt: number;
};

/** A cópia deste aparelho, ou null se a lista nunca foi carregada aqui. */
export async function readSavedPlans(userId: string): Promise<MyPlans | null> {
  const raw = await storage.get(storageKeys.coachingPlans(userId));

  if (!raw) {
    return null;
  }

  try {
    const saved = JSON.parse(raw) as Partial<SavedPlans> | null;

    return saved && Array.isArray(saved.plans) && typeof saved.savedAt === 'number'
      ? { offline: true, plans: saved.plans, savedAt: saved.savedAt }
      : null;
  } catch {
    return null;
  }
}

function savePlans(userId: string, saved: SavedPlans) {
  return storage.set(storageKeys.coachingPlans(userId), JSON.stringify(saved));
}

/** As prescrições ativas, da API, e a lista vira a cópia deste aparelho. Sem resposta, vale a cópia. */
export async function loadMyPlans(token: string, userId: string): Promise<MyPlans> {
  try {
    const plans = await listMyPlans(token);
    const savedAt = Date.now();
    await savePlans(userId, { plans, savedAt });

    return { offline: false, plans, savedAt };
  } catch (error) {
    const saved = await readSavedPlans(userId);

    if (saved) {
      return saved;
    }

    throw error;
  }
}

/** Uma prescrição, da cópia. Se ela chegou depois da última carga, pergunta à API. */
export async function findMyPlan(userId: string, token: string | undefined, planId: string) {
  const saved = await readSavedPlans(userId);
  const found = saved?.plans.find((plan) => plan.id === planId);

  if (found || !token) {
    return found ?? null;
  }

  const fresh = await loadMyPlans(token, userId).catch(() => null);

  return fresh?.plans.find((plan) => plan.id === planId) ?? null;
}

/** Vínculo desfeito: as prescrições daquele personal saem da cópia na hora, como saíram da conta. */
export async function forgetCoachPlans(userId: string, coachId: string) {
  const saved = await readSavedPlans(userId);

  if (!saved) {
    return;
  }

  const plans = saved.plans.filter((plan) => plan.coach.id !== coachId);

  if (plans.length !== saved.plans.length) {
    await savePlans(userId, { plans, savedAt: saved.savedAt });
  }
}

// --- Textos ------------------------------------------------------------------------------------

const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/** O dia da semana como a prescrição conta: 0 = segunda … 6 = domingo. */
export function planWeekday(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

export function weekdayLabel(weekday: number) {
  return weekdays[weekday] ?? '';
}

/** "3 × 8-12", "1 × 30 s". */
export function planTarget(exercise: Pick<PlanExercise, 'reps' | 'sets'>) {
  return `${exercise.sets} × ${exercise.reps}`;
}

/** 45 → "45 s"; 90 → "1 min 30 s"; 120 → "2 min". */
export function restLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (!minutes) {
    return `${rest} s`;
  }

  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Treino A · Força básica, por Bruno". Sem o dia (a prescrição mudou), fica o nome dela. */
export function planHeadline(plan: TrainingPlan, dayIndex?: number) {
  const day = dayIndex === undefined ? undefined : plan.days[dayIndex];

  return `${day ? `${day.title} · ${plan.name}` : plan.name}, por ${firstName(plan.coach.name)}`;
}

/** O CREF sempre com a ressalva: é o que o profissional informou, e o app não confere. */
export function crefLabel(cref: string) {
  return `CREF ${cref} (informado pelo profissional)`;
}

/**
 * O alvo de cada exercício da sessão, pelo id do exercício, na ordem do dia: um exercício que aparece duas
 * vezes na prescrição casa com as duas vezes na sessão. O que a pessoa acrescentou fica sem alvo. Serve
 * também para um dia do plano da IA, que tem os mesmos campos e a carga sugerida.
 */
export function matchPlanTargets<T extends Pick<PlanExercise, 'exerciseId'> = PlanExercise>(
  day: { exercises: T[] } | undefined,
  exercises: SessionExercise[],
) {
  const targets = new Map<string, T>();
  const queues = new Map<string, T[]>();

  for (const item of day?.exercises ?? []) {
    queues.set(item.exerciseId, [...(queues.get(item.exerciseId) ?? []), item]);
  }

  for (const item of exercises) {
    const target = queues.get(item.exercise.id)?.shift();

    if (target) {
      targets.set(item.id, target);
    }
  }

  return targets;
}

// --- Convite -----------------------------------------------------------------------------------

// Rota que ainda não está nos tipos gerados do expo-router (nova nesta rodada).
const route = (path: string) => path as unknown as Href;

/** A tela do convite de um personal: a página pública abre gymflow://personal/convite/CODIGO. */
export function personalInviteHref(code: string) {
  return route(`/personal/convite/${encodeURIComponent(code)}`);
}

/** O código de 8 letras e números a partir do que a pessoa digitou ou colou (o código ou o link inteiro). */
export function inviteCodeFrom(text: string) {
  const fromLink = /convite\/([A-Za-z0-9]{8})(?![A-Za-z0-9])/.exec(text);

  return (fromLink?.[1] ?? text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}
