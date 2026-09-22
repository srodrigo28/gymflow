import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '@/src/theme';

type ScreenProps = PropsWithChildren<{
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, edges = ['top', 'right', 'bottom', 'left'], style }: ScreenProps) {
  const styles = useStyles();
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

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.bg.base,
    flex: 1,
  },
}));
