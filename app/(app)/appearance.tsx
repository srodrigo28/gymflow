import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Screen } from '@/src/components/ui/Screen';
import {
  fonts,
  makeStyles,
  radius,
  themeNames,
  themes,
  typography,
  useTheme,
  type Theme,
  type ThemeName,
} from '@/src/theme';

const FADE_OUT = 120;
const PREVIEW_SIZE = 92;

export default function AppearanceScreen() {
  const styles = useStyles();
  const { setTheme, theme } = useTheme();
  const opacity = useSharedValue(1);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  function chooseTheme(name: ThemeName) {
    if (name === theme.name) {
      return;
    }

    // Crossfade curto: escurece, troca o tema e volta.
    clearTimeout(switchTimer.current);
    opacity.value = withSequence(withTiming(0.4, { duration: FADE_OUT }), withTiming(1, { duration: 260 }));
    switchTimer.current = setTimeout(() => setTheme(name), FADE_OUT);
  }

  return (
    <Screen>
      <Animated.View style={[styles.flex, contentStyle]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Voltar"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/home'))}
              style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
              <Ionicons color={theme.text.primary} name="arrow-back" size={20} />
            </Pressable>
          </View>

          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Aparência
            </Text>
            <Text style={styles.subtitle}>
              Escolha o tema que deixa você mais à vontade. Dá para trocar quando quiser.
            </Text>
          </View>

          <View accessibilityRole="radiogroup" style={styles.list}>
            {themeNames.map((name) => (
              <ThemeOption
                isSelected={name === theme.name}
                key={name}
                onPress={() => chooseTheme(name)}
                preview={themes[name]}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Screen>
  );
}

function ThemeOption({
  isSelected,
  onPress,
  preview,
}: {
  isSelected: boolean;
  onPress: () => void;
  preview: Theme;
}) {
  const styles = useStyles();
  const { theme } = useTheme();
  const gradientId = `appearance-${preview.name}`;

  return (
    <Pressable
      accessibilityLabel={`Tema ${preview.label}. ${preview.description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        isSelected ? styles.optionSelected : null,
        pressed ? styles.pressed : null,
      ]}>
      <View style={[styles.preview, { backgroundColor: preview.bg.base }]}>
        {/* Tamanho fixo: no Android, 100% dentro de um container com padding mede só a área interna. */}
        <Svg
          height={PREVIEW_SIZE}
          preserveAspectRatio="none"
          style={styles.previewGlow}
          viewBox="0 0 100 100"
          width={PREVIEW_SIZE}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor={preview.gradient.aurora[0]} stopOpacity={0.5} />
              <Stop offset="0.5" stopColor={preview.gradient.aurora[1]} stopOpacity={0.2} />
              <Stop offset="1" stopColor={preview.gradient.aurora[2]} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect fill={`url(#${gradientId})`} height="100" width="100" />
        </Svg>
        <View style={[styles.previewCard, { backgroundColor: preview.bg.surface, borderColor: preview.border.subtle }]}>
          <View style={[styles.previewLine, { backgroundColor: preview.text.primary, width: '62%' }]} />
          <View style={[styles.previewLine, { backgroundColor: preview.text.muted, width: '82%' }]} />
          <View style={[styles.previewButton, { backgroundColor: preview.accent.primary }]} />
        </View>
      </View>

      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{preview.label}</Text>
        <Text style={styles.optionDescription}>{preview.description}</Text>
      </View>

      <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
        {isSelected ? <Ionicons color={theme.accent.onPrimary} name="checkmark" size={16} /> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  flex: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: 24,
    maxWidth: 560,
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heading: {
    gap: 6,
  },
  title: {
    ...typography.h1,
    color: theme.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: theme.text.secondary,
  },
  list: {
    gap: 12,
  },
  option: {
    alignItems: 'center',
    backgroundColor: theme.bg.surface,
    borderColor: theme.border.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 12,
  },
  optionSelected: {
    backgroundColor: theme.accent.soft,
    borderColor: theme.accent.primary,
  },
  preview: {
    borderRadius: radius.md,
    height: PREVIEW_SIZE,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: 10,
    width: PREVIEW_SIZE,
  },
  previewGlow: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  previewCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 7,
  },
  previewLine: {
    borderRadius: radius.pill,
    height: 4,
  },
  previewButton: {
    borderRadius: radius.pill,
    height: 10,
    marginTop: 2,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    color: theme.text.primary,
    fontFamily: fonts.extrabold,
    fontSize: 17,
  },
  optionDescription: {
    color: theme.text.secondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    alignItems: 'center',
    borderColor: theme.border.strong,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  radioSelected: {
    backgroundColor: theme.accent.primary,
    borderColor: theme.accent.primary,
  },
  pressed: {
    opacity: 0.8,
  },
}));
