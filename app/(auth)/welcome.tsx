import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { BodyScene } from '@/src/components/hero/BodyScene';
import { EvolutionScene } from '@/src/components/hero/EvolutionScene';
import { PagerDots } from '@/src/components/hero/PagerDots';
import type { SceneProps, StageSize } from '@/src/components/hero/stage';
import { WellbeingScene } from '@/src/components/hero/WellbeingScene';
import { Button } from '@/src/components/ui/Button';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { fonts, makeStyles, radius, typography, withAlpha } from '@/src/theme';

type Scene = {
  key: string;
  label: string;
  overline: string;
  subtitle: string;
  tagline: string;
  // Título em três partes: a do meio fica na cor de destaque. Espaços não separáveis
  // (\u00a0) mantêm o destaque inteiro numa linha.
  title: [string, string, string];
  Visual: ComponentType<SceneProps>;
};

const scenes: Scene[] = [
  {
    key: 'evolucao',
    label: 'Evolução',
    overline: 'Treino · Sono · Água · Mente',
    subtitle:
      'Treinos, hábitos e bem-estar em um só lugar, com uma pontuação diária que mostra o quanto você avançou.',
    tagline: 'Corpo · Mente · Uma vida melhor',
    title: ['Veja seu corpo ', 'evoluir', ', dia após dia.'],
    Visual: EvolutionScene,
  },
  {
    key: 'corpo',
    label: 'Corpo',
    overline: 'Evolução do corpo',
    subtitle: 'Cargas, medidas e fotos lado a lado para você enxergar o progresso além da balança.',
    tagline: 'Força · Medidas · Fotos',
    title: ['Cada treino conta. ', 'E\u00a0aparece', '.'],
    Visual: BodyScene,
  },
  {
    key: 'bem-estar',
    label: 'Bem-estar',
    overline: 'Bem-estar',
    subtitle: 'Sono, água e humor também contam na sua evolução, sem culpa e sem comparação.',
    tagline: 'Sono · Água · Humor',
    title: ['Cuide de você, ', 'no\u00a0seu\u00a0ritmo', '.'],
    Visual: WellbeingScene,
  },
];

// Tempo de leitura de cada cena antes de avançar sozinho. O avanço automático para no
// primeiro toque, na última cena e com "reduzir movimento" (carrossel que não para
// atrapalha a leitura).
const AUTO_ADVANCE_MS = 6500;

type PagerSize = { height: number; width: number };

export default function WelcomeScreen() {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const isShort = height <= 700;
  const reduceMotion = useReducedMotion();
  const pagerRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [pager, setPager] = useState<PagerSize | null>(null);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<number[]>([0]);
  const [stages, setStages] = useState<Record<number, StageSize>>({});
  const hasUserInteracted = useRef(false);

  useEffect(() => {
    setVisited((current) => (current.includes(index) ? current : [...current, index]));
  }, [index]);

  useEffect(() => {
    if (reduceMotion || !pager || index >= scenes.length - 1) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasUserInteracted.current) {
        pagerRef.current?.scrollTo({ animated: true, x: (index + 1) * pager.width });
      }
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [index, pager, reduceMotion]);

  function handlePagerLayout(event: LayoutChangeEvent) {
    const { height: pagerHeight, width: pagerWidth } = event.nativeEvent.layout;
    setPager((current) =>
      current && current.width === pagerWidth && current.height === pagerHeight
        ? current
        : { height: pagerHeight, width: pagerWidth },
    );
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    scrollX.value = x;

    if (pager) {
      const nextIndex = Math.min(Math.max(Math.round(x / pager.width), 0), scenes.length - 1);
      setIndex((current) => (current === nextIndex ? current : nextIndex));
    }
  }

  function handleStageLayout(sceneIndex: number, event: LayoutChangeEvent) {
    const { height: stageHeight, width: stageWidth } = event.nativeEvent.layout;
    setStages((current) => {
      const previous = current[sceneIndex];
      return previous && previous.width === stageWidth && previous.height === stageHeight
        ? current
        : { ...current, [sceneIndex]: { height: stageHeight, width: stageWidth } };
    });
  }

  function markInteraction() {
    hasUserInteracted.current = true;
  }

  function goToScene(sceneIndex: number) {
    markInteraction();
    if (pager) {
      pagerRef.current?.scrollTo({ animated: !reduceMotion, x: sceneIndex * pager.width });
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.fill}>
        <AuroraBackground intensity="hero" />
      </Animated.View>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.header}>
          <BrandHeader />
          {isShort ? null : (
            <View style={styles.motto}>
              <Text style={styles.mottoText}>{'Disciplina\nhoje,\nresultados\nsempre'}</Text>
              <View style={styles.dash} />
            </View>
          )}
        </Animated.View>

        <ScrollView
          horizontal
          onLayout={handlePagerLayout}
          onScroll={handleScroll}
          onScrollBeginDrag={markInteraction}
          onTouchStart={markInteraction}
          pagingEnabled
          ref={pagerRef}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.pager}>
          {pager
            ? scenes.map((scene, sceneIndex) => {
                const isVisited = visited.includes(sceneIndex);
                const stage = stages[sceneIndex];
                const Visual = scene.Visual;

                return (
                  <View
                    accessibilityElementsHidden={sceneIndex !== index}
                    importantForAccessibility={sceneIndex === index ? 'auto' : 'no-hide-descendants'}
                    key={scene.key}
                    style={{ height: pager.height, width: pager.width }}>
                    {/* O texto é montado sempre (o palco não muda de tamanho); o visual só na
                        primeira vez que a cena aparece, para a animação de entrada tocar à vista. */}
                    <View onLayout={(event) => handleStageLayout(sceneIndex, event)} style={styles.stage}>
                      {isVisited && stage ? <Visual isShort={isShort} stage={stage} /> : null}
                    </View>

                    <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.tagline}>
                      <Text style={styles.taglineText}>{scene.tagline}</Text>
                      <View style={styles.dash} />
                    </Animated.View>

                    <View style={styles.copy}>
                      <Animated.Text
                        entering={FadeInDown.delay(200).duration(500)}
                        style={styles.overline}>
                        {scene.overline}
                      </Animated.Text>
                      <Animated.Text
                        accessibilityRole="header"
                        entering={FadeInDown.delay(280).duration(500)}
                        maxFontSizeMultiplier={1.4}
                        style={[styles.title, isShort ? styles.titleShort : null]}>
                        {scene.title[0]}
                        <Text style={styles.titleAccent}>{scene.title[1]}</Text>
                        {scene.title[2]}
                      </Animated.Text>
                      <Animated.Text
                        entering={FadeInDown.delay(360).duration(500)}
                        style={[styles.subtitle, isShort ? styles.subtitleShort : null]}>
                        {scene.subtitle}
                      </Animated.Text>
                    </View>
                  </View>
                );
              })
            : null}
        </ScrollView>

        <Animated.View entering={FadeIn.delay(900).duration(400)} style={styles.dots}>
          <PagerDots
            labels={scenes.map((scene) => scene.label)}
            onSelect={goToScene}
            pageWidth={pager?.width ?? 0}
            scrollX={scrollX}
            selectedIndex={index}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1000).duration(400)} style={styles.actions}>
          <View style={styles.ctaGlow}>
            <Button
              haptic
              icon="arrow-forward"
              iconPosition="right"
              onPress={() => router.push('/(auth)/sign-up')}
              title="Começar minha evolução"
            />
          </View>
          <Pressable
            accessibilityLabel="Já tenho conta. Entrar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.loginLink, pressed ? styles.pressed : null]}>
            <Text style={styles.loginText}>
              Já tenho conta? <Text style={styles.loginAccent}>Entrar</Text>
            </Text>
          </Pressable>
        </Animated.View>

        {isShort ? null : (
          <Animated.View entering={FadeIn.delay(1200).duration(500)} style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>Pessoas mais saudáveis · Dias mais felizes</Text>
            <View style={styles.footerLine} />
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.bg.base,
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  safeArea: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 520,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  motto: {
    gap: 8,
  },
  mottoText: {
    color: theme.text.secondary,
    fontFamily: fonts.semibold,
    fontSize: 9,
    letterSpacing: 2.4,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  dash: {
    backgroundColor: theme.accent.primary,
    borderRadius: radius.pill,
    height: 2,
    width: 22,
  },
  pager: {
    flex: 1,
  },
  stage: {
    flex: 1,
    marginTop: 10,
    minHeight: 200,
  },
  tagline: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    paddingTop: 12,
  },
  taglineText: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  copy: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  overline: {
    ...typography.overline,
    color: theme.accent.primary,
    textAlign: 'center',
  },
  title: {
    ...typography.display,
    color: theme.text.primary,
    fontSize: 31,
    lineHeight: 37,
    textAlign: 'center',
  },
  titleShort: {
    fontSize: 26,
    lineHeight: 31,
  },
  titleAccent: {
    color: theme.accent.primary,
  },
  subtitle: {
    ...typography.body,
    color: theme.text.secondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  subtitleShort: {
    fontSize: 14,
    lineHeight: 20,
  },
  dots: {
    paddingBottom: 10,
    paddingTop: 6,
  },
  actions: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  ctaGlow: {
    borderRadius: radius.md,
    boxShadow: `0 10px 28px ${withAlpha(theme.accent.primary, 0.35)}`,
    width: '100%',
  },
  loginLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  loginText: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  loginAccent: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  footerLine: {
    backgroundColor: theme.border.strong,
    flex: 1,
    height: 1,
  },
  footerText: {
    color: theme.text.muted,
    fontFamily: fonts.semibold,
    fontSize: 8.5,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.7,
  },
}));
