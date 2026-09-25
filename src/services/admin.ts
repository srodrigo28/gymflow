import { apiRequest } from '@/src/services/api';

// Números brutos: a tela calcula as porcentagens. `base` é de quantas pessoas cada conta sai.
export type StrategyMetrics = {
  // Das pessoas ativas na semana, quantas participam de um desafio em andamento.
  activeChallenge: { base: number; users: number };
  coaches: { links: number; profiles: number; withStudents: number };
  // Contas novas por convite de desafio nos últimos 30 dias e pessoas ativas no mesmo período (fator K).
  invites: { active30d: number; invitedSignups30d: number };
  // Das pessoas ativas na semana, quantas têm foto do mês guardada na conta (um piso).
  monthPhoto: { base: number; month: string; users: number };
  // Retenção contínua: de quem se cadastrou há 7 (ou 30) dias ou mais, quantos voltaram depois do prazo.
  retention: { d30: { eligible: number; returned: number }; d7: { eligible: number; returned: number } };
};

export type AdminMetrics = {
  // Custo estimado da IA no mês (US$), pela tabela de preços do modelo. Opcional: a API antiga não manda.
  ai?: { activeUsers: number; capUsd: number; costPerActiveUserUsd: number; monthCostUsd: number; usersWithAi: number };
  // Até esse número de cadastros o app é 100% grátis (22-estrategia.md, seção 5.1).
  freeUntilUsers: number;
  generatedAt: string;
  // As métricas da seção 6 da estratégia. Opcional: a API antiga não manda.
  strategy?: StrategyMetrics;
  users: { activeThisWeek: number; newThisWeek: number; total: number };
  workouts: { finishedThisWeek: number };
};

export function getAdminMetrics(token: string) {
  return apiRequest<AdminMetrics>('/admin/metrics', { token });
}
