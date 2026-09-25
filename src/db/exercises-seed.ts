import type { Exercise } from '@/src/types/training';

// Catálogo inicial. É semeado na primeira abertura e pode crescer sem migração:
// exercícios novos entram por id, os existentes só têm nome e classificação atualizados.
// Nunca mude um id: ele liga o exercício aos treinos já feitos, no aparelho e na conta.
//
// `kind` diz o que a série registra: força (carga e repetições), cardio (tempo e distância) ou
// tempo (só os minutos). `modality` separa a escolha de exercícios e vai com o treino para a API,
// que monta um pódio por modalidade na temporada. Fora da musculação o músculo é "corpo todo"; o
// padrão é cardio no que puxa o fôlego e core nas práticas de controle do corpo (yoga, pilates,
// alongamento e mobilidade), que não são cardio.
export const exercisesSeed: Exercise[] = [
  // Musculação: peito
  { equipment: 'barra', id: 'supino-reto', kind: 'forca', modality: 'musculacao', muscle: 'peito', name: 'Supino reto', pattern: 'empurrar' },
  { equipment: 'halter', id: 'supino-inclinado-halter', kind: 'forca', modality: 'musculacao', muscle: 'peito', name: 'Supino inclinado com halteres', pattern: 'empurrar' },
  { equipment: 'máquina', id: 'crucifixo-maquina', kind: 'forca', modality: 'musculacao', muscle: 'peito', name: 'Crucifixo na máquina', pattern: 'empurrar' },
  { equipment: 'peso do corpo', id: 'flexao', kind: 'forca', modality: 'musculacao', muscle: 'peito', name: 'Flexão de braço', pattern: 'empurrar' },
  { equipment: 'cabo', id: 'crossover', kind: 'forca', modality: 'musculacao', muscle: 'peito', name: 'Crossover', pattern: 'empurrar' },

  // Musculação: costas
  { equipment: 'máquina', id: 'puxada-frontal', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Puxada frontal', pattern: 'puxar' },
  { equipment: 'barra', id: 'remada-curvada', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Remada curvada', pattern: 'puxar' },
  { equipment: 'halter', id: 'remada-unilateral', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Remada unilateral', pattern: 'puxar' },
  { equipment: 'cabo', id: 'remada-baixa', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Remada baixa', pattern: 'puxar' },
  { equipment: 'peso do corpo', id: 'barra-fixa', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Barra fixa', pattern: 'puxar' },
  { equipment: 'barra', id: 'levantamento-terra', kind: 'forca', modality: 'musculacao', muscle: 'costas', name: 'Levantamento terra', pattern: 'puxar' },

  // Musculação: pernas
  { equipment: 'barra', id: 'agachamento-livre', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Agachamento livre', pattern: 'pernas' },
  { equipment: 'máquina', id: 'leg-press', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Leg press', pattern: 'pernas' },
  { equipment: 'máquina', id: 'cadeira-extensora', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Cadeira extensora', pattern: 'pernas' },
  { equipment: 'máquina', id: 'mesa-flexora', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Mesa flexora', pattern: 'pernas' },
  { equipment: 'halter', id: 'afundo', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Afundo', pattern: 'pernas' },
  { equipment: 'barra', id: 'stiff', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Stiff', pattern: 'pernas' },
  { equipment: 'máquina', id: 'panturrilha', kind: 'forca', modality: 'musculacao', muscle: 'pernas', name: 'Panturrilha em pé', pattern: 'pernas' },

  // Musculação: ombros
  { equipment: 'halter', id: 'desenvolvimento-halter', kind: 'forca', modality: 'musculacao', muscle: 'ombros', name: 'Desenvolvimento com halteres', pattern: 'empurrar' },
  { equipment: 'halter', id: 'elevacao-lateral', kind: 'forca', modality: 'musculacao', muscle: 'ombros', name: 'Elevação lateral', pattern: 'empurrar' },
  { equipment: 'cabo', id: 'crucifixo-inverso', kind: 'forca', modality: 'musculacao', muscle: 'ombros', name: 'Crucifixo inverso', pattern: 'puxar' },
  { equipment: 'barra', id: 'remada-alta', kind: 'forca', modality: 'musculacao', muscle: 'ombros', name: 'Remada alta', pattern: 'puxar' },

  // Musculação: braços
  { equipment: 'barra', id: 'rosca-direta', kind: 'forca', modality: 'musculacao', muscle: 'bracos', name: 'Rosca direta', pattern: 'puxar' },
  { equipment: 'halter', id: 'rosca-alternada', kind: 'forca', modality: 'musculacao', muscle: 'bracos', name: 'Rosca alternada', pattern: 'puxar' },
  { equipment: 'cabo', id: 'triceps-corda', kind: 'forca', modality: 'musculacao', muscle: 'bracos', name: 'Tríceps na corda', pattern: 'empurrar' },
  { equipment: 'barra', id: 'triceps-testa', kind: 'forca', modality: 'musculacao', muscle: 'bracos', name: 'Tríceps testa', pattern: 'empurrar' },
  { equipment: 'peso do corpo', id: 'mergulho', kind: 'forca', modality: 'musculacao', muscle: 'bracos', name: 'Mergulho no banco', pattern: 'empurrar' },

  // Musculação: core
  { equipment: 'peso do corpo', id: 'prancha', kind: 'forca', modality: 'musculacao', muscle: 'core', name: 'Prancha', pattern: 'core' },
  { equipment: 'peso do corpo', id: 'abdominal-supra', kind: 'forca', modality: 'musculacao', muscle: 'core', name: 'Abdominal supra', pattern: 'core' },
  { equipment: 'peso do corpo', id: 'elevacao-pernas', kind: 'forca', modality: 'musculacao', muscle: 'core', name: 'Elevação de pernas', pattern: 'core' },
  { equipment: 'cabo', id: 'rotacao-tronco', kind: 'forca', modality: 'musculacao', muscle: 'core', name: 'Rotação de tronco no cabo', pattern: 'core' },

  // Corrida e caminhada
  { equipment: 'esteira', id: 'esteira', kind: 'cardio', modality: 'corrida', muscle: 'corpo-todo', name: 'Esteira', pattern: 'cardio' },
  { equipment: 'ar livre', id: 'corrida-rua', kind: 'cardio', modality: 'corrida', muscle: 'corpo-todo', name: 'Corrida na rua', pattern: 'cardio' },
  { equipment: 'ar livre', id: 'caminhada', kind: 'cardio', modality: 'corrida', muscle: 'corpo-todo', name: 'Caminhada', pattern: 'cardio' },

  // Bike
  { equipment: 'bicicleta', id: 'bike', kind: 'cardio', modality: 'bike', muscle: 'corpo-todo', name: 'Bicicleta', pattern: 'cardio' },
  { equipment: 'bicicleta', id: 'spinning', kind: 'cardio', modality: 'bike', muscle: 'corpo-todo', name: 'Spinning', pattern: 'cardio' },

  // Natação
  { equipment: 'piscina', id: 'natacao-livre', kind: 'cardio', modality: 'natacao', muscle: 'corpo-todo', name: 'Natação estilo livre', pattern: 'cardio' },
  { equipment: 'piscina', id: 'natacao-costas-peito', kind: 'cardio', modality: 'natacao', muscle: 'corpo-todo', name: 'Natação costas ou peito', pattern: 'cardio' },
  { equipment: 'piscina', id: 'hidroginastica', kind: 'tempo', modality: 'natacao', muscle: 'corpo-todo', name: 'Hidroginástica', pattern: 'cardio' },

  // Funcional
  { equipment: 'peso do corpo', id: 'burpee', kind: 'forca', modality: 'funcional', muscle: 'corpo-todo', name: 'Burpee', pattern: 'core' },
  { equipment: 'corda', id: 'pular-corda', kind: 'cardio', modality: 'funcional', muscle: 'corpo-todo', name: 'Pular corda', pattern: 'cardio' },
  { equipment: 'kettlebell', id: 'kettlebell-swing', kind: 'forca', modality: 'funcional', muscle: 'corpo-todo', name: 'Kettlebell swing', pattern: 'pernas' },
  { equipment: 'peso do corpo', id: 'agachamento-com-salto', kind: 'forca', modality: 'funcional', muscle: 'corpo-todo', name: 'Agachamento com salto', pattern: 'pernas' },
  { equipment: 'peso do corpo', id: 'circuito-funcional', kind: 'tempo', modality: 'funcional', muscle: 'corpo-todo', name: 'Circuito funcional', pattern: 'cardio' },

  // Luta
  { equipment: 'luvas', id: 'boxe', kind: 'tempo', modality: 'luta', muscle: 'corpo-todo', name: 'Boxe', pattern: 'cardio' },
  { equipment: 'luvas', id: 'muay-thai', kind: 'tempo', modality: 'luta', muscle: 'corpo-todo', name: 'Muay thai', pattern: 'cardio' },
  { equipment: 'tatame', id: 'jiu-jitsu', kind: 'tempo', modality: 'luta', muscle: 'corpo-todo', name: 'Jiu-jitsu', pattern: 'cardio' },

  // Yoga
  { equipment: 'tapete', id: 'yoga', kind: 'tempo', modality: 'yoga', muscle: 'corpo-todo', name: 'Yoga', pattern: 'core' },
  { equipment: 'tapete', id: 'yoga-flow', kind: 'tempo', modality: 'yoga', muscle: 'corpo-todo', name: 'Yoga flow ou power yoga', pattern: 'core' },

  // Mobilidade
  { equipment: 'colchonete', id: 'alongamento', kind: 'tempo', modality: 'mobilidade', muscle: 'corpo-todo', name: 'Alongamento', pattern: 'core' },
  { equipment: 'peso do corpo', id: 'mobilidade-articular', kind: 'tempo', modality: 'mobilidade', muscle: 'corpo-todo', name: 'Mobilidade articular', pattern: 'core' },
  { equipment: 'colchonete', id: 'pilates', kind: 'tempo', modality: 'mobilidade', muscle: 'corpo-todo', name: 'Pilates', pattern: 'core' },

  // Cardio na academia
  { equipment: 'elíptico', id: 'eliptico', kind: 'cardio', modality: 'cardio', muscle: 'corpo-todo', name: 'Elíptico', pattern: 'cardio' },
  { equipment: 'simulador de escada', id: 'escada', kind: 'cardio', modality: 'cardio', muscle: 'corpo-todo', name: 'Escada', pattern: 'cardio' },
  { equipment: 'remo ergômetro', id: 'remo-ergometro', kind: 'cardio', modality: 'cardio', muscle: 'corpo-todo', name: 'Remo ergômetro', pattern: 'cardio' },
];
