import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { clamp, type SceneProps } from '@/src/components/hero/stage';
import { BenefitCard } from '@/src/components/visual/BenefitCard';
import { EvolutionRing } from '@/src/components/visual/EvolutionRing';
import { GlassChip } from '@/src/components/visual/GlassChip';
import { OutlineWord } from '@/src/components/visual/OutlineWord';
import { heroPeopleImage, heroPeopleRatio } from '@/src/constants/images';
import { makeStyles } from '@/src/theme';

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

// Cena 1: duas pessoas treinando, painéis de benefícios, "EVOLUA" vazado e o anel de evolução.
// As posições saem da geometria real do palco para nada colidir em telas diferentes.
export function EvolutionScene({ isShort, stage }: SceneProps) {
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
                styles.absolute,
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
        style={[styles.absolute, { bottom: ringSize * 0.16, left: (stage.width - wordWidth) / 2 }]}>
        <OutlineWord width={wordWidth} word="EVOLUA" />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(150).duration(700)}
        style={[
          styles.absolute,
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
          style={[styles.absolute, { left: '55%', top: -ringSize * 0.14 }]}>
          <GlassChip domain="conquista" float icon="flame" label="12 dias seguidos" />
        </Animated.View>
        <Animated.View
          entering={ZoomIn.delay(1220).springify().damping(14)}
          style={[styles.absolute, { right: '58%', top: ringSize * 0.4 }]}>
          <GlassChip domain="treino" float floatDelay={600} icon="trending-up" label="+18% de força" />
        </Animated.View>
        {isShort ? null : (
          <Animated.View
            entering={ZoomIn.delay(1340).springify().damping(14)}
            style={[styles.absolute, { bottom: -ringSize * 0.04, left: '58%' }]}>
            <GlassChip domain="sono" float floatDelay={1200} icon="moon" label="7h40 de sono" />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  fill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  absolute: {
    position: 'absolute',
  },
  ringRow: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
}));
