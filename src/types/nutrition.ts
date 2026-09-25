/** Refeições do dia, na ordem em que costumam acontecer. */
export type MealType = 'cafe' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';

/** Como a pessoa se sentiu depois de comer. Opcional: é uma percepção, não uma nota. */
export type MealFeeling = 'leve' | 'satisfeito' | 'pesado';

export type Meal = {
  createdAt: number;
  /** Dia da refeição no formato `AAAA-MM-DD`, no fuso do aparelho: é por ele que o diário agrupa. */
  date: string;
  /** Texto livre, do jeito da pessoa (até 120 caracteres). */
  description: string;
  feeling?: MealFeeling;
  id: string;
  type: MealType;
};

/** Um dia do diário: refeições na ordem do dia e copos de água. */
export type NutritionDay = {
  date: string;
  meals: Meal[];
  waterGlasses: number;
};

export type EatingStyleId =
  | 'equilibrada'
  | 'mais_proteina'
  | 'menos_acucar'
  | 'vegetariana'
  | 'mediterranea'
  | 'pratica';

/** Uma troca prática ("refrigerante → água com gás e limão"), em duas partes para o leitor de tela. */
export type EatingSwap = {
  from: string;
  to: string;
};

export type EatingStyle = {
  /** Um dia de exemplo, uma linha por refeição. Sem calorias: é ideia, não cardápio. */
  dayExample: {
    almoco: string;
    cafe: string;
    jantar: string;
    lanche: string;
  };
  id: EatingStyleId;
  /** Uma frase. */
  summary: string;
  swaps: EatingSwap[];
  title: string;
  /** Quando esse jeito de comer faz sentido. */
  whenItFits: string;
};

/** Estilo em destaque a partir do questionário, com o motivo em uma linha. */
export type EatingStyleSuggestion = {
  id: EatingStyleId;
  reason: string;
};
