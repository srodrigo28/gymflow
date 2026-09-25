import { apiRequest } from '@/src/services/api';
import type {
  AiDocument,
  AiMeasurementsReading,
  AiMonthlySummaryResponse,
  AiPreferences,
  AiStatus,
  AiWeeklyPlanResponse,
} from '@/src/types/ai';

// Fase 6: as chamadas das recomendações com IA. Precisam do consentimento da IA (setAiConsent, em
// services/auth.ts). Respostas de erro que a tela deve tratar sem susto:
// - 503 IA_NAO_CONFIGURADA: o servidor ainda não tem a chave; mostre só as recomendações por regras;
// - 403 CONSENT_REQUIRED: falta o consentimento (da IA, ou o das medidas na leitura das medidas);
// - 429 AI_CAP: o teto do mês foi atingido; 429 AI_DAILY_LIMIT: já saiu um plano hoje.
// Gerar leva alguns segundos (às vezes mais de 30): por isso o tempo de espera é maior aqui.

const AI_TIMEOUT = 120000;

export function getAiStatus(token: string) {
  return apiRequest<AiStatus>('/ai/status', { token });
}

/** Manda as escolhas de treino do aparelho, para a IA respeitar (também no plano gerado de madrugada). */
export async function saveAiPreferences(token: string, preferences: AiPreferences) {
  await apiRequest('/ai/preferences', { body: preferences, method: 'PUT', token });
}

/** O plano desta semana: gerado na primeira abertura e guardado. */
export function getWeeklyPlan(token: string) {
  return apiRequest<AiWeeklyPlanResponse>('/ai/weekly-plan', { timeoutMs: AI_TIMEOUT, token });
}

/** Pede outro plano para esta semana (no máximo um por dia). */
export function regenerateWeeklyPlan(token: string) {
  return apiRequest<AiWeeklyPlanResponse>('/ai/weekly-plan/regenerate', { method: 'POST', timeoutMs: AI_TIMEOUT, token });
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
