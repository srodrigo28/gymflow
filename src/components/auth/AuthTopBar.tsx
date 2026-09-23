import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { makeStyles, radius, useTheme } from '@/src/theme';

function goBackToWelcome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(auth)/welcome');
}

// Topo de login e cadastro: voltar ao hero e a marca.
export function AuthTopBar() {
  const styles = useStyles();
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        hitSlop={8}
        onPress={goBackToWelcome}
        style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
        <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
      </Pressable>
      <BrandHeader />
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.overlay,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
}));
