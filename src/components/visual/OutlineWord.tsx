import Svg, { Text as SvgText } from 'react-native-svg';

import { fonts, useTheme, withAlpha } from '@/src/theme';

// Caixa dos glifos de "EVOLUA" na Plus Jakarta Sans ExtraBold Italic com fonte 100
// (x 0–418, y 28–105). Com essa viewBox a palavra ocupa exatamente a largura pedida.
const VIEW_BOX = { height: 86, width: 436, x: -6, y: 24 };

type OutlineWordProps = {
  width: number;
  word?: string;
};

// Palavra gigante vazada (só contorno), usada como textura atrás das pessoas no hero.
export function OutlineWord({ width, word = 'EVOLUA' }: OutlineWordProps) {
  const { theme } = useTheme();

  return (
    <Svg
      height={(width * VIEW_BOX.height) / VIEW_BOX.width}
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      width={width}>
      <SvgText
        fill={withAlpha(theme.accent.primary, 0.05)}
        fontFamily={fonts.extraboldItalic}
        fontSize={100}
        stroke={withAlpha(theme.accent.primary, 0.32)}
        strokeWidth={1.2}
        x={0}
        y={104}>
        {word}
      </SvgText>
    </Svg>
  );
}
