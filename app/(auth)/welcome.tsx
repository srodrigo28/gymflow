import { router } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/src/components/auth/BrandHeader';
import { Button } from '@/src/components/ui/Button';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { EvolutionRing } from '@/src/components/visual/EvolutionRing';
import { GlassChip } from '@/src/components/visual/GlassChip';
import { fonts, makeStyles, typography } from '@/src/theme';

// Valores ilustrativos do painel de exemplo. Nada de números de usuários inventados.
const exampleRings = [
  { domain: 'treino' as const, value: 0.78 },
  { domain: 'sono' as const, value: 0.64 },
  { domain: 'agua' as const, value: 0.52 },
];

export default function WelcomeScreen() {
  const styles = useStyles();
  const { height, width } = useWindowDimensions();
  const isShort = height <= 700;
  const ringSize = Math.round(Math.min(Math.max(height * 0.27, 150), 236, width * 0.58));
  const stageWidth = Math.min(width - 48, 380);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.aurora}>
        <AuroraBackground intensity="hero" />
      </Animated.View>

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.header}>
          <BrandHeader />
        </Animated.View>

        <View style={styles.visual}>
          <View
            accessibilityLabel="Exemplo do painel de evolução: pontuação 78, 12 dias seguidos, mais 18 por cento de força e 7 horas e 40 minutos de sono."
            accessible
            style={[styles.stage, { height: ringSize + 48, width: stageWidth }]}>
            <EvolutionRing delay={300} label="evolução hoje" rings={exampleRings} score={78} size={ringSize} />

            <Animated.View entering={ZoomIn.delay(900).springify().damping(14)} style={styles.chipTopRight}>
              <GlassChip domain="conquista" float icon="flame" label="12 dias seguidos" />
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(1020).springify().damping(14)} style={styles.chipLeft}>
              <GlassChip domain="treino" float floatDelay={600} icon="trending-up" label="+18% de força" />
            </Animated.View>
            {isShort ? null : (
              <Animated.View entering={ZoomIn.delay(1140).springify().damping(14)} style={styles.chipBottomRight}>
                <GlassChip domain="sono" float floatDelay={1200} icon="moon" label="7h40 de sono" />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.copy}>
          <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.overline}>
            Treino · Sono · Água · Mente
          </Animated.Text>
          <Animated.Text
            accessibilityRole="header"
            entering={FadeInDown.delay(230).duration(500)}
            maxFontSizeMultiplier={1.4}
            style={[styles.title, isShort ? styles.titleShort : null]}>
            Veja seu corpo <Text style={styles.titleAccent}>evoluir</Text>, dia após dia.
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(310).duration(500)} style={styles.subtitle}>
            Treinos, hábitos e bem-estar em um só lugar, com uma pontuação diária que mostra o quanto
            você avançou.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(1000).duration(400)} style={styles.actions}>
          <Button
            haptic
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => router.push('/(auth)/sign-up')}
            title="Começar minha evolução"
          />
          <Pressable
            accessibilityLabel="Já tenho conta. Entrar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.loginLink, pressed ? styles.pressed : null]}>
            <Text style={styles.loginText}>
              Já tenho conta · <Text style={styles.loginAccent}>Entrar</Text>
            </Text>
          </Pressable>
          <Text style={styles.trust}>Grátis para começar</Text>
        </Animated.View>
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
  aurora: {
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
    paddingHorizontal: 24,
    width: '100%',
  },
  header: {
    paddingTop: 12,
  },
  visual: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 190,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTopRight: {
    position: 'absolute',
    right: 0,
    top: 6,
  },
  chipLeft: {
    left: 0,
    position: 'absolute',
    top: '64%',
  },
  chipBottomRight: {
    bottom: -6,
    position: 'absolute',
    right: 0,
  },
  copy: {
    gap: 10,
    paddingBottom: 24,
  },
  overline: {
    ...typography.overline,
    color: theme.accent.primary,
  },
  title: {
    ...typography.display,
    color: theme.text.primary,
  },
  titleShort: {
    fontSize: 30,
    lineHeight: 36,
  },
  titleAccent: {
    color: theme.accent.primary,
  },
  subtitle: {
    ...typography.body,
    color: theme.text.secondary,
  },
  actions: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
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
  },
  trust: {
    ...typography.caption,
    color: theme.text.muted,
  },
  pressed: {
    opacity: 0.7,
  },
}));
