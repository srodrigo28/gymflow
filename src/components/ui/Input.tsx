import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { colors } from '@/src/constants/colors';

type InputProps = TextInputProps & {
  error?: string;
  helperText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
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
  rightText,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
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
    outputRange: [error ? colors.danger : 'transparent', colors.primary],
  });

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
              outputRange: [0, 0.22],
            }),
          },
        ]}>
        {icon ? <Ionicons color={colors.placeholder} name={icon} size={22} style={styles.icon} /> : null}
        <TextInput
          cursorColor={colors.primary}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry ? isHidden : false}
          selectionColor={colors.primary}
          style={[styles.input, webInputReset, style]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={isHidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={10}
            onPress={() => setIsHidden((current) => !current)}>
            <Ionicons
              color={colors.placeholder}
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
            />
          </Pressable>
        ) : null}
        {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      </Animated.View>
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    height: 64,
    paddingLeft: 20,
    paddingRight: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    backgroundColor: 'transparent',
    color: colors.text,
    flex: 1,
    fontSize: 18,
    height: '100%',
    padding: 0,
  },
  rightText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
