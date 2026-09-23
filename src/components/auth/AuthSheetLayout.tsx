import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AuthTopBar } from '@/src/components/auth/AuthTopBar';
import { BenefitRow, type Benefit } from '@/src/components/auth/BenefitRow';
import { clamp } from '@/src/components/hero/stage';
import { AuroraBackground } from '@/src/components/visual/AuroraBackground';
import { loginPeopleImage, loginPeopleRatio } from '@/src/constants/images';
import { fonts, makeStyles, typography, useTheme, withAlpha } from '@/src/theme';

type AuthSheetLayoutProps = {
  benefits?: Benefit[];
  children: ReactNode;
  footerAction: string;
  footerText: string;
  // Espaço entre o cursor do campo em foco e o teclado. Mostra o que vem logo abaixo do
  // campo; no último, o botão de enviar.
  keyboardOffset?: number;
  onFooterPress: () => void;
  subtitle: string;
  // Título em três partes: a do meio fica na cor de destaque.
  title: [string, string, string];
};

const MAX_WIDTH = 520;
const GUTTER = 24;
// Largura do título e do subtítulo (a linha mais larga, "Continue de onde parou.", medida).
// A foto encolhe para o rosto começar depois dela.
const TEXT_WIDTH = 188;
// Na foto, o rosto começa a 32% da largura; antes disso só há cabelo, orelha e o degradê.
const FACE_START = 0.32;
// Em telas largas e baixas (desktop) a foto não passa desta fração da altura da janela.
const PHOTO_MAX_HEIGHT = 0.6;
// O lema da parede ("DISCIPLINA HOJE…") começa a 7% da altura da foto. Ele não pode ficar
// atrás da barra de status.
const MOTTO_TOP = 0.07;
// A folha do formulário cobre a base da foto até o fim das bordas arredondadas.
const SHEET_RADIUS = 32;
// Benefícios só quando cabem sem empurrar o botão de entrar para fora da tela.
const BENEFITS_MIN_HEIGHT = 700;
const ARC_RADIUS = 150;

// Login e cadastro no modelo de image/login-modelo.png: foto e boas-vindas no topo,
// formulário numa folha de bordas arredondadas que sobe por cima da foto. As duas telas
// usam a mesma foto, então trocar entre elas só muda o texto e o formulário.
export function AuthSheetLayout({
  benefits = [],
  children,
  footerAction,
  footerText,
  keyboardOffset = 100,
  onFooterPress,
  subtitle,
  title,
}: AuthSheetLayoutProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const columnWidth = Math.min(width, MAX_WIDTH);
  const photoWidth = clamp(
    Math.min(
      (columnWidth - GUTTER - TEXT_WIDTH) / (1 - FACE_START),
      height * PHOTO_MAX_HEIGHT * loginPeopleRatio,
    ),
    200,
    380,
  );
  const photoHeight = photoWidth / loginPeopleRatio;
  const showBenefits = benefits.length > 0 && height - insets.top - insets.bottom >= BENEFITS_MIN_HEIGHT;

  return (
    <View style={styles.container}>
      <AuroraBackground intensity="subtle" />
      {/* Rola até o campo em foco pela altura real do teclado, que muda sem fechar ao passar
          do e-mail para a senha (o teclado de senha tem a fileira de números). */}
      <KeyboardAwareScrollView
        bottomOffset={keyboardOffset}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* A sobra de altura fica entre o topo e o título: assim o texto e a foto mantêm a
            mesma posição relativa (a do modelo) em qualquer altura. Em telas altas, parte dela
            afasta o rodapé do botão; em telas baixas a folha não cresce, senão corta o topo da foto. */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <LoginPhoto
            fadeRight={width > MAX_WIDTH}
            height={photoHeight}
            minTop={insets.top + 4 - photoHeight * MOTTO_TOP}
            width={photoWidth}
          />

          <AuthTopBar />

          <View style={styles.heading}>
            <Animated.Text
              accessibilityRole="header"
              entering={FadeInDown.delay(80).duration(450)}
              maxFontSizeMultiplier={1.3}
              style={styles.title}>
              {title[0]}
              <Text style={styles.titleAccent}>{title[1]}</Text>
              {title[2]}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(140).duration(450)}
              maxFontSizeMultiplier={1.3}
              style={styles.subtitle}>
              {subtitle}
            </Animated.Text>

            {showBenefits ? (
              <View style={styles.benefits}>
                {benefits.map((benefit, index) => (
                  <Animated.View
                    entering={FadeInLeft.delay(220 + index * 90).duration(450)}
                    key={benefit.title}>
                    <BenefitRow {...benefit} />
                  </Animated.View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(60).duration(500)}
          style={[styles.sheet, showBenefits ? styles.sheetTall : null, { paddingBottom: insets.bottom + 12 }]}>
          <SheetArcs />

          {children}

          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>{footerText}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={onFooterPress}
              style={({ pressed }) => [styles.footerButton, pressed ? styles.pressed : null]}>
              <Text style={styles.footerAction}>{footerAction}</Text>
            </Pressable>
            <View style={styles.footerLine} />
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

type LoginPhotoProps = {
  fadeRight: boolean;
  height: number;
  // A foto nunca sobe acima desta linha.
  minTop: number;
  width: number;
};

// Foto presa à direita e à base do topo, atrás da folha. Se não couber, ela para em `minTop`
// e o que sobra é a base, que a folha já esconde. Entra com um leve recuo de zoom.
function LoginPhoto({ fadeRight, height, minTop, width }: LoginPhotoProps) {
  const styles = useStyles();
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const zoom = useSharedValue(reduceMotion ? 1 : 1.06);

  useEffect(() => {
    zoom.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) });
  }, [zoom]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  return (
    // A moldura vai de `minTop` até a base da folha. O espaçador empurra a foto para baixo
    // quando sobra altura; quando falta, ele some e a foto começa em `minTop`.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.photoFrame, { top: minTop, width }]}>
      <View style={styles.photoSpacer} />
      <Animated.View entering={FadeIn.delay(80).duration(700)} style={{ height, width }}>
        <Animated.View style={[StyleSheet.absoluteFill, zoomStyle]}>
          <Image contentFit="cover" source={loginPeopleImage} style={StyleSheet.absoluteFill} transition={0} />
        </Animated.View>

        {fadeRight ? (
          // Em tela larga (web, tablet) a borda direita da foto fica no meio da tela e precisa sumir.
          <Svg
            height="100%"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
            viewBox="0 0 100 100"
            width="100%">
            <Defs>
              <LinearGradient id="loginPhotoEdge" x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0.72" stopColor={theme.bg.base} stopOpacity={0} />
                <Stop offset="1" stopColor={theme.bg.base} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#loginPhotoEdge)" height="100" width="100" />
          </Svg>
        ) : null}
      </Animated.View>
    </View>
  );
}

// Arcos de luz nos cantos de baixo da folha, como no modelo.
function SheetArcs() {
  const styles = useStyles();
  const { theme } = useTheme();
  const size = ARC_RADIUS * 2;
  const r = ARC_RADIUS - 4;

  return (
    <View style={styles.sheetDecor}>
      {(['left', 'right'] as const).map((side) => (
        <Svg
          height={size}
          key={side}
          style={[styles.arc, side === 'left' ? styles.arcLeft : styles.arcRight]}
          width={size}>
          <Circle
            cx={ARC_RADIUS}
            cy={ARC_RADIUS}
            fill={withAlpha(theme.accent.primary, 0.035)}
            r={r}
            stroke={withAlpha(theme.accent.primary, 0.06)}
            strokeWidth={8}
          />
          <Circle
            cx={ARC_RADIUS}
            cy={ARC_RADIUS}
            fill="none"
            r={r}
            stroke={withAlpha(theme.accent.primary, 0.26)}
            strokeWidth={1.2}
          />
        </Svg>
      ))}
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
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: MAX_WIDTH,
    width: '100%',
  },
  hero: {
    flexGrow: 1,
    gap: 28,
    justifyContent: 'space-between',
    paddingBottom: 36,
    paddingHorizontal: GUTTER,
  },
  photoFrame: {
    bottom: -SHEET_RADIUS,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  },
  photoSpacer: {
    flexGrow: 1,
  },
  heading: {
    gap: 8,
  },
  title: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  titleAccent: {
    color: theme.accent.primary,
  },
  subtitle: {
    ...typography.body,
    color: theme.text.secondary,
  },
  benefits: {
    gap: 12,
    marginTop: 18,
  },
  sheet: {
    backgroundColor: theme.bg.base,
    borderColor: withAlpha(theme.accent.primary, 0.16),
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    borderTopWidth: 1,
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: 28,
  },
  sheetTall: {
    flexGrow: 0.35,
  },
  sheetDecor: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  arc: {
    bottom: -ARC_RADIUS - 70,
    position: 'absolute',
  },
  arcLeft: {
    left: -ARC_RADIUS - 24,
  },
  arcRight: {
    right: -ARC_RADIUS - 24,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18,
  },
  footerLine: {
    backgroundColor: theme.border.strong,
    flex: 1,
    height: 1,
    marginHorizontal: 10,
    maxWidth: 44,
  },
  footerText: {
    color: theme.text.secondary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  footerButton: {
    justifyContent: 'center',
    minHeight: 44,
  },
  footerAction: {
    color: theme.accent.primary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
}));
