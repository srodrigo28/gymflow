import Svg, { Path } from 'react-native-svg';

import type { Pose } from '@/src/types/body';

type Point = [number, number];
/** Curva cúbica: dois pontos de controle e o destino, em `[c1x, c1y, c2x, c2y, x, y]`. */
type Curve = [number, number, number, number, number, number];

// As silhuetas são desenhadas numa caixa fixa de 200 × 500 (proporção de um corpo em pé, umas
// sete cabeças e meia de altura) e escaladas pela altura que a tela oferece.
const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 500;
const LINE_WIDTH = 3;

export const POSE_GUIDE_RATIO = VIEW_WIDTH / VIEW_HEIGHT;

const point = ([x, y]: Point) => `${x} ${y}`;
const mirror = ([x, y]: Point): Point => [VIEW_WIDTH - x, y];
const compact = (d: string) => d.replace(/\s+/g, ' ').trim();

/**
 * Fecha um contorno simétrico: recebe a metade direita (do topo da cabeça até a virilha) e
 * desenha a esquerda espelhada de volta ao começo. Assim o corpo de frente sai alinhado sem
 * digitar as duas metades à mão.
 */
function symmetricPath(start: Point, right: Curve[]) {
  const forward: string[] = [];
  const backward: string[] = [];
  let previous = start;

  for (const [c1x, c1y, c2x, c2y, x, y] of right) {
    forward.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x} ${y}`);
    // A volta percorre cada curva ao contrário, por isso os controles trocam de ordem.
    backward.unshift(
      `C ${point(mirror([c2x, c2y]))}, ${point(mirror([c1x, c1y]))}, ${point(mirror(previous))}`,
    );
    previous = [x, y];
  }

  return `M ${point(start)} ${forward.join(' ')} ${backward.join(' ')} Z`;
}

const FRONT_START: Point = [100, 6];

// Metade direita do corpo de frente, braços ao lado do corpo. Costas usa o mesmo contorno:
// sem rosto, a silhueta é igual.
const FRONT_HALF: Curve[] = [
  [114, 6, 124, 18, 124, 38], // cabeça
  [124, 54, 118, 66, 110, 70], // queixo
  [110, 78, 111, 86, 112, 93], // pescoço
  [120, 99, 140, 100, 152, 108], // trapézio → ombro
  [160, 112, 164, 126, 163, 142], // deltoide
  [162, 168, 162, 195, 162, 216], // braço → cotovelo
  [162, 245, 160, 270, 160, 296], // antebraço → punho
  [163, 312, 166, 328, 160, 342], // mão
  [157, 348, 148, 347, 148, 338], // ponta dos dedos
  [148, 322, 148, 310, 148, 296], // lado interno da mão → punho
  [147, 270, 145, 245, 144, 216], // antebraço interno → cotovelo
  [143, 190, 142, 165, 141, 138], // braço interno → axila
  [140, 168, 134, 192, 130, 216], // lateral do tronco → cintura
  [127, 245, 141, 262, 142, 292], // quadril
  [142, 324, 136, 356, 132, 392], // coxa → joelho
  [130, 408, 137, 422, 135, 440], // panturrilha
  [133, 452, 131, 458, 130, 464], // tornozelo
  [130, 474, 134, 486, 142, 494], // calcanhar → sola
  [142, 494, 110, 494, 110, 494], // sola
  [110, 484, 110, 474, 110, 464], // tornozelo interno
  [109, 452, 108, 440, 109, 425], // panturrilha interna
  [110, 410, 110, 400, 110, 392], // joelho interno
  [110, 368, 106, 338, 100, 304], // coxa interna → virilha
];

const FRONT = symmetricPath(FRONT_START, FRONT_HALF);

// Perfil virado para a esquerda: cabeça, costas, glúteo, perna e pé.
const SIDE_BODY = compact(`
  M 102 6
  C 118 6, 128 20, 128 40
  C 128 56, 124 66, 119 74
  C 118 82, 118 90, 120 96
  C 130 102, 142 110, 146 124
  C 150 150, 148 180, 142 205
  C 138 222, 136 236, 138 250
  C 146 262, 154 276, 152 296
  C 150 314, 142 326, 138 340
  C 134 360, 130 380, 126 398
  C 132 410, 136 426, 134 442
  C 132 456, 126 462, 124 470
  C 124 480, 128 488, 132 494
  C 120 494, 80 494, 52 494
  C 50 490, 52 484, 60 482
  C 74 480, 86 476, 92 466
  C 92 450, 94 438, 96 424
  C 97 410, 98 402, 96 392
  C 92 372, 86 352, 84 330
  C 83 310, 82 296, 84 282
  C 86 266, 90 250, 90 236
  C 88 218, 82 200, 78 180
  C 76 160, 78 140, 84 122
  C 88 112, 92 104, 94 96
  C 92 90, 90 84, 90 78
  C 84 78, 76 76, 74 70
  C 72 64, 72 58, 70 54
  C 64 50, 64 44, 70 40
  C 72 30, 76 18, 84 12
  C 88 8, 95 6, 102 6
  Z
`);

// Braço solto ao lado do tronco, com a mão na altura da coxa: lembra que o braço não vai na cintura.
const SIDE_ARM = compact(`
  M 100 118
  C 96 130, 98 160, 102 190
  C 104 205, 104 212, 104 218
  C 102 245, 98 270, 98 296
  C 96 312, 94 328, 98 344
  C 100 350, 110 350, 112 342
  C 114 326, 114 310, 112 296
  C 116 270, 124 248, 128 218
  C 130 200, 130 170, 128 140
  C 128 128, 122 116, 112 112
  C 106 110, 102 112, 100 118
  Z
`);

const outlines: Record<Pose, string[]> = {
  costas: [FRONT],
  frente: [FRONT],
  lado: [SIDE_BODY, SIDE_ARM],
};

type PoseGuideProps = {
  /** Altura em pontos; a largura segue a proporção do desenho. */
  height: number;
  pose: Pose;
};

/** Contorno translúcido da pose, para sobrepor à câmera e repetir o enquadramento todo mês. */
export function PoseGuide({ height, pose }: PoseGuideProps) {
  const width = height * POSE_GUIDE_RATIO;
  // O traçado precisa ter 3 px na tela seja qual for a escala do desenho.
  const strokeWidth = (LINE_WIDTH * VIEW_HEIGHT) / height;
  const paths = outlines[pose];

  return (
    <Svg height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width={width}>
      {/* Halo escuro por baixo da linha: sem ele o branco some numa parede clara. */}
      {paths.map((d, index) => (
        <Path
          d={d}
          fill="none"
          key={`halo-${index}`}
          stroke="rgba(0, 0, 0, 0.45)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth * 2.4}
        />
      ))}
      {paths.map((d, index) => (
        <Path
          d={d}
          fill="none"
          key={`linha-${index}`}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      ))}
    </Svg>
  );
}
