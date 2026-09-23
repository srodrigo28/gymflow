import { apiRequest } from '@/src/services/api';

export type AdminMetrics = {
  // Até esse número de cadastros o app é 100% grátis (22-estrategia.md, seção 5.1).
  freeUntilUsers: number;
  generatedAt: string;
  users: { activeThisWeek: number; newThisWeek: number; total: number };
  workouts: { finishedThisWeek: number };
};

export function getAdminMetrics(token: string) {
  return apiRequest<AdminMetrics>('/admin/metrics', { token });
}
