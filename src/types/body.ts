export type Pose = 'frente' | 'lado' | 'costas';

/** Uma pesagem/medição. Todos os campos são opcionais menos a data: ninguém vai
 * medir sete circunferências toda semana, e exigir isso faria a pessoa desistir. */
export type Measurement = {
  armCm?: number;
  bodyFatPct?: number;
  chestCm?: number;
  hipCm?: number;
  id: string;
  note?: string;
  takenAt: number;
  thighCm?: number;
  waistCm?: number;
  weightKg?: number;
};

export type MeasurementField = 'weightKg' | 'bodyFatPct' | 'waistCm' | 'hipCm' | 'chestCm' | 'armCm' | 'thighCm';

export type ProgressPhoto = {
  createdAt: number;
  id: string;
  /** Mês de referência no formato `AAAA-MM`: é por ele que a linha do tempo agrupa. */
  month: string;
  note?: string;
  pose: Pose;
  takenAt: number;
  uri: string;
};

export type BodyTrend = {
  /** Diferença entre a primeira e a última medição, quando há as duas. */
  deltaKg?: number;
  first?: Measurement;
  latest?: Measurement;
  measurementCount: number;
};
