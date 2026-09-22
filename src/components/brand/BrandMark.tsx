import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/src/theme';

// Mesma geometria (viewBox 200 x 64) usada para gerar icon.png, splash-icon.png e os ícones Android.
const pieces = [
  { key: 'outerLeft', x: 0, y: 6, w: 8, h: 52, r: 2, side: -1, reach: 16 },
  { key: 'innerLeft', x: 13, y: 0, w: 14, h: 64, r: 3, side: -1, reach: 10 },
  { key: 'bar', x: 32, y: 26, w: 136, h: 12, r: 6, side: 0, reach: 0 },
  { key: 'innerRight', x: 173, y: 0, w: 14, h: 64, r: 3, side: 1, reach: 10 },
  { key: 'outerRight', x: 192, y: 6, w: 8, h: 52, r: 2, side: 1, reach: 16 },
] as const;

export const brandMarkRatio = 64 / 200;

type BrandMarkProps = {
  animateIntro?: boolean;
  color?: string;
  delay?: number;
  idleColor?: string;
  width?: number;
};

// Halter da marca. Com `animateIntro`, começa na cor neutra (igual à splash nativa),
// as anilhas "encaixam" com um spring e o halter acende na cor do tema.
export function BrandMark({ animateIntro = false, color, delay = 0, idleColor, width = 120 }: BrandMarkProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const lit = useSharedValue(animateIntro ? 0 : 1);
  const spread = useSharedValue(0);
  const scale = width / 200;

  useEffect(() => {
    if (!animateIntro) {
      return;
    }

    lit.value = withDelay(delay + 180, withTiming(1, { duration: 520 }));

    if (!reduceMotion) {
      spread.value = withDelay(
        delay,
        withSequence(withTiming(1, { duration: 200 }), withSpring(0, { damping: 9, stiffness: 170 })),
      );
    }
  }, [animateIntro, delay, lit, reduceMotion, spread]);

  return (
    <View
      accessibilityLabel="Gyn Flow"
      accessibilityRole="image"
      style={{ height: width * brandMarkRatio, width }}>
      {pieces.map((piece) => (
        <MarkPiece
          baseColor={idleColor ?? theme.text.primary}
          key={piece.key}
          lit={lit}
          litColor={color ?? theme.accent.primary}
          piece={piece}
          scale={scale}
          spread={spread}
        />
      ))}
    </View>
  );
}

function MarkPiece({
  baseColor,
  lit,
  litColor,
  piece,
  scale,
  spread,
}: {
  baseColor: string;
  lit: SharedValue<number>;
  litColor: string;
  piece: (typeof pieces)[number];
  scale: number;
  spread: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(lit.value, [0, 1], [baseColor, litColor]),
    transform: [{ translateX: piece.side * spread.value * piece.reach * scale }],
  }));

  return (
    <Animated.View
      style={[
        {
          borderRadius: piece.r * scale,
          height: piece.h * scale,
          left: piece.x * scale,
          position: 'absolute',
          top: piece.y * scale,
          width: piece.w * scale,
        },
        animatedStyle,
      ]}
    />
  );
}
