import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { fonts, makeStyles, radius, useTheme, withAlpha } from '@/src/theme';

type BenefitCardProps = {
  floatDelay?: number;
  height: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  side: 'left' | 'right';
  width: number;
};

// Painel de vidro inclinado em 3D, voltado para o centro da tela.
export function BenefitCard({ floatDelay = 0, height, icon, label, side, width }: BenefitCardProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const direction = side === 'left' ? 1 : -1;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    offset.value = withDelay(
      floatDelay,
      withRepeat(withTiming(-5, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [floatDelay, offset, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={floatStyle}>
      <View
        style={[
          styles.card,
          {
            borderColor: withAlpha(theme.accent.primary, 0.22),
            height,
            transform: [
              { perspective: 700 },
              { rotateY: `${direction * 22}deg` },
              { rotateZ: `${direction * -3}deg` },
            ],
            width,
          },
        ]}>
        <MaterialCommunityIcons color={theme.accent.primary} name={icon} size={Math.round(width * 0.24)} />
        {/* Em cards estreitos o espaçamento encolhe para não quebrar palavras como "disposição". */}
        <Text style={[styles.label, width < 96 ? styles.labelNarrow : null]}>{label}</Text>
        <View style={styles.dash} />
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: withAlpha(theme.bg.raised, 0.42),
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    justifyContent: 'flex-end',
    padding: 10,
  },
  label: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 1.3,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  labelNarrow: {
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  dash: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: 2,
    width: 18,
  },
}));
