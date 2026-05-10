import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/constants/colors';

type ButtonProps = ComponentProps<typeof Pressable> & {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export function Button({
  disabled,
  icon,
  loading = false,
  title,
  variant = 'primary',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.container,
        variant === 'outline' ? styles.outline : styles.primary,
        state.pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              color={variant === 'outline' ? colors.primary : colors.text}
              name={icon}
              size={22}
            />
          ) : null}
          <Text style={[styles.title, variant === 'outline' ? styles.outlineTitle : null]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 8,
    height: 64,
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  outlineTitle: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});
