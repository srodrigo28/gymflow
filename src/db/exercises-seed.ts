import type { Exercise } from '@/src/types/training';

// Catálogo inicial. É semeado na primeira abertura e pode crescer sem migração:
// exercícios novos entram por id, os existentes só têm nome e classificação atualizados.
export const exercisesSeed: Exercise[] = [
  // Peito
  { equipment: 'barra', id: 'supino-reto', kind: 'forca', muscle: 'peito', name: 'Supino reto', pattern: 'empurrar' },
  { equipment: 'halter', id: 'supino-inclinado-halter', kind: 'forca', muscle: 'peito', name: 'Supino inclinado com halteres', pattern: 'empurrar' },
  { equipment: 'máquina', id: 'crucifixo-maquina', kind: 'forca', muscle: 'peito', name: 'Crucifixo na máquina', pattern: 'empurrar' },
  { equipment: 'peso do corpo', id: 'flexao', kind: 'forca', muscle: 'peito', name: 'Flexão de braço', pattern: 'empurrar' },
  { equipment: 'cabo', id: 'crossover', kind: 'forca', muscle: 'peito', name: 'Crossover', pattern: 'empurrar' },

  // Costas
  { equipment: 'máquina', id: 'puxada-frontal', kind: 'forca', muscle: 'costas', name: 'Puxada frontal', pattern: 'puxar' },
  { equipment: 'barra', id: 'remada-curvada', kind: 'forca', muscle: 'costas', name: 'Remada curvada', pattern: 'puxar' },
  { equipment: 'halter', id: 'remada-unilateral', kind: 'forca', muscle: 'costas', name: 'Remada unilateral', pattern: 'puxar' },
  { equipment: 'cabo', id: 'remada-baixa', kind: 'forca', muscle: 'costas', name: 'Remada baixa', pattern: 'puxar' },
  { equipment: 'peso do corpo', id: 'barra-fixa', kind: 'forca', muscle: 'costas', name: 'Barra fixa', pattern: 'puxar' },
  { equipment: 'barra', id: 'levantamento-terra', kind: 'forca', muscle: 'costas', name: 'Levantamento terra', pattern: 'puxar' },

  // Pernas
  { equipment: 'barra', id: 'agachamento-livre', kind: 'forca', muscle: 'pernas', name: 'Agachamento livre', pattern: 'pernas' },
  { equipment: 'máquina', id: 'leg-press', kind: 'forca', muscle: 'pernas', name: 'Leg press', pattern: 'pernas' },
  { equipment: 'máquina', id: 'cadeira-extensora', kind: 'forca', muscle: 'pernas', name: 'Cadeira extensora', pattern: 'pernas' },
  { equipment: 'máquina', id: 'mesa-flexora', kind: 'forca', muscle: 'pernas', name: 'Mesa flexora', pattern: 'pernas' },
  { equipment: 'halter', id: 'afundo', kind: 'forca', muscle: 'pernas', name: 'Afundo', pattern: 'pernas' },
  { equipment: 'barra', id: 'stiff', kind: 'forca', muscle: 'pernas', name: 'Stiff', pattern: 'pernas' },
  { equipment: 'máquina', id: 'panturrilha', kind: 'forca', muscle: 'pernas', name: 'Panturrilha em pé', pattern: 'pernas' },

  // Ombros
  { equipment: 'halter', id: 'desenvolvimento-halter', kind: 'forca', muscle: 'ombros', name: 'Desenvolvimento com halteres', pattern: 'empurrar' },
  { equipment: 'halter', id: 'elevacao-lateral', kind: 'forca', muscle: 'ombros', name: 'Elevação lateral', pattern: 'empurrar' },
  { equipment: 'cabo', id: 'crucifixo-inverso', kind: 'forca', muscle: 'ombros', name: 'Crucifixo inverso', pattern: 'puxar' },
  { equipment: 'barra', id: 'remada-alta', kind: 'forca', muscle: 'ombros', name: 'Remada alta', pattern: 'puxar' },

  // Braços
  { equipment: 'barra', id: 'rosca-direta', kind: 'forca', muscle: 'bracos', name: 'Rosca direta', pattern: 'puxar' },
  { equipment: 'halter', id: 'rosca-alternada', kind: 'forca', muscle: 'bracos', name: 'Rosca alternada', pattern: 'puxar' },
  { equipment: 'cabo', id: 'triceps-corda', kind: 'forca', muscle: 'bracos', name: 'Tríceps na corda', pattern: 'empurrar' },
  { equipment: 'barra', id: 'triceps-testa', kind: 'forca', muscle: 'bracos', name: 'Tríceps testa', pattern: 'empurrar' },
  { equipment: 'peso do corpo', id: 'mergulho', kind: 'forca', muscle: 'bracos', name: 'Mergulho no banco', pattern: 'empurrar' },

  // Core
  { equipment: 'peso do corpo', id: 'prancha', kind: 'forca', muscle: 'core', name: 'Prancha', pattern: 'core' },
  { equipment: 'peso do corpo', id: 'abdominal-supra', kind: 'forca', muscle: 'core', name: 'Abdominal supra', pattern: 'core' },
  { equipment: 'peso do corpo', id: 'elevacao-pernas', kind: 'forca', muscle: 'core', name: 'Elevação de pernas', pattern: 'core' },
  { equipment: 'cabo', id: 'rotacao-tronco', kind: 'forca', muscle: 'core', name: 'Rotação de tronco no cabo', pattern: 'core' },

  // Cardio e corpo todo
  { equipment: 'esteira', id: 'esteira', kind: 'cardio', muscle: 'corpo-todo', name: 'Esteira', pattern: 'cardio' },
  { equipment: 'bicicleta', id: 'bike', kind: 'cardio', muscle: 'corpo-todo', name: 'Bicicleta', pattern: 'cardio' },
  { equipment: 'elíptico', id: 'eliptico', kind: 'cardio', muscle: 'corpo-todo', name: 'Elíptico', pattern: 'cardio' },
  { equipment: 'corda', id: 'pular-corda', kind: 'cardio', muscle: 'corpo-todo', name: 'Pular corda', pattern: 'cardio' },
  { equipment: 'ar livre', id: 'corrida-rua', kind: 'cardio', muscle: 'corpo-todo', name: 'Corrida na rua', pattern: 'cardio' },
  { equipment: 'peso do corpo', id: 'burpee', kind: 'forca', muscle: 'corpo-todo', name: 'Burpee', pattern: 'core' },
];
