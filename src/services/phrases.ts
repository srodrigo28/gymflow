import { phrases } from '@/src/constants/phrases';
import { storage, storageKeys } from '@/src/services/storage';
import type { PersonalPhrase } from '@/src/types/phrases';

export const PERSONAL_PHRASE_MAX_LENGTH = 140;

const DAY_MS = 86_400_000;

// Dias desde 1970 no calendário do aparelho. Vai por ano/mês/dia (e não pelo timestamp dividido
// por 24h) para a frase virar exatamente à meia-noite local, também nos dias de horário de verão.
function localDayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/** A mesma frase o dia inteiro e outra no dia seguinte, sem depender de nada salvo. */
export function getPhraseOfTheDay(date = new Date()) {
  return phrases[localDayNumber(date) % phrases.length];
}

/** Uma frase da lista diferente da atual, para o botão "Outra frase". */
export function pickAnotherPhrase(current: string) {
  const options = phrases.filter((phrase) => phrase !== current);

  return options[Math.floor(Math.random() * options.length)] ?? current;
}

// Tira espaços sobrando e quebras de linha: a frase aparece numa linha só, no cartão e na
// mensagem compartilhada.
export function normalizePhrase(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, PERSONAL_PHRASE_MAX_LENGTH);
}

export async function getPersonalPhrase(userId: string): Promise<PersonalPhrase | null> {
  const raw = await storage.get(storageKeys.personalPhrase(userId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersonalPhrase> | null;

    if (typeof parsed?.text !== 'string' || typeof parsed.savedAt !== 'number' || !parsed.text.trim()) {
      return null;
    }

    return { savedAt: parsed.savedAt, text: parsed.text };
  } catch {
    // Valor corrompido vale como frase nenhuma; a próxima gravação corrige.
    return null;
  }
}

export async function savePersonalPhrase(userId: string, text: string) {
  const normalized = normalizePhrase(text);

  if (!normalized) {
    throw new Error('Escreva uma frase antes de guardar.');
  }

  const phrase: PersonalPhrase = { savedAt: Date.now(), text: normalized };
  await storage.set(storageKeys.personalPhrase(userId), JSON.stringify(phrase));

  return phrase;
}

export async function removePersonalPhrase(userId: string) {
  await storage.remove(storageKeys.personalPhrase(userId));
}

/** Texto que vai para a folha de compartilhamento. */
export function phraseShareMessage(text: string) {
  return `${text}\n\n— Gyn Flow`;
}
