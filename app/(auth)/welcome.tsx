import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Pressable, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { Button } from '@/src/components/ui/Button';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { BenefitCard } from '@/src/components/visual/BenefitCard';
import { EvolutionRing } from '@/src/components/visual/EvolutionRing';
import { GlassChip } from '@/src/components/visual/GlassChip';
import { OutlineWord } from '@/src/components/visual/OutlineWord';
import { heroPeopleImage, heroPeopleRatio } from '@/src/constants/images';
import { fonts, makeStyles, radius, typography, withAlpha } from '@/src/theme';

// Valores ilustrativos do painel de exemplo. Nada de números de usuários inventados.
const exampleRings = [
  { domain: 'treino' as const, value: 0.78 },
  { domain: 'sono' as const, value: 0.64 },
  { domain: 'agua' as const, value: 0.52 },
];

type Benefit = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
};

// Painéis de vidro atrás das pessoas, em duas colunas (o de cima aparece primeiro).
const benefitColumns: Record<'left' | 'right', Benefit[]> = {
  left: [
    { icon: 'run-fast', label: 'Mais\ndisposição' },
    { icon: 'chart-bar', label: 'Evolução\nreal' },
  ],
  right: [
    { icon: 'heart-outline', label: 'Uma vida\nmais saudável' },
    { icon: 'brain', label: 'Mente\nmais forte' },
  ],
};

const CARD_RATIO = 1.1;
const CARD_GAP = 10;

type StageSize = { height: number; width: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function WelcomeScreen() {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const isShort = height <= 700;
  const [stage, setStage] = useState<StageSize | null>(null);

  function handleStageLayout(event: LayoutChangeEvent) {
    const { height: stageHeight, width: stageWidth } = event.nativeEvent.layout;
    setStage((current) =>
      current && current.width === stageWidth && current.height === stageHeight
        ? current
        : { height: stageHeight, width: stageWidth },
    );
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

        <View onLayout={handleStageLayout} style={styles.stage}>
          {stage ? <HeroStage isShort={isShort} stage={stage} /> : null}
        </View>

        <Animated.View entering={FadeIn.delay(800).duration(500)} style={styles.tagline}>
          <Text style={styles.taglineText}>Corpo · Mente · Uma vida melhor</Text>
          <View style={styles.dash} />
        </Animated.View>

        <View style={styles.copy}>
          <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.overline}>
            Treino · Sono · Água · Mente
          </Animated.Text>
          <Animated.Text
            accessibilityRole="header"
            entering={FadeInDown.delay(380).duration(500)}
            maxFontSizeMultiplier={1.4}
            style={[styles.title, isShort ? styles.titleShort : null]}>
            Veja seu corpo <Text style={styles.titleAccent}>evoluir</Text>, dia após dia.
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(460).duration(500)}
            style={[styles.subtitle, isShort ? styles.subtitleShort : null]}>
            Treinos, hábitos e bem-estar em um só lugar, com uma pontuação diária que mostra o quanto
            você avançou.
          </Animated.Text>
        </View>

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

// Palco do hero: painéis de vidro, palavra vazada, pessoas e o anel, em camadas.
// As posições saem da geometria real do palco para nada colidir em telas diferentes.
function HeroStage({ isShort, stage }: { isShort: boolean; stage: StageSize }) {
  const styles = useStyles();
  const ringSize = Math.round(clamp(stage.height * 0.4, 112, 184));
  const peopleBottom = ringSize * 0.46;
  const peopleWidth = Math.min(stage.width * 0.94, (stage.height - peopleBottom) * heroPeopleRatio);
  const peopleHeight = peopleWidth / heroPeopleRatio;
  const peopleTop = stage.height - peopleBottom - peopleHeight;
  const wordWidth = stage.width * 0.94;

  // Os painéis ficam acima dos chips do anel e dentro das zonas livres da foto: à esquerda
  // o cabelo da moça começa mais baixo; à direita o punho erguido do rapaz ocupa o alto.
  const cardWidth = Math.round(clamp(stage.width * 0.25, 84, 108));
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const chipsLimit = stage.height - ringSize * 1.16 - 8;
  const bands = {
    left: Math.min(chipsLimit, peopleTop + peopleHeight * 0.32),
    right: Math.min(chipsLimit, peopleTop + peopleHeight * 0.26),
  };

  function cardsFor(side: 'left' | 'right') {
    if (isShort) return 0;
    if (bands[side] >= cardHeight * 2 + CARD_GAP) return 2;
    return bands[side] >= cardHeight ? 1 : 0;
  }

  // A coluna da direita desce um pouco (como no mockup), sem sair da sua faixa.
  const rightCount = cardsFor('right');
  const rightStagger = clamp(
    bands.right - cardHeight * rightCount - CARD_GAP * Math.max(rightCount - 1, 0),
    0,
    cardHeight * 0.2,
  );

  return (
    <View
      accessibilityLabel="Duas pessoas treinando e um exemplo do painel de evolução: pontuação 78, 12 dias seguidos, mais 18 por cento de força e 7 horas e 40 minutos de sono."
      accessible
      style={styles.fill}>
      {(['left', 'right'] as const).map((side) =>
        benefitColumns[side].slice(0, cardsFor(side)).map((benefit, index) => {
          const Entering = side === 'left' ? FadeInLeft : FadeInRight;
          const offset = side === 'right' ? rightStagger : 0;

          return (
            <Animated.View
              entering={Entering.delay(450 + index * 120 + (side === 'right' ? 60 : 0)).duration(600)}
              key={benefit.label}
              style={[
                styles.benefit,
                side === 'left' ? { left: 10 } : { right: 10 },
                { top: index * (cardHeight + CARD_GAP) + offset },
              ]}>
              <BenefitCard
                floatDelay={index * 400 + (side === 'right' ? 200 : 0)}
                height={cardHeight}
                icon={benefit.icon}
                label={benefit.label}
                side={side}
                width={cardWidth}
              />
            </Animated.View>
          );
        }),
      )}

      <Animated.View
        entering={FadeIn.delay(500).duration(900)}
        style={[styles.word, { bottom: ringSize * 0.16, left: (stage.width - wordWidth) / 2 }]}>
        <OutlineWord width={wordWidth} />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(150).duration(700)}
        style={[
          styles.people,
          {
            bottom: peopleBottom,
            height: peopleHeight,
            left: (stage.width - peopleWidth) / 2,
            width: peopleWidth,
          },
        ]}>
        <Image contentFit="contain" source={heroPeopleImage} style={styles.fill} transition={0} />
      </Animated.View>

      <View style={[styles.ringRow, { height: ringSize }]}>
        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <EvolutionRing
            delay={700}
            label={ringSize < 140 ? 'hoje' : 'evolução hoje'}
            rings={exampleRings}
            score={78}
            size={ringSize}
          />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.delay(1100).springify().damping(14)}
          style={[styles.chip, { left: '55%', top: -ringSize * 0.14 }]}>
          <GlassChip domain="conquista" float icon="flame" label="12 dias seguidos" />
        </Animated.View>
        <Animated.View
          entering={ZoomIn.delay(1220).springify().damping(14)}
          style={[styles.chip, { right: '58%', top: ringSize * 0.4 }]}>
          <GlassChip domain="treino" float floatDelay={600} icon="trending-up" label="+18% de força" />
        </Animated.View>
        {isShort ? null : (
          <Animated.View
            entering={ZoomIn.delay(1340).springify().damping(14)}
            style={[styles.chip, { bottom: -ringSize * 0.04, left: '58%' }]}>
            <GlassChip domain="sono" float floatDelay={1200} icon="moon" label="7h40 de sono" />
          </Animated.View>
        )}
      </View>
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
  stage: {
    flex: 1,
    marginTop: 10,
    minHeight: 200,
  },
  benefit: {
    position: 'absolute',
  },
  word: {
    position: 'absolute',
  },
  people: {
    position: 'absolute',
  },
  ringRow: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  chip: {
    position: 'absolute',
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
    paddingBottom: 18,
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
