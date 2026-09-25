import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type AchievementIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export type Achievement = {
  description: string;
  icon: AchievementIcon;
  id: string;
  /** De 0 a 1. Vale 1 quando desbloqueada. */
  progress: number;
  /** Ex.: "7 de 10 treinos". Só nas conquistas que têm contagem. */
  progressLabel?: string;
  title: string;
  /** Data do evento que desbloqueou (o 5º treino, a 2ª pesagem), não a do cálculo. */
  unlockedAt: number | null;
};
