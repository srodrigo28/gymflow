import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, typography, useTheme, withAlpha, type DomainName } from '@/src/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingValue = {
  domain: DomainName;
  value: number;
};

type EvolutionRingProps = {
  accessibilityLabel?: string;
  delay?: number;
  label: string;
  rings: RingValue[];
  score: number;
  size?: number;
};

const RING_DURATION = 1100;
const RING_STAGGER = 90;

// Anel triplo de evolução: cada arco é um domínio (cor fixa) e o centro conta até a pontuação.
export function EvolutionRing({
  accessibilityLabel,
  delay = 0,
  label,
  rings,
  score,
  size = 220,
}: EvolutionRingProps) {
  const styles = useStyles();
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);
  const stroke = Math.round(size * 0.058);
  // O rótulo acompanha o tamanho do anel para caber no miolo.
  const labelSize = Math.min(Math.max(size * 0.068, 10), 13);
  const gap = Math.round(stroke * 0.4);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: RING_DURATION + RING_STAGGER * rings.length, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, progress, rings.length]);

  useAnimatedReaction(
    () => Math.round(progress.value * score),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setDisplayScore, current);
      }
    },
  );

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={[styles.container, { height: size, width: size }]}>
      {/* Girar o SVG inteiro faz os arcos começarem às 12h em todas as plataformas. */}
      <Svg height={size} style={styles.rotated} width={size}>
        {rings.map((ring, index) => (
          <RingArc
            gap={gap}
            index={index}
            key={ring.domain}
            progress={progress}
            ring={ring}
            size={size}
            stroke={stroke}
            total={rings.length}
          />
        ))}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { fontSize: size * 0.2, lineHeight: size * 0.23 }]}>{displayScore}</Text>
        <Text style={[styles.label, { fontSize: labelSize, lineHeight: labelSize * 1.35 }]}>{label}</Text>
      </View>
    </View>
  );
}

function RingArc({
  gap,
  index,
  progress,
  ring,
  size,
  stroke,
  total,
}: {
  gap: number;
  index: number;
  progress: SharedValue<number>;
  ring: RingValue;
  size: number;
  stroke: number;
  total: number;
}) {
  const { theme } = useTheme();
  const color = theme.domain[ring.domain];
  const radius = size / 2 - stroke / 2 - index * (stroke + gap);
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Cada arco começa um pouco depois do anterior.
  const start = (index * RING_STAGGER) / (RING_DURATION + RING_STAGGER * total);
  const span = 1 - start;

  const animatedProps = useAnimatedProps(() => {
    const local = Math.min(Math.max((progress.value - start) / span, 0), 1);
    return { strokeDashoffset: circumference * (1 - local * ring.value) };
  });

  return (
    <>
      <Circle
        cx={center}
        cy={center}
        fill="none"
        r={radius}
        stroke={withAlpha(color, 0.16)}
        strokeWidth={stroke}
      />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={center}
        cy={center}
        fill="none"
        r={radius}
        stroke={color}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotated: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
  },
  score: {
    ...typography.metric,
    color: theme.text.primary,
  },
  label: {
    ...typography.caption,
    color: theme.text.secondary,
  },
}));
