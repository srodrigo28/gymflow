import type { Modality } from '@/src/types/training';

// Fase 6, recomendações com IA (22-estrategia.md, seção 2.5, Estágio 3): o formato das respostas da API.
// A IA sugere e explica; as regras do servidor conferem cada resposta antes de ela chegar aqui. Quando a
// resposta é descartada (`status: 'rejected'`), o app segue com as recomendações por regras do aparelho.

export type AiStatus = {
  // Teto de custo por pessoa por mês (US$).
  capUsd: number;
  // A IA está ligada no servidor (tem a chave da Anthropic).
  configured: boolean;
  consentAt: string | null;
  model: string;
  // Custo estimado da pessoa no mês (US$).
  spentUsd: number;
};

// ok: tem conteúdo; rejected: a resposta não passou nas regras (veja `reason` e `message`); empty: ainda
// não há o que gerar (sem treino no mês, menos de duas medidas…), com `message` pronta para a tela.
export type AiDocumentStatus = 'ok' | 'rejected' | 'empty';

export type AiDocument<T> = {
  content: T | null;
  generatedAt: string | null;
  message: string | null;
  reason: string | null;
  status: AiDocumentStatus;
};

export type AiPlanExercise = {
  exerciseId: string;
  kind: string;
  modality: Modality;
  muscle: string;
  name: string;
  note: string | null;
  // Repetições alvo como texto ("8-12"; em cardio e tempo, a duração, como "20 min").
  reps: string;
  restSec: number | null;
  sets: number;
  // Só em exercício com histórico, e no máximo 10% ou 5 kg acima da melhor carga recente. null: sem carga.
  targetWeightKg: number | null;
};

export type AiPlanDay = {
  exercises: AiPlanExercise[];
  focus: string;
  title: string;
  // 0 = segunda … 6 = domingo.
  weekday: number;
  // "Por que esse treino?", em linguagem simples.
  why: string;
};

export type AiWeeklyPlan = {
  days: AiPlanDay[];
  safetyNotes: string[];
  summary: string;
  // Segunda-feira da semana (AAAA-MM-DD).
  weekKey: string;
};

export type AiWeeklyPlanResponse = AiDocument<AiWeeklyPlan> & {
  // Dá para pedir outro plano hoje (um por dia).
  canRegenerate: boolean;
};

export type AiMonthlySummary = { highlights: string[]; nextFocus: string; text: string; title: string };

export type AiMonthlySummaryResponse = AiDocument<AiMonthlySummary> & { month?: string };

export type AiMeasurementsReading = {
  notes: string[];
  text: string;
  trend: 'descendo' | 'estavel' | 'subindo' | 'sem_dados';
};

// As escolhas de treino que o app guarda no aparelho, mandadas para a IA respeitar.
export type AiPreferences = {
  categories?: string[];
  equipment?: string[];
  focusMuscles?: string[];
  location?: string | null;
};
