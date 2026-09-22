import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { makeStyles } from '@/src/theme';

type AuthBackgroundProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: 'hero' | 'subtle';
}>;

export function AuthBackground({ children, contentStyle, intensity = 'subtle' }: AuthBackgroundProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <AuroraBackground intensity={intensity} />
      <SafeAreaView style={[styles.content, contentStyle]}>{children}</SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.bg.base,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
}));
