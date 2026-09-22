// Tamanho medido do palco de cada cena do hero (área do visual, acima do texto).
export type StageSize = { height: number; width: number };

export type SceneProps = {
  // Telas baixas (altura ≤ 700) simplificam o visual.
  isShort: boolean;
  stage: StageSize;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
