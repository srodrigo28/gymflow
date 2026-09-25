import type { Modality } from '@/src/types/training';

// Modalidades do catálogo, na ordem em que aparecem na escolha de exercícios. O ícone é do
// MaterialCommunityIcons. Musculação fica fora do pódio de modalidades da temporada (a API ignora).
export const modalities: { description: string; icon: string; id: Modality; label: string }[] = [
  { description: 'Carga e repetições, por grupo muscular.', icon: 'dumbbell', id: 'musculacao', label: 'Musculação' },
  { description: 'Esteira, rua e caminhada: tempo e distância.', icon: 'run', id: 'corrida', label: 'Corrida e caminhada' },
  { description: 'Bicicleta e spinning: tempo e distância.', icon: 'bike', id: 'bike', label: 'Bike' },
  { description: 'Piscina: tempo e distância.', icon: 'swim', id: 'natacao', label: 'Natação' },
  { description: 'Circuitos e movimentos com o corpo todo.', icon: 'kettlebell', id: 'funcional', label: 'Funcional' },
  { description: 'Boxe, muay thai, jiu-jitsu: tempo de treino.', icon: 'boxing-glove', id: 'luta', label: 'Luta' },
  { description: 'Tempo de prática.', icon: 'yoga', id: 'yoga', label: 'Yoga' },
  { description: 'Alongamento, mobilidade e pilates: tempo.', icon: 'human-handsup', id: 'mobilidade', label: 'Mobilidade' },
  { description: 'Elíptico, escada e remo: tempo e distância.', icon: 'heart-pulse', id: 'cardio', label: 'Cardio na academia' },
];

export const modalityLabels = Object.fromEntries(modalities.map((item) => [item.id, item.label])) as Record<Modality, string>;
