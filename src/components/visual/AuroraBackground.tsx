import { useEffect, useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/src/theme';

type AuroraIntensity = 'hero' | 'subtle';

// Posição (em % da tela) e alcance de cada "luz" da aurora.
const blobs = [
  { cx: 18, cy: 12, r: 58 },
  { cx: 88, cy: 32, r: 50 },
  { cx: 44, cy: 58, r: 46 },
];

const opacityByIntensity: Record<AuroraIntensity, number[]> = {
  hero: [0.46, 0.32, 0.3],
  subtle: [0.16, 0.1, 0.1],
};

type AuroraBackgroundProps = {
  intensity?: AuroraIntensity;
  style?: StyleProp<ViewStyle>;
};

// Gradiente como luz ambiente: três focos radiais das cores do tema, derivando devagar.
export function AuroraBackground({ intensity = 'hero', style }: AuroraBackgroundProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const idPrefix = `aurora${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    drift.value = withRepeat(
      withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-14, 14]) },
      { translateY: interpolate(drift.value, [0, 1], [10, -10]) },
      { rotate: `${interpolate(drift.value, [0, 1], [-2, 2])}deg` },
      // Folga para a camada girada nunca revelar as bordas da tela.
      { scale: 1.3 },
    ],
  }));

  const opacities = opacityByIntensity[intensity];

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
          <Defs>
            {blobs.map((blob, index) => {
              const color = theme.gradient.aurora[index % theme.gradient.aurora.length];

              return (
                <RadialGradient
                  cx={blob.cx}
                  cy={blob.cy}
                  gradientUnits="userSpaceOnUse"
                  id={`${idPrefix}-${index}`}
                  key={index}
                  r={blob.r}>
                  <Stop offset="0" stopColor={color} stopOpacity={opacities[index]} />
                  <Stop offset="0.55" stopColor={color} stopOpacity={opacities[index] * 0.35} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </RadialGradient>
              );
            })}
          </Defs>
          {blobs.map((_, index) => (
            <Rect fill={`url(#${idPrefix}-${index})`} height="100" key={index} width="100" />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
