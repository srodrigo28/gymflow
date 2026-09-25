import { isEatingStyleId } from '@/src/constants/eating-styles';
import { mealTypes } from '@/src/constants/meals';
import { createId } from '@/src/db/client';
import { storage, storageKeys } from '@/src/services/storage';
import type { EatingStyleId, Meal, NutritionDay } from '@/src/types/nutrition';
import { dayKey, shiftDayKey } from '@/src/utils/format';

/** Meta padrão de copos por dia. É um lembrete, não uma prescrição. */
export const WATER_GOAL = 8;
// Acima disso é quase sempre toque repetido, não água.
const WATER_MAX = 20;
export const MEAL_DESCRIPTION_MAX = 120;

// O diário inteiro fica numa chave só por conta, como as respostas do questionário. É pouco dado
// (algumas linhas por dia) e assim uma leitura resolve a tela toda. Não sobe para a API.
type Diary = {
  meals: Meal[];
  /** Copos por dia (`AAAA-MM-DD`). Dias sem registro não aparecem. */
  water: Record<string, number>;
};

const mealOrder = new Map(mealTypes.map((item, index) => [item.value, index]));

// Escritas em fila: dois toques rápidos no "+" da água leriam o mesmo valor e um deles se perderia.
let pendingWrite: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = pendingWrite.then(task, task);
  pendingWrite = run.catch(() => undefined);

  return run;
}

async function readDiary(userId: string): Promise<Diary> {
  const stored = await storage.get(storageKeys.nutritionDiary(userId));

  if (!stored) {
    return { meals: [], water: {} };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Diary>;

    return {
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      water: parsed.water && typeof parsed.water === 'object' ? parsed.water : {},
    };
  } catch {
    // Conteúdo ilegível: melhor recomeçar o diário do que travar a tela.
    return { meals: [], water: {} };
  }
}

function writeDiary(userId: string, diary: Diary) {
  return storage.set(storageKeys.nutritionDiary(userId), JSON.stringify(diary));
}

/** Refeições na ordem do dia (café primeiro, ceia por último), não na ordem em que foram anotadas. */
export function sortMeals(meals: Meal[]) {
  return [...meals].sort(
    (a, b) => (mealOrder.get(a.type) ?? 0) - (mealOrder.get(b.type) ?? 0) || a.createdAt - b.createdAt,
  );
}

function buildDay(diary: Diary, date: string): NutritionDay {
  return {
    date,
    meals: sortMeals(diary.meals.filter((meal) => meal.date === date)),
    waterGlasses: diary.water[date] ?? 0,
  };
}

function mealSignature(meal: Pick<Meal, 'description' | 'type'>) {
  return `${meal.type}:${meal.description.trim().toLowerCase()}`;
}

export async function getNutritionDay(userId: string, date = dayKey()) {
  return buildDay(await readDiary(userId), date);
}

/** Os `days` dias anteriores a `before`, do mais recente para o mais antigo. Dias vazios entram também. */
export async function getPreviousNutritionDays(userId: string, days = 7, before = dayKey()) {
  const diary = await readDiary(userId);

  return Array.from({ length: days }, (_, index) => buildDay(diary, shiftDayKey(before, -(index + 1))));
}

export function addMeal(userId: string, input: Pick<Meal, 'date' | 'description' | 'feeling' | 'type'>) {
  return enqueue(async () => {
    const diary = await readDiary(userId);
    const meal: Meal = {
      createdAt: Date.now(),
      date: input.date,
      description: input.description.trim().slice(0, MEAL_DESCRIPTION_MAX),
      feeling: input.feeling,
      id: createId(),
      type: input.type,
    };

    await writeDiary(userId, { ...diary, meals: [...diary.meals, meal] });

    return meal;
  });
}

export function deleteMeal(userId: string, mealId: string) {
  return enqueue(async () => {
    const diary = await readDiary(userId);

    await writeDiary(userId, { ...diary, meals: diary.meals.filter((meal) => meal.id !== mealId) });
  });
}

/** Soma `delta` copos ao dia, dentro do limite, e devolve o total que ficou. */
export function adjustWaterGlasses(userId: string, date: string, delta: number) {
  return enqueue(async () => {
    const diary = await readDiary(userId);
    const glasses = Math.min(Math.max((diary.water[date] ?? 0) + delta, 0), WATER_MAX);

    await writeDiary(userId, { ...diary, water: { ...diary.water, [date]: glasses } });

    return glasses;
  });
}

/**
 * Copia as refeições de um dia para outro (o "Repetir ontem"). Pula as que já estão lá com o mesmo
 * tipo e texto, então tocar duas vezes não duplica. Devolve quantas foram copiadas.
 */
export function copyMeals(userId: string, fromDate: string, toDate: string) {
  return enqueue(async () => {
    const diary = await readDiary(userId);
    const existing = new Set(diary.meals.filter((meal) => meal.date === toDate).map(mealSignature));
    const now = Date.now();
    const copies = sortMeals(diary.meals.filter((meal) => meal.date === fromDate))
      .filter((meal) => !existing.has(mealSignature(meal)))
      // "Como se sentiu" é do dia em que aconteceu; a cópia começa sem isso.
      .map(
        (meal, index): Meal => ({
          createdAt: now + index,
          date: toDate,
          description: meal.description,
          id: createId(),
          type: meal.type,
        }),
      );

    if (copies.length) {
      await writeDiary(userId, { ...diary, meals: [...diary.meals, ...copies] });
    }

    return copies.length;
  });
}

export async function getEatingStyle(userId: string): Promise<EatingStyleId | null> {
  const stored = await storage.get(storageKeys.eatingStyle(userId));

  return isEatingStyleId(stored) ? stored : null;
}

export async function setEatingStyle(userId: string, id: EatingStyleId | null) {
  if (id) {
    await storage.set(storageKeys.eatingStyle(userId), id);
  } else {
    await storage.remove(storageKeys.eatingStyle(userId));
  }
}
