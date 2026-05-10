import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/constants/colors';

type ScreenProps = PropsWithChildren<{
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, edges = ['top', 'right', 'bottom', 'left'], style }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingLeft: edges.includes('left') ? insets.left : 0,
          paddingRight: edges.includes('right') ? insets.right : 0,
          paddingTop: edges.includes('top') ? insets.top : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
