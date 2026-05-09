import type { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/src/constants/colors';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, style }: ScreenProps) {
  return <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
