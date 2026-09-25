import { apiRequest } from '@/src/services/api';
import { storage, storageKeys } from '@/src/services/storage';
import type {
  AiDocument,
  AiMeasurementsReading,
  AiMonthlySummaryResponse,
  AiPreferences,
  AiStatus,
  AiWeeklyPlan,
  AiWeeklyPlanResponse,
} from '@/src/types/ai';

// Fase 6: as chamadas das recomendações com IA. Precisam do consentimento da IA (setAiConsent, em
// services/auth.ts). Respostas de erro que a tela deve tratar sem susto:
// - 503 IA_NAO_CONFIGURADA: o servidor ainda não tem a chave; mostre só as recomendações por regras;
// - 403 CONSENT_REQUIRED: falta o consentimento (da IA, ou o das medidas na leitura das medidas);
// - 429 AI_CAP: o teto do mês foi atingido; 429 AI_DAILY_LIMIT: já saiu um plano hoje.
// Gerar leva alguns segundos (às vezes mais de 30): por isso o tempo de espera é maior aqui.

const AI_TIMEOUT = 120000;

type SavedWeeklyPlan = { plan: AiWeeklyPlan; savedAt: number };

// O último plano da semana que chegou fica no aparelho: o cartão do Treino, a tela de Recomendações e os
// alvos da sessão seguem sem internet. É só uma cópia, e cada plano novo troca esta.
async function savePlanCopy(userId: string | undefined, response: AiWeeklyPlanResponse) {
  if (!userId || response.status !== 'ok' || !response.content) {
    return;
  }

  const saved: SavedWeeklyPlan = { plan: response.content, savedAt: Date.now() };
  await storage.set(storageKeys.aiWeeklyPlan(userId), JSON.stringify(saved));
}

/** A cópia do plano da semana guardada no aparelho, ou null. */
export async function readSavedWeeklyPlan(userId: string): Promise<AiWeeklyPlan | null> {
  try {
    const stored = await storage.get(storageKeys.aiWeeklyPlan(userId));
    const plan = stored ? (JSON.parse(stored) as Partial<SavedWeeklyPlan>).plan : undefined;

    return plan && typeof plan.weekKey === 'string' && Array.isArray(plan.days) ? plan : null;
  } catch {
    // Cópia corrompida vale como nenhuma; o próximo plano que chegar a substitui.
    return null;
  }
}

/** Sem o consentimento da IA, a cópia sai do aparelho, como o plano sai do servidor. */
export async function forgetSavedWeeklyPlan(userId: string) {
  await storage.remove(storageKeys.aiWeeklyPlan(userId));
}

export function getAiStatus(token: string) {
  return apiRequest<AiStatus>('/ai/status', { token });
}

/** Manda as escolhas de treino do aparelho, para a IA respeitar (também no plano gerado de madrugada). */
export async function saveAiPreferences(token: string, preferences: AiPreferences) {
  await apiRequest('/ai/preferences', { body: preferences, method: 'PUT', token });
}

/** O plano desta semana: gerado na primeira abertura e guardado. Com `userId`, fica uma cópia no aparelho. */
export async function getWeeklyPlan(token: string, userId?: string) {
  const response = await apiRequest<AiWeeklyPlanResponse>('/ai/weekly-plan', { timeoutMs: AI_TIMEOUT, token });
  await savePlanCopy(userId, response);

  return response;
}

/** Pede outro plano para esta semana (no máximo um por dia). Com `userId`, a cópia do aparelho troca junto. */
export async function regenerateWeeklyPlan(token: string, userId?: string) {
  const response = await apiRequest<AiWeeklyPlanResponse>('/ai/weekly-plan/regenerate', {
    method: 'POST',
    timeoutMs: AI_TIMEOUT,
    token,
  });
  await savePlanCopy(userId, response);

  return response;
}

/** O resumo de um mês fechado (AAAA-MM). Sem mês, o anterior. */
export function getMonthlySummary(token: string, month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';

  return apiRequest<AiMonthlySummaryResponse>(`/ai/monthly-summary${query}`, { timeoutMs: AI_TIMEOUT, token });
}

/** A leitura das medidas guardadas na conta (precisa também do consentimento das medidas). */
export function getMeasurementsReading(token: string) {
  return apiRequest<AiDocument<AiMeasurementsReading>>('/ai/measurements-reading', { timeoutMs: AI_TIMEOUT, token });
}
