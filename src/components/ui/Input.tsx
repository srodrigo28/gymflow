import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type Ref } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { fonts, makeStyles, radius, typography, useTheme } from '@/src/theme';

type InputProps = TextInputProps & {
  error?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  ref?: Ref<TextInput>;
  rightText?: string;
};

const webInputReset =
  Platform.OS === 'web'
    ? ({
        backgroundColor: 'transparent',
        outlineStyle: 'none',
      } as unknown as TextInputProps['style'])
    : null;

export function Input({
  error,
  helperText,
  icon,
  label,
  onBlur,
  onFocus,
  rightText,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const [isHidden, setIsHidden] = useState(Boolean(secureTextEntry));
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnimation, {
      duration: 160,
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [focusAnimation, isFocused]);

  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? theme.status.danger : theme.border.subtle, theme.border.focus],
  });
  const iconColor = isFocused ? theme.accent.primary : theme.text.muted;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.container,
          {
            borderColor,
            shadowOpacity: focusAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.28],
            }),
          },
        ]}>
        {icon ? <Ionicons color={iconColor} name={icon} size={20} style={styles.icon} /> : null}
        {/* Os manipuladores de foco vêm depois do spread para não serem sobrescritos
            (o onBlur do react-hook-form apagava o estado de foco). */}
        <TextInput
          cursorColor={theme.accent.primary}
          placeholderTextColor={theme.text.muted}
          selectionColor={theme.accent.primary}
          {...props}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          secureTextEntry={secureTextEntry ? isHidden : false}
          style={[styles.input, webInputReset, style]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={isHidden ? 'Mostrar senha' : 'Ocultar senha'}
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setIsHidden((current) => !current)}>
            <Ionicons
              color={theme.text.muted}
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
            />
          </Pressable>
        ) : null}
        {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      </Animated.View>
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrapper: {
    gap: 6,
  },
  label: {
    ...typography.caption,
    color: theme.text.primary,
  },
  container: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    paddingLeft: 18,
    paddingRight: 16,
    shadowColor: theme.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    backgroundColor: 'transparent',
    color: theme.text.primary,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  rightText: {
    ...typography.caption,
    color: theme.text.secondary,
    marginLeft: 10,
  },
  helper: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: theme.status.danger,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
}));
