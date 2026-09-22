import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, makeStyles, radius, useTheme } from '@/src/theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

type ButtonProps = Omit<PressableProps, 'children'> & {
  haptic?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  title: string;
  variant?: ButtonVariant;
};

export function Button({
  disabled,
  haptic = false,
  icon,
  iconPosition = 'left',
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  title,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled || loading;
  const contentColor = {
    ghost: theme.text.primary,
    outline: theme.accent.primary,
    primary: theme.accent.onPrimary,
  }[variant];

  const iconElement = icon ? <Ionicons color={contentColor} name={icon} size={20} /> : null;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={(event) => {
          if (haptic && Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress?.(event);
        }}
        onPressIn={(event) => {
          scale.value = withTiming(0.98, { duration: 90 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.value = withTiming(1, { duration: 140 });
          onPressOut?.(event);
        }}
        style={(state) => [
          styles.container,
          styles[variant],
          state.pressed && variant === 'primary' ? styles.primaryPressed : null,
          state.pressed && variant !== 'primary' ? styles.softPressed : null,
          isDisabled ? styles.disabled : null,
          typeof style === 'function' ? style(state) : style,
        ]}
        {...props}>
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <View style={styles.content}>
            {iconPosition === 'left' ? iconElement : null}
            <Text numberOfLines={1} style={[styles.title, { color: contentColor }]}>
              {title}
            </Text>
            {iconPosition === 'right' ? iconElement : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrapper: {
    width: '100%',
  },
  container: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: theme.accent.primary,
  },
  primaryPressed: {
    backgroundColor: theme.accent.pressed,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: theme.accent.primary,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  softPressed: {
    backgroundColor: theme.accent.soft,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.45,
  },
}));
