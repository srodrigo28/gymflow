import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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
};

export function Input({ error, secureTextEntry, style, ...props }: InputProps) {
  const [isHidden, setIsHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <TextInput
          cursorColor={colors.primary}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry ? isHidden : false}
          selectionColor={colors.primary}
          style={[styles.input, style]}
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
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 6,
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 18,
  },
  containerError: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    height: '100%',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
