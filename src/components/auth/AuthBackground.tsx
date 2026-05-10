import type { PropsWithChildren } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/src/constants/colors';

type AuthBackgroundProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AuthBackground({ children, contentStyle }: AuthBackgroundProps) {
  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/images/icon.png')} style={styles.watermark} />
      <View style={styles.overlay} />
      <SafeAreaView style={[styles.content, contentStyle]}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: 'hidden',
  },
  watermark: {
    height: 520,
    opacity: 0.08,
    position: 'absolute',
    right: -210,
    top: -90,
    width: 520,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 18, 20, 0.94)',
  },
  content: {
    flex: 1,
  },
});
