import Svg, { Text as SvgText } from 'react-native-svg';

import { fonts, useTheme, withAlpha } from '@/src/theme';

// Largura dos glifos de cada palavra na Plus Jakarta Sans ExtraBold Italic com fonte 100
// (os glifos ocupam y 28–105). Com a viewBox exata, a palavra preenche a largura pedida.
const wordWidths = {
  CORPO: 388,
  EVOLUA: 418,
  MENTE: 343,
};

export type OutlineWordName = keyof typeof wordWidths;

const VIEW_BOX = { height: 86, padding: 6, y: 24 };

type OutlineWordProps = {
  width: number;
  word: OutlineWordName;
};

// Palavra gigante vazada (só contorno), usada como textura atrás do visual do hero.
export function OutlineWord({ width, word }: OutlineWordProps) {
  const { theme } = useTheme();
  const viewBoxWidth = wordWidths[word] + VIEW_BOX.padding * 3;

  return (
    <Svg
      height={(width * VIEW_BOX.height) / viewBoxWidth}
      viewBox={`${-VIEW_BOX.padding} ${VIEW_BOX.y} ${viewBoxWidth} ${VIEW_BOX.height}`}
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
