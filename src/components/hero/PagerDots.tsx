import { Pressable, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { makeStyles, radius, useTheme } from '@/src/theme';

type PagerDotsProps = {
  labels: string[];
  onSelect: (index: number) => void;
  pageWidth: number;
  scrollX: SharedValue<number>;
  selectedIndex: number;
};

// Pontos de paginação: o ponto ativo se alonga e acende conforme o arraste.
// Para leitores de tela, funcionam como abas (uma por cena).
export function PagerDots({ labels, onSelect, pageWidth, scrollX, selectedIndex }: PagerDotsProps) {
  const styles = useStyles();

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {labels.map((label, index) => (
        <Pressable
          accessibilityLabel={`Cena ${index + 1} de ${labels.length}: ${label}`}
          accessibilityRole="tab"
          aria-selected={index === selectedIndex}
          hitSlop={{ bottom: 12, left: 6, right: 6, top: 12 }}
          key={label}
          onPress={() => onSelect(index)}
          style={styles.hit}>
          <Dot index={index} pageWidth={pageWidth} scrollX={scrollX} />
        </Pressable>
      ))}
    </View>
  );
}

function Dot({ index, pageWidth, scrollX }: { index: number; pageWidth: number; scrollX: SharedValue<number> }) {
  const styles = useStyles();
  const { theme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const position = pageWidth > 0 ? scrollX.value / pageWidth : 0;
    const distance = Math.min(Math.abs(position - index), 1);

    return {
      backgroundColor: interpolateColor(distance, [0, 1], [theme.accent.primary, theme.border.strong]),
      width: interpolate(distance, [0, 1], [24, 8]),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const useStyles = makeStyles(() => ({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  hit: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dot: {
    borderRadius: radius.pill,
    height: 8,
  },
}));
