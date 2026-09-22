import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, radius, typography, useTheme, withAlpha, type DomainName } from '@/src/theme';

type GlassChipProps = {
  domain: DomainName;
  float?: boolean;
  floatDelay?: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  style?: StyleProp<ViewStyle>;
};

// Cartão pequeno de vidro tingido (sem blur, para ser leve no Android).
export function GlassChip({ domain, float = false, floatDelay = 0, icon, label, style }: GlassChipProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const color = theme.domain[domain];

  useEffect(() => {
    if (!float || reduceMotion) {
      return;
    }

    offset.value = withDelay(
      floatDelay,
      withRepeat(withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [float, floatDelay, offset, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Ionicons color={color} name={icon} size={14} />
      </View>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.strong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  label: {
    ...typography.caption,
    color: theme.text.primary,
  },
}));
