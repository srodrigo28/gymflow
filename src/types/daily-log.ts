// Diário do dia (22-estrategia.md, seção 3.3, categoria Equilíbrio): sono, água e humor. Sono e humor
// são dado de saúde (LGPD): só sobem para a conta com o consentimento próprio, e retirar apaga tudo do
// servidor. A água é a mesma da Alimentação (copos), convertida em ml na hora de subir.

// 1 = muito mal … 5 = muito bem.
export type Mood = 1 | 2 | 3 | 4 | 5;

export type DailyLog = {
  // O dia (AAAA-MM-DD), no fuso de São Paulo. É a chave: um registro por dia.
  day: string;
  mood: Mood | null;
  sleepMinutes: number | null;
  // Quando o registro mudou no aparelho (ms). A versão mais nova vence.
  updatedAt: number;
  waterMl: number | null;
};

// O que o app manda na fila: o registro do dia ou a marca de apagado.
export type DailyLogPush = DailyLog | { day: string; deleted: true };

export type DailyLogSyncResult = {
  invalid: { day: string; reason: string }[];
  synced: string[];
};

export type DailyLogPage = { logs: DailyLog[]; nextCursor: string | null };
