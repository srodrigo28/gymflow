import { Asset } from 'expo-asset';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BrandMark, brandMarkRatio } from '@/src/components/brand/BrandMark';
import { BrandWordmark } from '@/src/components/brand/BrandWordmark';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { heroPeopleImage } from '@/src/constants/images';
import { useSession } from '@/src/contexts/session-context';
import { hasCompletedOnboarding } from '@/src/services/onboarding';
import { makeStyles, nativeSplashBackground, radius, useTheme } from '@/src/theme';
import type { AuthResponse } from '@/src/types/auth';

const MIN_DURATION = 1800;
const TIMEOUT = 4000;
const EXIT_DURATION = 350;
// 62,5% do imageWidth (200) do app.json: mesmo tamanho do halter na splash nativa.
const MARK_WIDTH = 125;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function destinationFor(session: AuthResponse | null): Promise<Href> {
  if (!session) {
    return '/(auth)/welcome';
  }

  return (await hasCompletedOnboarding(session.user.id)) ? '/(app)/home' : '/(onboarding)/start';
}

export default function SplashScreen() {
  const styles = useStyles();
  const { theme } = useTheme();
  const { isLoading, session } = useSession();
  const { height } = useWindowDimensions();
  const appear = useSharedValue(0);
  const progress = useSharedValue(0);
  const exit = useSharedValue(0);
  const startedAt = useRef(Date.now());
  const heroArt = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    appear.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    // A barra avança com o tempo, mas só completa quando o carregamento real termina.
    progress.value = withDelay(
      1100,
      withTiming(0.9, { duration: MIN_DURATION, easing: Easing.out(Easing.quad) }),
    );
    // Arte do hero pré-carregada; se travar, segue sem ela em vez de prender a pessoa aqui.
    heroArt.current = Promise.race([Asset.loadAsync(heroPeopleImage).catch(() => undefined), wait(TIMEOUT)]);
  }, [appear, progress]);

  // A sessão vem do SessionProvider (que já tem timeout próprio), assim o destino
  // e o guard do Stack.Protected enxergam o mesmo estado.
  useEffect(() => {
    if (isLoading) {
      return;
    }

    let isActive = true;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    const remaining = Math.max(MIN_DURATION - (Date.now() - startedAt.current), 0);

    Promise.all([destinationFor(session), heroArt.current, wait(remaining)]).then(([href]) => {
      if (!isActive) {
        return;
      }

      progress.value = withTiming(1, { duration: 220 });
      exit.value = withDelay(220, withTiming(1, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) }));
      navigationTimer = setTimeout(() => router.replace(href), 220 + EXIT_DURATION);
    });

    return () => {
      isActive = false;
      clearTimeout(navigationTimer);
    };
  }, [exit, isLoading, progress, session]);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(appear.value, [0, 1], [nativeSplashBackground, theme.bg.base]),
  }));

  const auroraStyle = useAnimatedStyle(() => ({
    opacity: interpolate(appear.value, [0.3, 1], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(appear.value, [0, 1], [0.6, 1]) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -24 * exit.value }, { scale: 1 - 0.12 * exit.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const markHeight = MARK_WIDTH * brandMarkRatio;

  return (
    <Animated.View style={[styles.container, backgroundStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, auroraStyle]}>
        <AuroraBackground intensity="hero" />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
        <View style={styles.center}>
          <Animated.View style={markStyle}>
            <BrandMark animateIntro delay={300} width={MARK_WIDTH} />
          </Animated.View>
        </View>

        <View style={[styles.below, { top: height / 2 + markHeight / 2 + 28 }]}>
          <Animated.View entering={FadeInDown.delay(900).duration(500)}>
            <BrandWordmark size="lg" tagline />
          </Animated.View>
          <Animated.View
            accessibilityLabel="Carregando"
            accessibilityRole="progressbar"
            entering={FadeInDown.delay(1100).duration(400)}
            style={styles.track}>
            <Animated.View style={[styles.fill, progressStyle]} />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  below: {
    alignItems: 'center',
    gap: 28,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  track: {
    backgroundColor: theme.bg.raised,
    borderRadius: radius.pill,
    height: 3,
    overflow: 'hidden',
    width: 120,
  },
  fill: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
}));
