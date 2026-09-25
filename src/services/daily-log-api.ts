import { apiRequest } from '@/src/services/api';
import type { DailyLogPage, DailyLogPush, DailyLogSyncResult } from '@/src/types/daily-log';

// As chamadas do diário do dia à API. Precisam do consentimento (PUT /me/consents/daily-log, em
// setDailyLogConsent do services/auth.ts): sem ele, a API responde 403 CONSENT_REQUIRED.

/** Um copo da Alimentação, em ml, na hora de subir a água do dia. */
export const GLASS_ML = 250;

/** Sobe até 50 dias de uma vez. Cada dia é validado sozinho: um inválido volta em `invalid` e sai da fila. */
export function pushDailyLogs(token: string, logs: DailyLogPush[]) {
  return apiRequest<DailyLogSyncResult>('/sync/daily-logs', { body: { logs }, method: 'POST', token });
}

/** Uma página dos registros da conta, em ordem de dia. `after`: o `nextCursor` da página anterior. */
export function pullDailyLogs(token: string, after?: string, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit) });

  if (after) {
    query.set('after', after);
  }

  return apiRequest<DailyLogPage>(`/sync/daily-logs?${query.toString()}`, { token });
}
